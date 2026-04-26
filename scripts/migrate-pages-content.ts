/**
 * One-shot миграция: переносит хардкод-контент `/about` (`aboutContent.ts` +
 * `partnersContent.ts`) в Firestore-документ `pages/about`. После миграции
 * `useAboutPageContent` начнёт читать из Firestore вместо fallback-констант.
 *
 * Документ имеет форму AboutPageDocument:
 *   { version, lastModified, tabs: AboutTab[], partners: Partner[] }
 *
 * Запуск:
 *   npx tsx scripts/migrate-pages-content.ts           # dry-run
 *   npx tsx scripts/migrate-pages-content.ts --apply   # применить
 */
import { FieldValue } from 'firebase-admin/firestore';
import { initAdmin } from './_adminInit';
import { ABOUT_TABS } from '../src/pages/about/aboutContent';
import { PARTNERS } from '../src/pages/about/partnersContent';

async function main() {
  const apply = process.argv.includes('--apply');
  const { db } = initAdmin();

  const ref = db.collection('pages').doc('about');
  const snap = await ref.get();
  const existed = snap.exists;

  console.log(`[pages/about] Документ ${existed ? 'уже существует' : 'будет создан'}.`);
  console.log(`[pages/about] Вкладок: ${ABOUT_TABS.length}, партнёров: ${PARTNERS.length}.`);

  if (!apply) {
    console.log('\n⚠️  DRY-RUN. Для записи запусти с --apply.');
    return;
  }

  await ref.set(
    {
      version: 1,
      lastModified: new Date().toISOString(),
      tabs: ABOUT_TABS,
      partners: PARTNERS,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  console.log(
    `✅ ${existed ? 'Обновлён' : 'Создан'} документ pages/about (${ABOUT_TABS.length} tabs, ${PARTNERS.length} partners).`
  );
}

main().catch((err) => {
  console.error('[migrate-pages-content] Ошибка:', err);
  process.exit(1);
});
