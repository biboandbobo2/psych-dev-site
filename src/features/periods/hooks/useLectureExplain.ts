import { useCallback, useState } from 'react';
import { debugError } from '../../../lib/debug';
import { fetchLectureAnswer } from '../../lectureSearch/lib/fetchLectureAnswer';
import type { LectureCitation } from '../../lectureSearch/hooks/useLectureAnswer';
import { useAuthStore } from '../../../stores/useAuthStore';

// Вопрос уходит в /api/lectures с лимитом 500 символов — режем фрагмент с запасом под шаблон
const EXPLAIN_FRAGMENT_MAX_CHARS = 400;

export interface LectureExplainState {
  status: 'idle' | 'loading' | 'success' | 'error';
  fragment: string | null;
  answer: string | null;
  citations: LectureCitation[];
  error: string | null;
}

const INITIAL_STATE: LectureExplainState = {
  status: 'idle',
  fragment: null,
  answer: null,
  citations: [],
  error: null,
};

/**
 * «Объясни этот кусок» для конспект-режима: вопрос к лекционному AI,
 * ограниченный текущей лекцией (lectureKey) или курсом, если ключа нет.
 */
export function useLectureExplain(courseId: string, lectureKey: string | null) {
  const user = useAuthStore((s) => s.user);
  const geminiApiKey = useAuthStore((s) => s.geminiApiKey);
  const [state, setState] = useState<LectureExplainState>(INITIAL_STATE);

  const explain = useCallback(
    async (selectionText: string) => {
      const fragment = selectionText.trim().slice(0, EXPLAIN_FRAGMENT_MAX_CHARS);
      if (!fragment) return;

      if (!user) {
        setState({
          ...INITIAL_STATE,
          fragment,
          status: 'error',
          error: 'Войдите в аккаунт, чтобы пользоваться ИИ по лекциям',
        });
        return;
      }

      setState({ ...INITIAL_STATE, fragment, status: 'loading' });
      try {
        const result = await fetchLectureAnswer({
          query: `Объясни простыми словами этот фрагмент лекции: «${fragment}»`,
          courseId,
          lectureKeys: lectureKey ? [lectureKey] : [],
          geminiApiKey,
        });
        setState({
          status: 'success',
          fragment,
          answer: result.answer,
          citations: result.citations,
          error: null,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Не удалось получить объяснение';
        setState({ ...INITIAL_STATE, fragment, status: 'error', error: message });
        debugError('[useLectureExplain] error', error);
      }
    },
    [courseId, geminiApiKey, lectureKey, user],
  );

  const clear = useCallback(() => setState(INITIAL_STATE), []);

  return { state, explain, clear };
}
