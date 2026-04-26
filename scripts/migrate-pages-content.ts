/**
 * One-shot миграция: переносит хардкод-контент в Firestore.
 *  - `pages/about`            ← `aboutContent.ts` + `partnersContent.ts`
 *  - `projectPages/dom-academy-overview` ← хардкод-fallback из useProjectPageContent.
 *
 * После миграции хуки `useAboutPageContent` и `useProjectPageContent`
 * начинают читать из Firestore. Хардкод-данные остаются как fallback.
 *
 * Запуск:
 *   npx tsx scripts/migrate-pages-content.ts           # dry-run
 *   npx tsx scripts/migrate-pages-content.ts --apply   # применить
 */
import { FieldValue } from 'firebase-admin/firestore';
import { initAdmin } from './_adminInit';
import { ABOUT_TABS } from '../src/pages/about/aboutContent';
import { PARTNERS } from '../src/pages/about/partnersContent';
import { getProjectFallback } from '../src/hooks/useProjectPageContent';

const PROJECT_SLUGS_TO_MIGRATE = ['dom-academy-overview'];

async function migrateAbout(db: FirebaseFirestore.Firestore, apply: boolean) {
  const ref = db.collection('pages').doc('about');
  const snap = await ref.get();
  const existed = snap.exists;

  console.log(`[pages/about] Документ ${existed ? 'уже существует' : 'будет создан'}.`);
  console.log(`[pages/about] Вкладок: ${ABOUT_TABS.length}, партнёров: ${PARTNERS.length}.`);

  if (!apply) return;

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
    `✅ ${existed ? 'Обновлён' : 'Создан'} pages/about (${ABOUT_TABS.length} tabs, ${PARTNERS.length} partners).`
  );
}

async function migrateProject(db: FirebaseFirestore.Firestore, slug: string, apply: boolean) {
  const data = getProjectFallback(slug);
  if (!data) {
    console.warn(`[projectPages/${slug}] Нет fallback-данных, пропускаем.`);
    return;
  }
  const ref = db.collection('projectPages').doc(slug);
  const snap = await ref.get();
  const existed = snap.exists;

  console.log(`[projectPages/${slug}] Документ ${existed ? 'уже существует' : 'будет создан'}.`);

  if (!apply) return;

  await ref.set(
    {
      ...data,
      lastModified: new Date().toISOString(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  console.log(`✅ ${existed ? 'Обновлён' : 'Создан'} projectPages/${slug}.`);
}

async function main() {
  const apply = process.argv.includes('--apply');
  const { db } = initAdmin();

  await migrateAbout(db, apply);
  for (const slug of PROJECT_SLUGS_TO_MIGRATE) {
    await migrateProject(db, slug, apply);
  }

  if (!apply) {
    console.log('\n⚠️  DRY-RUN. Для записи запусти с --apply.');
  }
}

main().catch((err) => {
  console.error('[migrate-pages-content] Ошибка:', err);
  process.exit(1);
});
