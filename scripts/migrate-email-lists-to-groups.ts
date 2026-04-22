/**
 * One-shot миграция: создаёт группу из каждого именованного списка email
 * в коллекции `studentEmailLists` (этим пользовался super-admin для массового
 * открытия курсов до появления полноценных групп).
 *
 * Для каждого списка:
 *  1. Создаётся/обновляется документ `groups/<slug>` с именем списка.
 *     ID — slug от имени + короткий суффикс, чтобы быть детерминированным
 *     и не плодить дубли при повторных запусках.
 *  2. Email резолвятся в uid:
 *     - если юзер есть в Auth — берётся его uid;
 *     - если нет — используется `pending_<base64(email)>` (тот же формат,
 *       что и у bulkEnrollStudents/onUserCreate). Когда юзер зарегистрируется,
 *       замена pendingUid → realUid в memberIds произойдёт в onUserCreate
 *       (см. 3b.6).
 *  3. memberIds группы дополняются новыми uid (union).
 *
 * grantedCourses и announcementAdminIds НЕ заполняются: чтобы случайно не
 * выдать курсы. Настройте их руками в /admin/groups после миграции.
 *
 * Запуск:
 *   npx tsx scripts/migrate-email-lists-to-groups.ts           # dry-run
 *   npx tsx scripts/migrate-email-lists-to-groups.ts --apply   # применить
 */
import { FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { initAdmin } from './_adminInit';

const EMAIL_LISTS_COLLECTION = 'studentEmailLists';

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-zа-я0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return base || 'group';
}

function pendingUidFromEmail(email: string): string {
  return `pending_${Buffer.from(email).toString('base64url')}`;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const { db } = initAdmin();
  const auth = getAuth();

  const listsSnap = await db.collection(EMAIL_LISTS_COLLECTION).get();
  if (listsSnap.empty) {
    console.log('[migrate-email-lists] Коллекция studentEmailLists пуста. Миграция не нужна.');
    return;
  }

  console.log(`[migrate-email-lists] Найдено списков: ${listsSnap.size}`);

  for (const listDoc of listsSnap.docs) {
    const data = listDoc.data();
    const name = typeof data.name === 'string' ? data.name.trim() : '';
    const rawEmails = Array.isArray(data.emails)
      ? data.emails.filter((x: unknown): x is string => typeof x === 'string')
      : [];
    const emails = Array.from(
      new Set(rawEmails.map((e) => e.trim().toLowerCase()).filter(Boolean))
    );

    if (!name || emails.length === 0) {
      console.log(`  [skip] список ${listDoc.id}: пустое имя или emails`);
      continue;
    }

    // Детерминированный ID группы: slug + короткий суффикс (первые 8 символов listDoc.id)
    const groupId = `${slugify(name)}-${listDoc.id.slice(0, 8)}`;
    console.log(`\n[list ${listDoc.id}] «${name}» → группа ${groupId} (${emails.length} email)`);

    // Резолвим email → uid
    const uids: string[] = [];
    for (const email of emails) {
      try {
        const authUser = await auth.getUserByEmail(email);
        uids.push(authUser.uid);
        console.log(`  [auth   ] ${email} → ${authUser.uid}`);
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code;
        if (code === 'auth/user-not-found') {
          const pendingUid = pendingUidFromEmail(email);
          uids.push(pendingUid);
          console.log(`  [pending] ${email} → ${pendingUid}`);
        } else {
          console.warn(`  [error  ] ${email}: ${(err as Error).message}`);
        }
      }
    }

    if (apply) {
      const groupRef = db.collection('groups').doc(groupId);
      const snap = await groupRef.get();
      if (snap.exists) {
        const current = (snap.data()?.memberIds as string[] | undefined) ?? [];
        const merged = Array.from(new Set([...current, ...uids]));
        await groupRef.update({
          memberIds: merged,
          updatedAt: FieldValue.serverTimestamp(),
        });
        console.log(`  [update ] memberIds: ${current.length} → ${merged.length}`);
      } else {
        await groupRef.set({
          name,
          description: `Импортировано из списка email «${name}» (${listDoc.id})`,
          memberIds: uids,
          grantedCourses: [],
          announcementAdminIds: [],
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        console.log(`  [create ] ${groupId}, memberIds: ${uids.length}`);
      }
    }
  }

  console.log(
    apply ? '\n✅ Применено.' : '\n⚠️  DRY-RUN. --apply для записи в Firestore.'
  );
}

main().catch((err) => {
  console.error('[migrate-email-lists] Ошибка:', err);
  process.exit(1);
});
