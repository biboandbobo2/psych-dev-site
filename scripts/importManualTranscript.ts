import { readFileSync } from 'node:fs';
import { Timestamp } from 'firebase-admin/firestore';
import { initAdmin } from './_adminInit';
import { collectTranscriptTargets } from './lib/videoTranscriptTargets';
import {
  buildSegmentsFromMerge,
  parseFwV3File,
  parseMergeFile,
} from './lib/manualTranscriptConverter';
import { realignMergeAnchors } from './lib/realignMergeAnchors';
import { buildTranscriptAvailablePayload } from '../shared/videoTranscripts/persistence';
import {
  VIDEO_TRANSCRIPTS_COLLECTION,
  type VideoTranscriptDocShape,
} from '../shared/videoTranscripts/schema';
import { upsertTranscriptSearchIndex } from '../shared/videoTranscripts/searchPersistence';
import type {
  TranscriptImportResult,
  TranscriptImportTarget,
} from '../shared/videoTranscripts/importTypes';

interface CliArgs {
  video: string;
  merge: string;
  fwv3: string;
  dryRun: boolean;
  force: boolean;
  realign: boolean;
}

const VALUE_KEYS = new Set(['video', 'merge', 'fwv3']);

function parseArgs(argv: string[]): CliArgs {
  // realign включён по умолчанию — он только улучшает точность anchor'ов.
  const args: Partial<CliArgs> = { dryRun: false, force: false, realign: true };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;

    // Поддерживаем оба синтаксиса: `--video=ID` и `--video ID`. Раньше
    // работал только пробельный, что приводило к молчаливым ошибкам
    // (как в importVideoTranscripts.ts до фикса).
    const normalized = token.slice(2);
    const eqIdx = normalized.indexOf('=');
    let key: string;
    let value: string | undefined;
    if (eqIdx !== -1) {
      key = normalized.slice(0, eqIdx);
      value = normalized.slice(eqIdx + 1);
    } else {
      key = normalized;
      const next = argv[i + 1];
      if (VALUE_KEYS.has(key) && next !== undefined && !next.startsWith('--')) {
        value = next;
        i += 1;
      }
    }

    if (key === 'video' && value) args.video = value;
    else if (key === 'merge' && value) args.merge = value;
    else if (key === 'fwv3' && value) args.fwv3 = value;
    else if (key === 'dry-run') args.dryRun = true;
    else if (key === 'force') args.force = true;
    else if (key === 'no-realign') args.realign = false;
  }
  if (!args.video || !args.merge || !args.fwv3) {
    throw new Error(
      'Usage: tsx scripts/importManualTranscript.ts --video <youtubeId> --merge <mergePath> --fwv3 <fwv3Path> [--dry-run] [--force]\n' +
        'Оба синтаксиса работают: `--video ID` и `--video=ID`.'
    );
  }
  return args as CliArgs;
}

async function resolveTarget(
  db: FirebaseFirestore.Firestore,
  youtubeVideoId: string
): Promise<TranscriptImportTarget> {
  const targets = await collectTranscriptTargets(db);
  const target = targets.find((candidate) => candidate.youtubeVideoId === youtubeVideoId);
  if (!target) {
    throw new Error(
      `Не нашёл reference для videoId=${youtubeVideoId} ни в одной коллекции контента (general-topics/periods/clinical-topics/courses). Проверь, что URL видео указан у соответствующей лекции.`
    );
  }
  return target;
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const admin = initAdmin();
  const { bucket, db, projectId, storageBucket } = admin;

  console.log('📝 Импорт manual-транскрипта');
  console.log(`Project: ${projectId ?? 'unknown'}`);
  console.log(`Storage bucket: ${storageBucket ?? 'unknown'}`);
  console.log(`Video: ${args.video}`);
  console.log(`Merge: ${args.merge}`);
  console.log(`Fw-v3: ${args.fwv3}`);
  console.log(`Mode: ${args.dryRun ? 'dry-run' : 'write'}${args.force ? ', force' : ''}`);

  if (!args.dryRun && !bucket) {
    throw new Error('Storage bucket не настроен. Укажите FIREBASE_STORAGE_BUCKET.');
  }

  const target = await resolveTarget(db, args.video);
  console.log(
    `Target references: ${target.references.length} (course=${target.references[0]?.courseId}, period=${target.references[0]?.lessonId})`
  );

  const mergeContent = readFileSync(args.merge, 'utf8');
  const fwContent = readFileSync(args.fwv3, 'utf8');
  let paragraphs = parseMergeFile(mergeContent);
  const fwLines = parseFwV3File(fwContent);
  console.log(`Parsed: paragraphs=${paragraphs.length}, fw-v3 lines=${fwLines.length}`);

  // Post-merge alignment: subagent выдаёт anchor'ы с погрешностью ±5-20 сек
  // (он "визуально" подбирает ближайшую fw-v3 строку). Здесь идём по каждому
  // абзацу, берём первые ~10 значимых токенов и находим точный fw-v3 timestamp
  // через token-overlap. Это приводит точность к шагу fw-v3 (~1-3 сек).
  if (args.realign) {
    const realigned = realignMergeAnchors(paragraphs, fwLines);
    const d = realigned.diagnostics;
    console.log(
      `Realign: updated=${d.updatedCount}/${d.paragraphCount}, ` +
        `skipped(short=${d.skippedShort}, lowOverlap=${d.skippedLowOverlap}), ` +
        `shifts avg=${d.shiftStats.avgAbsSec.toFixed(1)}s, ` +
        `p95=${d.shiftStats.p95AbsSec.toFixed(1)}s, ` +
        `max=${d.shiftStats.maxAbsSec.toFixed(1)}s`
    );
    paragraphs = realigned.paragraphs;
  } else {
    console.log('Realign: пропущен (--no-realign)');
  }

  // Sanity-check: merge не должен выходить за длительность fw-v3.
  // Поймали такой случай 2026-05-12 — субагент при chunking лекции сдвинул
  // таймкоды финального чанка на +6 минут вперёд. Без проверки кривые
  // данные молча уехали бы в Storage, и transcript-panel показывал бы
  // ссылки на несуществующие моменты видео.
  const lastMergeSec = paragraphs.length > 0
    ? Math.max(...paragraphs.map((p) => p.anchorSec))
    : 0;
  const lastFwSec = fwLines.length > 0
    ? fwLines[fwLines.length - 1].startSec
    : 0;
  const ALLOWED_OVERSHOOT_SEC = 30;
  if (lastMergeSec > lastFwSec + ALLOWED_OVERSHOOT_SEC) {
    throw new Error(
      `Merge выходит за длительность fw-v3: последний [MM:SS] = ${Math.floor(lastMergeSec / 60)}:${String(Math.floor(lastMergeSec % 60)).padStart(2, '0')}, ` +
        `а fw-v3 кончается в ${Math.floor(lastFwSec / 60)}:${String(Math.floor(lastFwSec % 60)).padStart(2, '0')} ` +
        `(превышение ${Math.round(lastMergeSec - lastFwSec)} сек). ` +
        `Скорее всего merge-subagent сдвинул таймкоды — переделай чанк и не заливай это.`
    );
  }

  const segments = buildSegmentsFromMerge(paragraphs, fwLines);
  console.log(`Segments built: ${segments.length}`);
  if (!segments.length) {
    throw new Error('Конвертер вернул 0 сегментов — проверь форматы файлов.');
  }

  const transcript: TranscriptImportResult = {
    availableLanguages: ['ru'],
    language: 'ru',
    segments,
  };

  const docRef = db.collection(VIDEO_TRANSCRIPTS_COLLECTION).doc(args.video);
  const existingSnapshot = await docRef.get();
  const existingData = existingSnapshot.data() as
    | Partial<VideoTranscriptDocShape<FirebaseFirestore.Timestamp>>
    | undefined;

  if (!args.force && existingData?.source === 'manual' && existingData?.status === 'available') {
    console.log(
      '⏭ skipped: manual transcript уже выложен. Используйте --force для перезаписи.'
    );
    return;
  }

  const now = Timestamp.now();
  const payload = buildTranscriptAvailablePayload(target, transcript, now, {
    source: 'manual',
  });

  if (args.dryRun) {
    console.log('--- dry-run ---');
    console.log(`Storage path: ${payload.storagePath}`);
    console.log(`Storage payload size: ${JSON.stringify(payload.storagePayload).length} chars`);
    console.log(`Doc payload status: ${payload.docPayload.status}, source: ${payload.docPayload.source}`);
    console.log(`Sample segment[0]: ${segments[0].text.slice(0, 100)}...`);
    return;
  }

  if (!bucket) {
    throw new Error('Storage bucket недоступен');
  }

  console.log(`Uploading payload to ${payload.storagePath}...`);
  await bucket.file(payload.storagePath).save(
    JSON.stringify(payload.storagePayload, null, 2),
    { contentType: 'application/json; charset=utf-8', resumable: false }
  );

  console.log('Rebuilding search index...');
  await upsertTranscriptSearchIndex(db, target, transcript, now);

  console.log('Writing Firestore doc...');
  await docRef.set(payload.docPayload, { merge: true });

  console.log('✅ Готово');
}

run().catch((error) => {
  console.error('❌ Импорт manual-транскрипта завершился с ошибкой');
  console.error(error);
  process.exit(1);
});
