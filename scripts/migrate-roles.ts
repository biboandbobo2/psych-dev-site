/**
 * One-shot миграция ролей пользователей.
 *
 * Что делает:
 *  1. Удаляет legacy-значения поля `role` ('guest' | 'student') — они больше
 *     не хранятся, гость/студент вычисляются из courseAccess.
 *  2. Для существующих `role === 'admin'` инициализирует
 *     `adminEditableCourses = <все courseId в Firestore + CORE>`,
 *     чтобы сохранить текущие полномочия.
 *  3. super-admin оставляет как есть (adminEditableCourses не нужен).
 *
 * Запуск (один раз):
 *   npx tsx scripts/migrate-roles.ts          # dry-run, только отчёт
 *   npx tsx scripts/migrate-roles.ts --apply  # реально пишет в Firestore
 */
import { FieldValue } from 'firebase-admin/firestore';
import { initAdmin } from './_adminInit';

const CORE_COURSE_IDS = ['development', 'clinical', 'general'];

async function main() {
  const apply = process.argv.includes('--apply');
  const { db } = initAdmin();

  // Список courseId для инициализации admin'ам
  const coursesSnap = await db.collection('courses').get();
  const dynamicIds = coursesSnap.docs.map((d) => d.id);
  const allCourseIds = Array.from(new Set([...CORE_COURSE_IDS, ...dynamicIds]));
  console.log(`[migrate-roles] Пул курсов для инициализации admin.editableCourses: ${allCourseIds.length} — ${allCourseIds.join(', ')}`);

  const usersSnap = await db.collection('users').get();
  console.log(`[migrate-roles] Пользователей в Firestore: ${usersSnap.size}`);

  let clearedLegacy = 0;
  let initializedAdmins = 0;
  let untouched = 0;
  let superAdmins = 0;

  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    const role = data.role;
    const uid = userDoc.id;
    const email = data.email ?? '<no-email>';
    const updates: Record<string, unknown> = {};

    if (role === 'super-admin') {
      superAdmins++;
      console.log(`[super-admin] ${uid} (${email}) — без изменений`);
      continue;
    }

    if (role === 'admin') {
      if (!Array.isArray(data.adminEditableCourses) || data.adminEditableCourses.length === 0) {
        updates.adminEditableCourses = allCourseIds;
        initializedAdmins++;
        console.log(`[admin] ${uid} (${email}) — инициализация adminEditableCourses = [${allCourseIds.length} курсов]`);
      } else {
        console.log(`[admin] ${uid} (${email}) — adminEditableCourses уже задан (${data.adminEditableCourses.length}), пропуск`);
        untouched++;
      }
    } else if (role === 'guest' || role === 'student') {
      updates.role = FieldValue.delete();
      clearedLegacy++;
      console.log(`[legacy] ${uid} (${email}) — удаляем role='${role}'`);
    } else {
      untouched++;
      continue;
    }

    if (Object.keys(updates).length === 0) continue;

    if (apply) {
      await userDoc.ref.update(updates);
    }
  }

  console.log('\n[migrate-roles] Итого:');
  console.log(`  super-admin: ${superAdmins}`);
  console.log(`  admin (инициализированы): ${initializedAdmins}`);
  console.log(`  legacy role удалён: ${clearedLegacy}`);
  console.log(`  без изменений: ${untouched}`);
  console.log(apply ? '\n✅ Применено.' : '\n⚠️  DRY-RUN. Запустите с --apply для записи в Firestore.');
}

main().catch((err) => {
  console.error('[migrate-roles] Ошибка:', err);
  process.exit(1);
});
