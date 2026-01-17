import { useState, useCallback } from 'react';
import { doc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../stores/useAuthStore';
import { reportAppError } from '../lib/errorHandler';
import { debugLog, debugError } from '../lib/debug';

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

      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Gemini-Api-Key': key,
        },
        body: JSON.stringify({
          message: 'test',
          locale: 'ru',
          history: [],
        }),
      });

      if (response.status === 401) {
        const data = await response.json().catch(() => ({}));
        return { valid: false, error: data.error || 'Неверный API ключ' };
      }

      if (!response.ok) {
        return { valid: false, error: `Ошибка сервера: ${response.status}` };
      }

      debugLog('[useGeminiKey] Key validated successfully');
      return { valid: true };
    } catch (err) {
      debugError('[useGeminiKey] Validation error:', err);
      return { valid: false, error: 'Ошибка проверки ключа. Проверьте подключение к интернету.' };
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

    const trimmedKey = key.trim();
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
