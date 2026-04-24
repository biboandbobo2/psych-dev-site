/**
 * One-shot миграция: создаёт системную broadcast-группу `groups/everyone`
 * (если её ещё нет) и добивает в её memberIds uid всех существующих
 * зарегистрированных пользователей.
 *
 * Новые пользователи будут автоматически попадать в эту группу через
 * Cloud Function `onUserCreate`.
 *
 * Запуск:
 *   npx tsx scripts/ensure-everyone-group.ts           # dry-run
 *   npx tsx scripts/ensure-everyone-group.ts --apply   # применить
 */
import { FieldValue } from 'firebase-admin/firestore';
import { initAdmin } from './_adminInit';
import {
  EVERYONE_GROUP_ID,
  EVERYONE_GROUP_NAME,
} from '../shared/groups/everyoneGroup';

async function main() {
  const apply = process.argv.includes('--apply');
  const { db } = initAdmin();

  const ref = db.collection('groups').doc(EVERYONE_GROUP_ID);
  const snap = await ref.get();
  const existed = snap.exists;

  // Собираем uid всех реальных пользователей (исключаем pending_*).
  const usersSnap = await db.collection('users').get();
  const memberIds: string[] = [];
  for (const userDoc of usersSnap.docs) {
    if (userDoc.id.startsWith('pending_')) continue;
    memberIds.push(userDoc.id);
  }

  console.log(`[everyone] Документ ${existed ? 'уже существует' : 'будет создан'}`);
  console.log(`[everyone] Реальных пользователей: ${memberIds.length}`);

  if (!apply) {
    console.log('\n⚠️  DRY-RUN. Для записи запусти с --apply.');
    return;
  }

  if (!existed) {
    await ref.set({
      name: EVERYONE_GROUP_NAME,
      description: 'Системная группа. Рассылка объявлений всем пользователям.',
      memberIds,
      grantedCourses: [],
      announcementAdminIds: [],
      isSystem: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log(`✅ Создана группа «${EVERYONE_GROUP_NAME}» с ${memberIds.length} участниками.`);
  } else {
    const existing = Array.isArray(snap.data()?.memberIds)
      ? (snap.data()!.memberIds as string[])
      : [];
    const merged = Array.from(new Set([...existing, ...memberIds]));
    await ref.update({
      // Гарантируем критические поля даже если документ создан вручную раньше.
      isSystem: true,
      name: EVERYONE_GROUP_NAME,
      memberIds: merged,
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log(
      `✅ Обновлена группа «${EVERYONE_GROUP_NAME}»: ${existing.length} → ${merged.length} участников.`
    );
  }
}

main().catch((err) => {
  console.error('[ensure-everyone-group] Ошибка:', err);
  process.exit(1);
});
