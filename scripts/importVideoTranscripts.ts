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
import { parseTranscriptImportArgs } from './lib/videoTranscriptImportArgs';
import { collectTranscriptTargets } from './lib/videoTranscriptTargets';
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
import type {
  ImportOptions,
  ImportStatus,
  TranscriptImportResult,
  TranscriptImportTarget,
} from './lib/videoTranscriptImportTypes';

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
  admin: ReturnType<typeof initAdmin>,
  target: TranscriptImportTarget,
  options: ImportOptions
) {
  let docRef: FirebaseFirestore.DocumentReference | null = null;
  const { bucket, db } = admin;

  if (!options.dryRun) {
    if (!bucket) {
      throw new Error('Storage bucket не настроен. Укажите FIREBASE_STORAGE_BUCKET или VITE_FIREBASE_STORAGE_BUCKET.');
    }

    docRef = db.collection(VIDEO_TRANSCRIPTS_COLLECTION).doc(target.youtubeVideoId);
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
  const options = parseTranscriptImportArgs(process.argv.slice(2));
  const admin = initAdmin();

  console.log('🎬 Импорт транскриптов YouTube');
  if (!options.dryRun || !options.video) {
    const { projectId, storageBucket } = admin;
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
    : await collectTranscriptTargets(admin.db);

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
    const result = await upsertTranscript(admin, target, options);

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
