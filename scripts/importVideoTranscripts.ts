import { Timestamp } from 'firebase-admin/firestore';
import {
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptInvalidVideoIdError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptNotAvailableLanguageError,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptVideoUnavailableError,
  fetchTranscript,
  type TranscriptResponse,
} from 'youtube-transcript-plus';
import { initAdmin } from './_adminInit';
import {
  buildTranscriptFullText,
  buildTranscriptPreview,
  buildVideoTranscriptStoragePath,
  getTranscriptDurationMs,
  getYouTubeVideoId,
} from '../src/lib/videoTranscripts';
import {
  VIDEO_TRANSCRIPTS_COLLECTION,
  VIDEO_TRANSCRIPT_VERSION,
  type VideoTranscriptSegment,
  type VideoTranscriptStoragePayload,
} from '../src/types/videoTranscripts';

type ImportStatus = 'available' | 'unavailable' | 'failed';

interface ImportOptions {
  dryRun: boolean;
  force: boolean;
  langs: string[];
  limit: number | null;
  video: string | null;
}

interface VideoReference {
  courseId: string;
  lessonId: string;
  sourcePath: string;
  title: string;
  url: string;
}

interface TranscriptImportTarget {
  youtubeVideoId: string;
  references: VideoReference[];
}

interface TranscriptImportResult {
  availableLanguages: string[];
  language: string | null;
  segments: VideoTranscriptSegment[];
}

function parseArgs(argv: string[]): ImportOptions {
  const args = new Map<string, string>();
  const flags = new Set<string>();

  argv.forEach((arg) => {
    if (!arg.startsWith('--')) {
      return;
    }

    const normalized = arg.slice(2);
    const separatorIndex = normalized.indexOf('=');
    if (separatorIndex === -1) {
      flags.add(normalized);
      return;
    }

    args.set(normalized.slice(0, separatorIndex), normalized.slice(separatorIndex + 1));
  });

  const rawLimit = args.get('limit');
  const parsedLimit = rawLimit ? Number.parseInt(rawLimit, 10) : null;

  return {
    dryRun: flags.has('dry-run'),
    force: flags.has('force'),
    langs: (args.get('langs') ?? 'ru,en')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
    limit: Number.isFinite(parsedLimit) ? parsedLimit : null,
    video: args.get('video')?.trim() || null,
  };
}

function getVideoEntries(data: Record<string, any>, fallbackTitle: string) {
  const candidates: Array<{ title: string; url: string }> = [];
  const sections = data.sections ?? {};
  const sectionEntries = sections.video_section?.content ?? sections.video?.content;

  if (Array.isArray(sectionEntries)) {
    sectionEntries.forEach((entry: any) => {
      const url = typeof entry?.url === 'string' ? entry.url.trim() : '';
      if (!url) return;
      candidates.push({
        title: typeof entry?.title === 'string' && entry.title.trim() ? entry.title.trim() : fallbackTitle,
        url,
      });
    });
  }

  if (!candidates.length && typeof data.video_url === 'string' && data.video_url.trim()) {
    candidates.push({
      title: fallbackTitle,
      url: data.video_url.trim(),
    });
  }

  if (!candidates.length && Array.isArray(data.video_playlist)) {
    data.video_playlist.forEach((entry: any) => {
      const url = typeof entry?.url === 'string' ? entry.url.trim() : '';
      if (!url) return;
      candidates.push({
        title: typeof entry?.title === 'string' && entry.title.trim() ? entry.title.trim() : fallbackTitle,
        url,
      });
    });
  }

  return candidates;
}

async function collectTranscriptTargets() {
  const { db } = initAdmin();
  const targets = new Map<string, TranscriptImportTarget>();

  const registerDocVideos = (
    docPath: string,
    courseId: string,
    lessonId: string,
    data: Record<string, any>
  ) => {
    const fallbackTitle =
      (typeof data.title === 'string' && data.title.trim()) ||
      (typeof data.label === 'string' && data.label.trim()) ||
      lessonId;

    getVideoEntries(data, fallbackTitle).forEach((video) => {
      const youtubeVideoId = getYouTubeVideoId(video.url);
      if (!youtubeVideoId) {
        return;
      }

      const current = targets.get(youtubeVideoId) ?? {
        youtubeVideoId,
        references: [],
      };

      current.references.push({
        courseId,
        lessonId,
        sourcePath: docPath,
        title: video.title,
        url: video.url,
      });
      targets.set(youtubeVideoId, current);
    });
  };

  const scanCollection = async (collectionName: string, courseId: string) => {
    const snapshot = await db.collection(collectionName).get();
    snapshot.forEach((docSnap) => {
      registerDocVideos(`${collectionName}/${docSnap.id}`, courseId, docSnap.id, docSnap.data());
    });
  };

  await scanCollection('periods', 'development');
  await scanCollection('clinical-topics', 'clinical');
  await scanCollection('general-topics', 'general');

  const introSingleton = await db.collection('intro').doc('singleton').get();
  if (introSingleton.exists) {
    registerDocVideos('intro/singleton', 'development', 'intro', introSingleton.data() ?? {});
  }

  const coursesSnapshot = await db.collection('courses').get();
  for (const courseSnap of coursesSnapshot.docs) {
    const lessonsSnapshot = await db.collection('courses').doc(courseSnap.id).collection('lessons').get();
    lessonsSnapshot.forEach((lessonSnap) => {
      registerDocVideos(
        `courses/${courseSnap.id}/lessons/${lessonSnap.id}`,
        courseSnap.id,
        lessonSnap.id,
        lessonSnap.data()
      );
    });
  }

  return [...targets.values()].sort((a, b) => a.youtubeVideoId.localeCompare(b.youtubeVideoId));
}

function normalizeSegments(transcript: TranscriptResponse[]): VideoTranscriptSegment[] {
  return transcript.map((segment, index) => {
    const startMs = Math.round(segment.offset * 1000);
    const durationMs = Math.max(0, Math.round(segment.duration * 1000));

    return {
      index,
      startMs,
      endMs: startMs + durationMs,
      durationMs,
      text: segment.text.trim(),
    };
  });
}

function mapErrorCode(error: unknown) {
  if (error instanceof YoutubeTranscriptDisabledError) return 'TRANSCRIPT_DISABLED';
  if (error instanceof YoutubeTranscriptNotAvailableError) return 'TRANSCRIPT_NOT_AVAILABLE';
  if (error instanceof YoutubeTranscriptNotAvailableLanguageError) return 'TRANSCRIPT_LANGUAGE_NOT_AVAILABLE';
  if (error instanceof YoutubeTranscriptVideoUnavailableError) return 'VIDEO_UNAVAILABLE';
  if (error instanceof YoutubeTranscriptTooManyRequestError) return 'YOUTUBE_RATE_LIMITED';
  if (error instanceof YoutubeTranscriptInvalidVideoIdError) return 'INVALID_VIDEO_ID';
  return 'UNKNOWN';
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function isUnavailableError(error: unknown) {
  return (
    error instanceof YoutubeTranscriptDisabledError ||
    error instanceof YoutubeTranscriptNotAvailableError ||
    error instanceof YoutubeTranscriptNotAvailableLanguageError ||
    error instanceof YoutubeTranscriptVideoUnavailableError ||
    error instanceof YoutubeTranscriptInvalidVideoIdError
  );
}

async function fetchTranscriptWithFallbacks(
  youtubeVideoId: string,
  langs: string[]
): Promise<TranscriptImportResult> {
  const availableLanguages = new Set<string>();

  for (const lang of langs) {
    try {
      const transcript = await fetchTranscript(youtubeVideoId, { lang });
      return {
        availableLanguages: [...availableLanguages, lang],
        language: transcript[0]?.lang ?? lang,
        segments: normalizeSegments(transcript),
      };
    } catch (error) {
      if (error instanceof YoutubeTranscriptNotAvailableLanguageError) {
        error.availableLangs.forEach((availableLang) => availableLanguages.add(availableLang));
        continue;
      }
      throw error;
    }
  }

  const transcript = await fetchTranscript(youtubeVideoId);
  const detectedLanguage = transcript[0]?.lang ?? null;
  if (detectedLanguage) {
    availableLanguages.add(detectedLanguage);
  }

  return {
    availableLanguages: [...availableLanguages],
    language: detectedLanguage,
    segments: normalizeSegments(transcript),
  };
}

async function upsertTranscript(
  target: TranscriptImportTarget,
  options: ImportOptions
) {
  let docRef: FirebaseFirestore.DocumentReference | null = null;
  let bucket: ReturnType<typeof initAdmin>['bucket'] | null = null;

  if (!options.dryRun) {
    const admin = initAdmin();
    bucket = admin.bucket;
    docRef = admin.db.collection(VIDEO_TRANSCRIPTS_COLLECTION).doc(target.youtubeVideoId);
    const existingSnapshot = await docRef.get();
    const existingData = existingSnapshot.data() as Record<string, any> | undefined;

    if (!options.force && existingData?.status === 'available') {
      return { status: 'skipped' as const, youtubeVideoId: target.youtubeVideoId };
    }
  }

  const now = Timestamp.now();
  const pendingPayload = {
    youtubeVideoId: target.youtubeVideoId,
    source: 'youtube' as const,
    status: 'pending' as const,
    updatedAt: now,
    lastCheckedAt: now,
  };

  if (!options.dryRun && docRef) {
    await docRef.set(pendingPayload, { merge: true });
  }

  try {
    const transcript = await fetchTranscriptWithFallbacks(target.youtubeVideoId, options.langs);
    const fullText = buildTranscriptFullText(transcript.segments);
    const durationMs = getTranscriptDurationMs(transcript.segments);
    const storagePath = buildVideoTranscriptStoragePath(
      target.youtubeVideoId,
      VIDEO_TRANSCRIPT_VERSION
    );

    const payload: VideoTranscriptStoragePayload = {
      youtubeVideoId: target.youtubeVideoId,
      version: VIDEO_TRANSCRIPT_VERSION,
      source: 'youtube',
      language: transcript.language,
      languageName: null,
      isAutoGenerated: null,
      fetchedAt: new Date().toISOString(),
      durationMs,
      fullText,
      segments: transcript.segments,
    };

    if (!options.dryRun && docRef && bucket) {
      await bucket.file(storagePath).save(JSON.stringify(payload, null, 2), {
        contentType: 'application/json; charset=utf-8',
        resumable: false,
      });

      await docRef.set(
        {
          availableLanguages: transcript.availableLanguages,
          durationMs,
          errorCode: null,
          errorMessage: null,
          fetchedAt: now,
          fullTextPreview: buildTranscriptPreview(fullText),
          isAutoGenerated: null,
          language: transcript.language,
          languageName: null,
          lastCheckedAt: now,
          segmentCount: transcript.segments.length,
          source: 'youtube',
          status: 'available',
          storagePath,
          textLength: fullText.length,
          updatedAt: now,
          version: VIDEO_TRANSCRIPT_VERSION,
          youtubeVideoId: target.youtubeVideoId,
        },
        { merge: true }
      );
    }

    return {
      language: transcript.language,
      segmentCount: transcript.segments.length,
      status: 'available' as const,
      youtubeVideoId: target.youtubeVideoId,
    };
  } catch (error) {
    const status: ImportStatus = isUnavailableError(error) ? 'unavailable' : 'failed';
    const errorCode = mapErrorCode(error);
    const errorMessage = getErrorMessage(error);

    if (!options.dryRun && docRef) {
      await docRef.set(
        {
          availableLanguages:
            error instanceof YoutubeTranscriptNotAvailableLanguageError ? error.availableLangs : [],
          durationMs: null,
          errorCode,
          errorMessage,
          fullTextPreview: null,
          language: null,
          languageName: null,
          lastCheckedAt: now,
          segmentCount: 0,
          source: 'youtube',
          status,
          storagePath: null,
          textLength: 0,
          updatedAt: now,
          version: VIDEO_TRANSCRIPT_VERSION,
          youtubeVideoId: target.youtubeVideoId,
        },
        { merge: true }
      );
    }

    return {
      errorCode,
      errorMessage,
      status,
      youtubeVideoId: target.youtubeVideoId,
    };
  }
}

async function run() {
  const options = parseArgs(process.argv.slice(2));

  console.log('🎬 Импорт транскриптов YouTube');
  if (!options.dryRun || !options.video) {
    const { projectId, storageBucket } = initAdmin();
    console.log(`Project: ${projectId ?? 'unknown'}`);
    console.log(`Storage bucket: ${storageBucket ?? 'unknown'}`);
  }
  console.log(
    `Mode: ${options.dryRun ? 'dry-run' : 'write'}${options.force ? ', force' : ''}, langs=${options.langs.join(',')}`
  );

  const targets = options.video
    ? (() => {
        const youtubeVideoId = getYouTubeVideoId(options.video);
        if (!youtubeVideoId) {
          throw new Error(`Не удалось извлечь YouTube videoId из: ${options.video}`);
        }

        return [
          {
            youtubeVideoId,
            references: [
              {
                courseId: 'manual',
                lessonId: youtubeVideoId,
                sourcePath: 'manual',
                title: youtubeVideoId,
                url: options.video,
              },
            ],
          },
        ] satisfies TranscriptImportTarget[];
      })()
    : await collectTranscriptTargets();

  const limitedTargets = options.limit ? targets.slice(0, options.limit) : targets;
  console.log(`Найдено YouTube видео: ${targets.length}. К обработке: ${limitedTargets.length}`);

  if (options.dryRun) {
    limitedTargets.slice(0, 10).forEach((target) => {
      const firstRef = target.references[0];
      console.log(
        `- ${target.youtubeVideoId} <- ${firstRef?.sourcePath ?? 'manual'} (${firstRef?.title ?? 'manual'})`
      );
    });
    if (limitedTargets.length > 10) {
      console.log(`... и ещё ${limitedTargets.length - 10}`);
    }
  }

  const summary = {
    available: 0,
    failed: 0,
    skipped: 0,
    unavailable: 0,
  };

  for (const [index, target] of limitedTargets.entries()) {
    console.log(`[${index + 1}/${limitedTargets.length}] ${target.youtubeVideoId}`);
    const result = await upsertTranscript(target, options);

    if (result.status === 'available') {
      summary.available += 1;
      console.log(`  ✅ available (${result.segmentCount} segments, lang=${result.language ?? 'unknown'})`);
    } else if (result.status === 'skipped') {
      summary.skipped += 1;
      console.log('  ⏭ skipped (already available)');
    } else if (result.status === 'unavailable') {
      summary.unavailable += 1;
      console.log(`  ∅ unavailable (${result.errorCode})`);
    } else {
      summary.failed += 1;
      console.log(`  ❌ failed (${result.errorCode}): ${result.errorMessage}`);
    }
  }

  console.log('---');
  console.log(`available: ${summary.available}`);
  console.log(`skipped: ${summary.skipped}`);
  console.log(`unavailable: ${summary.unavailable}`);
  console.log(`failed: ${summary.failed}`);
}

run().catch((error) => {
  console.error('❌ Импорт транскриптов завершился с ошибкой');
  console.error(error);
  process.exit(1);
});
