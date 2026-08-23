/**
 * LS-3: разовый бэкфилл nav-индексов courseNavIndex/{courseId} для всех
 * существующих курсов (core + dynamic). Дальше индексы поддерживают админ-хуки
 * (rebuildCourseNavIndex после save/delete/reorder).
 *
 * Запуск: npx tsx scripts/backfillCourseNavIndex.ts [--dry-run]
 * Креды: GOOGLE_APPLICATION_CREDENTIALS или ADC (см. scripts/_adminInit.ts).
 */
import { initAdmin } from './_adminInit';

const COURSE_NAV_INDEX_VERSION = 1;

// Зеркалит CORE_COURSE_META (src/constants/courses.ts) — клиентский модуль
// сюда не импортировать: тянет клиентский firebase-init.
const CORE_COLLECTIONS: Record<string, string> = {
  development: 'periods',
  clinical: 'clinical-topics',
  general: 'general-topics',
};

// Зеркалит LEGACY_PERIOD_IDS из src/lib/firestoreHelpers.ts
const LEGACY_PERIOD_IDS: Record<string, string> = {
  school: 'primary-school',
};

interface NavIndexItem {
  id: string;
  title: string;
  order?: number;
}

type LessonDoc = { id: string; data: () => Record<string, unknown> };

function canonicalLessonId(courseId: string, docId: string, data: Record<string, unknown>): string {
  const stored = typeof data.period === 'string' ? data.period.trim() : '';
  const resolved = stored || docId.trim();
  return courseId === 'development' ? LEGACY_PERIOD_IDS[resolved] ?? resolved : resolved;
}

// Логика mapCanonicalCourseLessons: при дублях предпочитаем док с каноничным id
function buildItems(courseId: string, docs: LessonDoc[]): NavIndexItem[] {
  const byId = new Map<string, { sourceDocId: string; item: NavIndexItem; published: boolean }>();

  for (const docSnap of docs) {
    const data = docSnap.data();
    const id = canonicalLessonId(courseId, docSnap.id, data);
    const current = byId.get(id);
    if (current && current.sourceDocId === id && docSnap.id !== id) continue;

    const title =
      (typeof data.label === 'string' && data.label) ||
      (typeof data.title === 'string' && data.title) ||
      id;
    byId.set(id, {
      sourceDocId: docSnap.id,
      published: data.published !== false,
      item: {
        id,
        title,
        ...(typeof data.order === 'number' ? { order: data.order } : {}),
      },
    });
  }

  return [...byId.values()].filter((entry) => entry.published).map((entry) => entry.item);
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const { db, projectId } = initAdmin();
  console.log(`Project: ${projectId}${dryRun ? ' (dry-run)' : ''}`);

  const targets: Array<{ courseId: string; collectionPath: string }> = Object.entries(
    CORE_COLLECTIONS
  ).map(([courseId, collectionPath]) => ({ courseId, collectionPath }));

  const coursesSnap = await db.collection('courses').get();
  for (const courseDoc of coursesSnap.docs) {
    targets.push({ courseId: courseDoc.id, collectionPath: `courses/${courseDoc.id}/lessons` });
  }

  for (const { courseId, collectionPath } of targets) {
    const snap = await db.collection(collectionPath).get();
    const items = buildItems(courseId, snap.docs as unknown as LessonDoc[]);
    const payload = {
      v: COURSE_NAV_INDEX_VERSION,
      updatedAt: new Date().toISOString(),
      items,
    };
    const bytes = Buffer.byteLength(JSON.stringify(payload), 'utf8');
    console.log(
      `${courseId}: ${snap.size} доков → ${items.length} опубликованных, ~${(bytes / 1024).toFixed(1)} КБ`
    );
    if (!dryRun) {
      await db.collection('courseNavIndex').doc(courseId).set(payload);
    }
  }

  console.log(dryRun ? 'Dry-run завершён, записей не было.' : 'Бэкфилл завершён.');
}

main().catch((error) => {
  console.error('Backfill failed:', error);
  process.exit(1);
});
