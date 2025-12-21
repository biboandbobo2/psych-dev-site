/**
 * Хук для получения RAG-ответа по книгам
 */
import { useState, useCallback } from 'react';
import { debugLog, debugError } from '../../../lib/debug';
import { BOOK_SEARCH_CONFIG } from '../../../constants/books';

export interface Citation {
  chunkId: string;
  bookId: string;
  bookTitle: string;
  pageStart: number;
  pageEnd: number;
  claim: string;
}

export interface BookAnswerState {
  status: 'idle' | 'loading' | 'success' | 'error';
  answer: string | null;
  citations: Citation[];
  error: string | null;
  tookMs: number | null;
}

interface UseBookAnswerReturn {
  query: string;
  setQuery: (q: string) => void;
  selectedBooks: string[];
  setSelectedBooks: (ids: string[]) => void;
  state: BookAnswerState;
  askQuestion: () => Promise<void>;
  clearState: () => void;
  maxLength: number;
  maxBooks: number;
}

export function useBookAnswer(): UseBookAnswerReturn {
  const [query, setQuery] = useState('');
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);
  const [state, setState] = useState<BookAnswerState>({
    status: 'idle',
    answer: null,
    citations: [],
    error: null,
    tookMs: null,
  });

  const askQuestion = useCallback(async () => {
    const trimmed = query.trim();

    if (trimmed.length < BOOK_SEARCH_CONFIG.minQuestionLength) {
      setState({
        status: 'error',
        answer: null,
        citations: [],
        error: `Вопрос должен содержать минимум ${BOOK_SEARCH_CONFIG.minQuestionLength} символа`,
        tookMs: null,
      });
      return;
    }

    if (selectedBooks.length === 0) {
      setState({
        status: 'error',
        answer: null,
        citations: [],
        error: 'Выберите хотя бы одну книгу',
        tookMs: null,
      });
      return;
    }

    setState({
      status: 'loading',
      answer: null,
      citations: [],
      error: null,
      tookMs: null,
    });

    try {
      const res = await fetch('/api/books/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: trimmed,
          bookIds: selectedBooks,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || 'Ошибка получения ответа');
      }

      setState({
        status: 'success',
        answer: data.answer,
        citations: data.citations || [],
        error: null,
        tookMs: data.tookMs,
      });

      debugLog('[useBookAnswer] Answer received, citations:', data.citations?.length);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Не удалось получить ответ';
      setState({
        status: 'error',
        answer: null,
        citations: [],
        error: msg,
        tookMs: null,
      });
      debugError('[useBookAnswer] Error:', e);
    }
  }, [query, selectedBooks]);

  const clearState = useCallback(() => {
    setQuery('');
    setState({
      status: 'idle',
      answer: null,
      citations: [],
      error: null,
      tookMs: null,
    });
  }, []);

  return {
    query,
    setQuery,
    selectedBooks,
    setSelectedBooks,
    state,
    askQuestion,
    clearState,
    maxLength: BOOK_SEARCH_CONFIG.maxQuestionLength,
    maxBooks: BOOK_SEARCH_CONFIG.maxBooksPerSearch,
  };
}
