/**
 * One-shot backfill для индекса transcript search.
 *
 * Что делает:
 *  1. Идёт по collectionGroup('searchChunks') страницами по 400 docs.
 *  2. Для каждого chunk без поля `searchTokens` (или с пустым) вычисляет
 *     buildSearchTokens(normalizedText) и записывает batch update.
 *  3. Идемпотентно: уже мигрированные chunks (searchTokens.length > 0) скипаются.
 *
 * Запуск:
 *   npx tsx scripts/backfillTranscriptSearchTokens.ts          # dry-run, только отчёт
 *   npx tsx scripts/backfillTranscriptSearchTokens.ts --apply  # реально пишет в Firestore
 *
 * Связь с задачей H7/MR-1: после миграции api/transcript-search.ts переходит
 * на where('searchTokens', 'array-contains-any', queryWords), убирая full
 * collectionGroup scan.
 */
import { buildSearchTokens } from '../shared/videoTranscripts/searchIndex.js';
import { initAdmin } from './_adminInit';

const BATCH_SIZE = 400;
const SEARCH_CHUNKS_SUBCOLLECTION = 'searchChunks';

async function main() {
  const apply = process.argv.includes('--apply');
  const { db, projectId } = initAdmin();

  console.log(`[backfill] project=${projectId ?? '<unknown>'} apply=${apply}`);
  console.log('[backfill] начинаю обход collectionGroup(searchChunks)…');

  let processed = 0;
  let updated = 0;
  let skipped = 0;
  let lastDocPath: string | null = null;

  // Cursor-based pagination через __name__
  // (стартовый запрос — без cursor, последующие — startAfter(lastDoc)).
  let cursorRef:
    | FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
    | null = null;

  while (true) {
    let query = db
      .collectionGroup(SEARCH_CHUNKS_SUBCOLLECTION)
      .orderBy('__name__')
      .limit(BATCH_SIZE);
    if (cursorRef) {
      query = query.startAfter(cursorRef);
    }

    const snap = await query.get();
    if (snap.empty) break;

    const batch = db.batch();
    let batched = 0;

    for (const doc of snap.docs) {
      processed += 1;
      const data = doc.data() as { searchTokens?: unknown; normalizedText?: unknown };
      const existing = Array.isArray(data.searchTokens) ? (data.searchTokens as string[]) : null;
      if (existing && existing.length > 0) {
        skipped += 1;
        continue;
      }

      const normalized = typeof data.normalizedText === 'string' ? data.normalizedText : '';
      const tokens = buildSearchTokens(normalized);

      if (apply) {
        batch.update(doc.ref, { searchTokens: tokens });
      }
      batched += 1;
      updated += 1;
    }

    if (apply && batched > 0) {
      await batch.commit();
    }

    cursorRef = snap.docs[snap.docs.length - 1] ?? null;
    lastDocPath = cursorRef?.ref.path ?? lastDocPath;
    console.log(
      `[backfill] processed=${processed} updated=${updated} skipped=${skipped} ` +
        `lastDoc=${lastDocPath}`,
    );

    if (snap.size < BATCH_SIZE) break;
  }

  console.log('[backfill] готово.');
  console.log(`[backfill] итого: processed=${processed} updated=${updated} skipped=${skipped}`);
  if (!apply) {
    console.log('[backfill] это dry-run. Перезапусти с --apply, чтобы реально записать.');
  }
}

main().catch((err) => {
  console.error('[backfill] ошибка:', err);
  process.exit(1);
});
