import { useState, useCallback } from 'react';
import { doc, updateDoc, deleteField } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuthStore } from '../stores/useAuthStore';
import { reportAppError } from '../lib/errorHandler';
import { debugLog, debugError } from '../lib/debug';
import { buildGeminiApiKeyHeader, sanitizeGeminiApiKey } from '../lib/geminiKey';

export type GeminiKeyStatus = 'idle' | 'validating' | 'saving' | 'success' | 'error';

interface UseGeminiKeyReturn {
  /** Текущий API ключ из store (или null) */
  currentKey: string | null;
  /** Статус операции */
  status: GeminiKeyStatus;
  /** Сообщение об ошибке (если есть) */
  error: string | null;
  /** Валидировать и сохранить ключ */
  saveKey: (key: string) => Promise<boolean>;
  /** Удалить ключ */
  removeKey: () => Promise<boolean>;
  /** Есть ли собственный ключ */
  hasKey: boolean;
}

/**
 * Хук для управления пользовательским API ключом Gemini (BYOK)
 */
export function useGeminiKey(): UseGeminiKeyReturn {
  const user = useAuthStore((s) => s.user);
  const currentKey = useAuthStore((s) => s.geminiApiKey);

  const [status, setStatus] = useState<GeminiKeyStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  /**
   * Валидирует ключ через тестовый запрос к API
   */
  const validateKey = useCallback(async (key: string): Promise<{ valid: boolean; error?: string }> => {
    try {
      debugLog('[useGeminiKey] Validating key...');

      const idToken = await auth.currentUser?.getIdToken(true);
      if (!idToken) {
        return { valid: false, error: 'Войдите в аккаунт, чтобы добавить ключ [код: NO_ID_TOKEN]' };
      }

      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
          ...buildGeminiApiKeyHeader(key),
        },
        body: JSON.stringify({
          message: 'test',
          locale: 'ru',
          history: [],
        }),
      });

      if (!response.ok) {
        const data: { error?: string; code?: string } = await response
          .json()
          .catch(() => ({}));
        const code = data.code ?? `HTTP_${response.status}`;
        const serverMessage = data.error ?? `Ошибка сервера ${response.status}`;

        const hintByCode: Record<string, string> = {
          UNAUTHORIZED:
            'Сессия истекла или не обновляется. Жёстко обновите страницу (Ctrl+Shift+R), либо выйдите и войдите заново. Если не помогло — попробуйте Chrome/Edge и проверьте, что часы на компьютере правильные.',
          INVALID_API_KEY:
            'Ключ Google не принят. Проверьте, что ключ скопирован полностью, без пробелов, начинается с AIzaSy.',
          BYOK_REQUIRED:
            'Сервер не получил ключ. Попробуйте ещё раз — если повторяется, расширение/блокировщик мог вырезать заголовок.',
          RATE_LIMITED:
            'Сработал защитный лимит частоты запросов. Подождите 5 минут и попробуйте снова.',
          DAILY_QUOTA_EXCEEDED:
            'Сработал дневной лимит на ваш IP. Попробуйте завтра либо смените сеть (мобильный интернет вместо Wi-Fi).',
          SERVICE_NOT_CONFIGURED:
            'На сервере не настроены ключи. Это баг сайта — напишите в поддержку.',
          GEMINI_ERROR:
            'Сервер дошёл до Google, но получил ошибку. Если повторяется — напишите в поддержку.',
        };
        const hint = hintByCode[code] ?? 'Если повторяется — напишите в поддержку.';

        return {
          valid: false,
          error: `${serverMessage}. ${hint} [код: ${code}]`,
        };
      }

      debugLog('[useGeminiKey] Key validated successfully');
      return { valid: true };
    } catch (err) {
      debugError('[useGeminiKey] Validation error:', err);
      const detail = err instanceof Error ? err.message : String(err);
      return {
        valid: false,
        error: `Не удалось связаться с сервером. Проверьте интернет. [детали: ${detail}]`,
      };
    }
  }, []);

  /**
   * Сохраняет ключ в Firestore после валидации
   */
  const saveKey = useCallback(async (key: string): Promise<boolean> => {
    if (!user) {
      setError('Необходимо войти в систему');
      setStatus('error');
      return false;
    }

    const trimmedKey = sanitizeGeminiApiKey(key) ?? '';
    if (!trimmedKey) {
      setError('Ключ не может быть пустым');
      setStatus('error');
      return false;
    }

    // Базовая валидация формата (Gemini ключи начинаются с AIzaSy)
    if (!trimmedKey.startsWith('AIzaSy')) {
      setError('Неверный формат ключа. Ключ должен начинаться с AIzaSy');
      setStatus('error');
      return false;
    }

    try {
      // 1. Валидируем ключ
      setStatus('validating');
      setError(null);

      const validation = await validateKey(trimmedKey);
      if (!validation.valid) {
        setError(validation.error || 'Неверный API ключ');
        setStatus('error');
        return false;
      }

      // 2. Сохраняем в Firestore
      setStatus('saving');
      debugLog('[useGeminiKey] Saving key to Firestore...');

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        geminiApiKey: trimmedKey,
      });

      debugLog('[useGeminiKey] Key saved successfully');
      setStatus('success');
      setError(null);

      // Сброс статуса через 2 секунды
      setTimeout(() => setStatus('idle'), 2000);

      return true;
    } catch (err) {
      reportAppError({
        message: 'Не удалось сохранить API ключ',
        error: err,
        context: 'useGeminiKey.saveKey',
      });
      setError('Не удалось сохранить ключ. Попробуйте позже.');
      setStatus('error');
      return false;
    }
  }, [user, validateKey]);

  /**
   * Удаляет ключ из Firestore
   */
  const removeKey = useCallback(async (): Promise<boolean> => {
    if (!user) {
      setError('Необходимо войти в систему');
      setStatus('error');
      return false;
    }

    try {
      setStatus('saving');
      setError(null);
      debugLog('[useGeminiKey] Removing key from Firestore...');

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        geminiApiKey: deleteField(),
      });

      debugLog('[useGeminiKey] Key removed successfully');
      setStatus('success');
      setError(null);

      // Сброс статуса через 2 секунды
      setTimeout(() => setStatus('idle'), 2000);

      return true;
    } catch (err) {
      reportAppError({
        message: 'Не удалось удалить API ключ',
        error: err,
        context: 'useGeminiKey.removeKey',
      });
      setError('Не удалось удалить ключ. Попробуйте позже.');
      setStatus('error');
      return false;
    }
  }, [user]);

  return {
    currentKey,
    status,
    error,
    saveKey,
    removeKey,
    hasKey: !!currentKey,
  };
}
