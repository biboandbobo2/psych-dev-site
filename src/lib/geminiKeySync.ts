import { deleteField, doc, onSnapshot, setDoc, updateDoc, type Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { reportAppError } from './errorHandler';
import { sanitizeGeminiApiKey } from './geminiKey';

/**
 * Нужно ли переносить legacy-ключ Gemini из корневого `users/{uid}` в приватный
 * `users/{uid}/private/settings`. Переносим один раз и только когда приватный
 * документ уже прочитан и пуст — иначе затрём свежий ключ старым.
 */
export function shouldMigrateLegacyGeminiKey(params: {
  legacyKey: string | null;
  privateSnapshotSeen: boolean;
  privateKey: string | null;
}): boolean {
  return !!params.legacyKey && params.privateSnapshotSeen && !params.privateKey;
}

export interface GeminiKeySync {
  /** Значение `geminiApiKey` из корневого документа — только для миграции. */
  setLegacyKey: (raw: unknown) => void;
  stop: () => void;
}

/**
 * Подписка на BYOK-ключ в `users/{uid}/private/settings` — документ, который
 * не читает никто, кроме владельца. Заодно разово переносит туда legacy-ключ
 * из корневого документа (его видят супер-админ и со-админ).
 */
export function startGeminiKeySync(
  uid: string,
  onKey: (key: string | null) => void
): GeminiKeySync {
  let legacyKey: string | null = null;
  let privateSnapshotSeen = false;
  let privateKey: string | null = null;
  let migrationStarted = false;

  const migrateIfNeeded = () => {
    if (migrationStarted) return;
    if (!shouldMigrateLegacyGeminiKey({ legacyKey, privateSnapshotSeen, privateKey })) return;
    migrationStarted = true;
    const key = legacyKey;
    void (async () => {
      try {
        await setDoc(
          doc(db, 'users', uid, 'private', 'settings'),
          { geminiApiKey: key },
          { merge: true }
        );
        await updateDoc(doc(db, 'users', uid), { geminiApiKey: deleteField() });
      } catch (error) {
        reportAppError({
          message: 'Не удалось перенести API ключ в приватные настройки',
          error,
          context: 'geminiKeySync.migrate',
        });
      }
    })();
  };

  const unsubscribe: Unsubscribe = onSnapshot(
    doc(db, 'users', uid, 'private', 'settings'),
    (snap) => {
      privateSnapshotSeen = true;
      privateKey = sanitizeGeminiApiKey(snap.data()?.geminiApiKey) ?? null;
      onKey(privateKey);
      migrateIfNeeded();
    },
    (error) => {
      reportAppError({
        message: 'Ошибка подписки на приватные настройки',
        error,
        context: 'geminiKeySync.subscribe',
      });
    }
  );

  return {
    setLegacyKey: (raw) => {
      legacyKey = sanitizeGeminiApiKey(raw as string | null | undefined) ?? null;
      migrateIfNeeded();
    },
    stop: unsubscribe,
  };
}
