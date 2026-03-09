import { initAdmin } from './_adminInit';
import { parseTranscriptImportArgs } from './lib/videoTranscriptImportArgs';
import type { ImportOptions } from './lib/videoTranscriptImportTypes';
import { buildManualTranscriptTarget, collectTranscriptTargets } from './lib/videoTranscriptTargets';
import { upsertTranscript } from '../shared/videoTranscripts/runner';

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
    const result = await upsertTranscript(admin, target, {
      dryRun: options.dryRun,
      force: options.force,
      langs: options.langs,
    });

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
