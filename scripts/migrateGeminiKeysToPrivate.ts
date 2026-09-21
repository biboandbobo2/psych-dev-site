/**
 * One-shot миграция: переносит BYOK-ключ Gemini из корневого документа
 * `users/{uid}.geminiApiKey` в приватный `users/{uid}/private/settings`.
 *
 * Зачем: корневой документ читают супер-админ и со-админ, приватный
 * поддокумент — только владелец. Ключ пользователя не должен быть виден
 * никому, включая владельца платформы.
 *
 * Что делает:
 *  1. Находит всех `users/*` с непустым полем `geminiApiKey`.
 *  2. Если в `private/settings` ключа ещё нет — записывает его туда (merge).
 *     Если там уже свой ключ — не трогает, корневой считается устаревшим.
 *  3. Удаляет поле `geminiApiKey` из корневого документа.
 *
 * Клиент мигрирует ключ сам при входе (useAuthStore); скрипт добирает
 * остаток — тех, кто давно не заходил.
 *
 * Запуск:
 *   npx tsx scripts/migrateGeminiKeysToPrivate.ts           # dry-run
 *   npx tsx scripts/migrateGeminiKeysToPrivate.ts --apply   # применить
 *
 * Доступ — ADC (`gcloud auth application-default login`).
 */
import { FieldValue } from 'firebase-admin/firestore';
import { initAdmin } from './_adminInit';

const TAG = '[migrate-gemini-keys]';

async function main() {
  const apply = process.argv.includes('--apply');
  const { db, projectId } = initAdmin();

  console.log(`${TAG} проект: ${projectId ?? '(не определён)'} | режим: ${apply ? 'APPLY' : 'DRY-RUN'}`);

  const usersSnap = await db.collection('users').get();

  let moved = 0;
  let alreadyPrivate = 0;

  for (const userDoc of usersSnap.docs) {
    const rawKey = userDoc.data().geminiApiKey;
    if (typeof rawKey !== 'string' || !rawKey.trim()) continue;

    const privateRef = userDoc.ref.collection('private').doc('settings');
    const privateSnap = await privateRef.get();
    const privateKey = privateSnap.data()?.geminiApiKey;
    const hasPrivateKey = typeof privateKey === 'string' && !!privateKey.trim();

    if (hasPrivateKey) {
      alreadyPrivate += 1;
      console.log(`${TAG} ${userDoc.id}: в private уже есть ключ — корневой только удаляем`);
    } else {
      moved += 1;
      console.log(`${TAG} ${userDoc.id}: ключ переносится в private/settings`);
    }

    if (!apply) continue;

    if (!hasPrivateKey) {
      await privateRef.set({ geminiApiKey: rawKey.trim() }, { merge: true });
    }
    await userDoc.ref.update({ geminiApiKey: FieldValue.delete() });
  }

  console.log(`\n${TAG} Итого:`);
  console.log(`  Перенесено в private/settings: ${moved}`);
  console.log(`  Уже было в private (корневой удалён): ${alreadyPrivate}`);
  console.log(`  Всего затронуто документов: ${moved + alreadyPrivate}`);
  console.log(apply ? '\n✅ Применено.' : '\n⚠️  DRY-RUN. --apply для записи.');
}

main().catch((err) => {
  console.error(`${TAG} Ошибка:`, err);
  process.exit(1);
});
