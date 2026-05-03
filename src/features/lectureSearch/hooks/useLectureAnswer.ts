import { useCallback, useState } from 'react';
import { debugError, debugLog } from '../../../lib/debug';
import { buildAuthorizedHeaders } from '../../../lib/apiAuth';
import { buildGeminiApiKeyHeader, sanitizeGeminiApiKey } from '../../../lib/geminiKey';
import { useAuthStore } from '../../../stores/useAuthStore';
import {
  LECTURE_AI_MAX_QUESTION_LENGTH,
  LECTURE_AI_MIN_QUESTION_LENGTH,
} from '../config';

export interface LectureCitation {
  chunkId: string;
  lectureKey: string;
  lectureTitle: string;
  courseId: string;
  periodId: string;
  periodTitle: string;
  youtubeVideoId: string;
  startMs: number;
  timestampLabel: string;
  excerpt: string;
  claim: string;
  path: string;
}

export interface LectureAnswerState {
  status: 'idle' | 'loading' | 'success' | 'error';
  answer: string | null;
  citations: LectureCitation[];
  error: string | null;
  tookMs: number | null;
}

interface UseLectureAnswerReturn {
  query: string;
  setQuery: (value: string) => void;
  selectedCourseId: string;
  setSelectedCourseId: (courseId: string) => void;
  useWholeCourse: boolean;
  setUseWholeCourse: (value: boolean) => void;
  selectedLectureKeys: string[];
  setSelectedLectureKeys: (lectureKeys: string[]) => void;
  state: LectureAnswerState;
  askQuestion: () => Promise<void>;
  clearState: () => void;
  maxLength: number;
}

const INITIAL_STATE: LectureAnswerState = {
  status: 'idle',
  answer: null,
  citations: [],
  error: null,
  tookMs: null,
};

export function useLectureAnswer(): UseLectureAnswerReturn {
  const user = useAuthStore((state) => state.user);
  const authLoading = useAuthStore((state) => state.loading);
  const geminiApiKey = useAuthStore((state) => state.geminiApiKey);
  const [query, setQuery] = useState('');
  const [selectedCourseId, setSelectedCourseIdState] = useState('');
  const [useWholeCourse, setUseWholeCourseState] = useState(true);
  const [selectedLectureKeys, setSelectedLectureKeysState] = useState<string[]>([]);
  const [state, setState] = useState<LectureAnswerState>(INITIAL_STATE);

  const setSelectedCourseId = useCallback((courseId: string) => {
    setSelectedCourseIdState(courseId);
    setUseWholeCourseState(true);
    setSelectedLectureKeysState([]);
  }, []);

  const setUseWholeCourse = useCallback((value: boolean) => {
    setUseWholeCourseState(value);
    if (value) {
      setSelectedLectureKeysState([]);
    }
  }, []);

  const setSelectedLectureKeys = useCallback((lectureKeys: string[]) => {
    setSelectedLectureKeysState(lectureKeys);
    if (lectureKeys.length > 0) {
      setUseWholeCourseState(false);
    }
  }, []);

  const askQuestion = useCallback(async () => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < LECTURE_AI_MIN_QUESTION_LENGTH) {
      setState({
        ...INITIAL_STATE,
        status: 'error',
        error: `Вопрос должен содержать минимум ${LECTURE_AI_MIN_QUESTION_LENGTH} символа`,
      });
      return;
    }

    if (!selectedCourseId) {
      setState({
        ...INITIAL_STATE,
        status: 'error',
        error: 'Выберите курс с доступными транскриптами',
      });
      return;
    }

    if (authLoading) {
      setState({
        ...INITIAL_STATE,
        status: 'error',
        error: 'Проверяем авторизацию. Попробуйте ещё раз через секунду.',
      });
      return;
    }

    if (!user) {
      setState({
        ...INITIAL_STATE,
        status: 'error',
        error: 'Нужно войти в аккаунт, чтобы пользоваться ИИ по лекциям',
      });
      return;
    }

    if (!useWholeCourse && selectedLectureKeys.length === 0) {
      setState({
        ...INITIAL_STATE,
        status: 'error',
        error: 'Выберите хотя бы одну лекцию или переключитесь на весь курс',
      });
      return;
    }

    setState({
      ...INITIAL_STATE,
      status: 'loading',
    });

    try {
      const geminiApiKeyOverride = sanitizeGeminiApiKey(geminiApiKey);
      const headers = await buildAuthorizedHeaders({
        'Content-Type': 'application/json',
        ...buildGeminiApiKeyHeader(geminiApiKeyOverride),
      });
      const res = await fetch('/api/lectures', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'answer',
          query: trimmedQuery,
          courseId: selectedCourseId,
          lectureKeys: useWholeCourse ? [] : selectedLectureKeys,
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.error || 'Не удалось получить ответ по лекциям');
      }

      setState({
        status: 'success',
        answer: data.answer || '',
        citations: data.citations || [],
        error: null,
        tookMs: data.tookMs ?? null,
      });

      debugLog('[useLectureAnswer] Answer received, citations:', data.citations?.length ?? 0);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось получить ответ по лекциям';
      setState({
        ...INITIAL_STATE,
        status: 'error',
        error: message,
      });
      debugError('[useLectureAnswer] Error:', error);
    }
  }, [authLoading, geminiApiKey, query, selectedCourseId, selectedLectureKeys, useWholeCourse, user]);

  const clearState = useCallback(() => {
    setQuery('');
    setState(INITIAL_STATE);
  }, []);

  return {
    query,
    setQuery,
    selectedCourseId,
    setSelectedCourseId,
    useWholeCourse,
    setUseWholeCourse,
    selectedLectureKeys,
    setSelectedLectureKeys,
    state,
    askQuestion,
    clearState,
    maxLength: LECTURE_AI_MAX_QUESTION_LENGTH,
  };
}
