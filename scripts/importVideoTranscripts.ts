import { Timestamp } from 'firebase-admin/firestore';
import { initAdmin } from './_adminInit';
import { parseTranscriptImportArgs } from './lib/videoTranscriptImportArgs';
import { VIDEO_TRANSCRIPTS_COLLECTION } from '../src/types/videoTranscripts';
import type {
  ImportOptions,
  ImportStatus,
  TranscriptImportTarget,
} from './lib/videoTranscriptImportTypes';
import { buildManualTranscriptTarget, collectTranscriptTargets } from './lib/videoTranscriptTargets';
import {
  buildTranscriptAvailablePayload,
  buildTranscriptFailedDoc,
  buildTranscriptPendingDoc,
} from './lib/videoTranscriptPersistence';
import {
  fetchTranscriptWithFallbacks,
  getAvailableLanguagesFromError,
  getTranscriptErrorMessage,
  mapTranscriptErrorCode,
  resolveTranscriptFailureStatus,
} from './lib/youtubeTranscriptFetcher';

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
  const pendingPayload = buildTranscriptPendingDoc(target.youtubeVideoId, now);

  if (!options.dryRun && docRef) {
    await docRef.set(pendingPayload, { merge: true });
  }

  try {
    const transcript = await fetchTranscriptWithFallbacks(target.youtubeVideoId, options.langs);
    const availablePayload = buildTranscriptAvailablePayload(target, transcript, now);

    if (!options.dryRun && docRef && bucket) {
      await bucket.file(availablePayload.storagePath).save(JSON.stringify(availablePayload.storagePayload, null, 2), {
        contentType: 'application/json; charset=utf-8',
        resumable: false,
      });

      await docRef.set(availablePayload.docPayload, { merge: true });
    }

    return {
      language: transcript.language,
      segmentCount: transcript.segments.length,
      status: 'available' as const,
      youtubeVideoId: target.youtubeVideoId,
    };
  } catch (error) {
    const status: ImportStatus = resolveTranscriptFailureStatus(error);
    const errorCode = mapTranscriptErrorCode(error);
    const errorMessage = getTranscriptErrorMessage(error);

    if (!options.dryRun && docRef) {
      await docRef.set(
        buildTranscriptFailedDoc(
          target.youtubeVideoId,
          status,
          errorCode,
          errorMessage,
          getAvailableLanguagesFromError(error),
          now
        ),
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
    ? [buildManualTranscriptTarget(options.video)]
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
