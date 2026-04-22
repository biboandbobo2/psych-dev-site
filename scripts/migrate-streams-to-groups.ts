/**
 * One-shot миграция: переводит legacy-поле `users.studentStream`
 * ('first'|'second') в новую модель групп.
 *
 * Что делает:
 *  1. Находит/создаёт две группы «Поток 1» (stream-first) и «Поток 2» (stream-second).
 *     Использует фиксированные ID, чтобы повторный запуск не плодил дубли.
 *  2. Добавляет в memberIds соответствующей группы всех, у кого
 *     studentStream='first'/'second'.
 *  3. Удаляет поле studentStream у этих пользователей.
 *  4. users без studentStream или с studentStream='none' — не трогает.
 *
 * grantedCourses у этих групп ставятся пустыми: раньше поле studentStream
 * курсы не раздавало, и мы не хотим случайно выдать сейчас.
 *
 * Запуск (один раз, после деплоя rules+функций+миграции ролей):
 *   npx tsx scripts/migrate-streams-to-groups.ts           # dry-run
 *   npx tsx scripts/migrate-streams-to-groups.ts --apply   # применить
 */
import { FieldValue } from 'firebase-admin/firestore';
import { initAdmin } from './_adminInit';

const FIRST_GROUP_ID = 'stream-first';
const SECOND_GROUP_ID = 'stream-second';

async function ensureGroup(
  db: ReturnType<typeof initAdmin>['db'],
  id: string,
  name: string,
  apply: boolean
) {
  const ref = db.collection('groups').doc(id);
  const snap = await ref.get();
  if (snap.exists) {
    console.log(`[group] ${id} уже существует — используем`);
    return ref;
  }
  console.log(`[group] ${id} будет создан с именем «${name}»`);
  if (apply) {
    await ref.set({
      name,
      memberIds: [],
      grantedCourses: [],
      announcementAdminIds: [],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  return ref;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const { db } = initAdmin();

  const firstRef = await ensureGroup(db, FIRST_GROUP_ID, 'Поток 1', apply);
  const secondRef = await ensureGroup(db, SECOND_GROUP_ID, 'Поток 2', apply);

  const usersSnap = await db.collection('users').get();

  const firstMembers: string[] = [];
  const secondMembers: string[] = [];
  let touched = 0;

  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    const stream = data.studentStream;
    if (stream !== 'first' && stream !== 'second') continue;

    const uid = userDoc.id;
    const email = data.email ?? '<no-email>';
    if (stream === 'first') {
      firstMembers.push(uid);
      console.log(`[first ] ${uid} (${email})`);
    } else {
      secondMembers.push(uid);
      console.log(`[second] ${uid} (${email})`);
    }
    touched++;

    if (apply) {
      await userDoc.ref.update({ studentStream: FieldValue.delete() });
    }
  }

  if (apply) {
    if (firstMembers.length > 0) {
      const existing = (await firstRef.get()).data()?.memberIds ?? [];
      const merged = Array.from(new Set([...existing, ...firstMembers]));
      await firstRef.update({
        memberIds: merged,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    if (secondMembers.length > 0) {
      const existing = (await secondRef.get()).data()?.memberIds ?? [];
      const merged = Array.from(new Set([...existing, ...secondMembers]));
      await secondRef.update({
        memberIds: merged,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }

  console.log('\n[migrate-streams] Итого:');
  console.log(`  В «Поток 1»: ${firstMembers.length}`);
  console.log(`  В «Поток 2»: ${secondMembers.length}`);
  console.log(`  Поле studentStream удалено у: ${touched}`);
  console.log(apply ? '\n✅ Применено.' : '\n⚠️  DRY-RUN. --apply для записи.');
}

main().catch((err) => {
  console.error('[migrate-streams] Ошибка:', err);
  process.exit(1);
});
