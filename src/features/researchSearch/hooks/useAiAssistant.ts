import { useState, useCallback } from 'react';

export interface AiAssistantState {
  status: 'idle' | 'loading' | 'success' | 'error';
  answer: string | null;
  refused: boolean;
  error: string | null;
  tookMs: number | null;
}

interface AiAssistantResponse {
  ok: true;
  answer: string;
  refused?: boolean;
  meta?: { tookMs: number };
}

interface AiAssistantErrorResponse {
  ok: false;
  error: string;
}

const MAX_MESSAGE_LENGTH = 200;

export function useAiAssistant() {
  const [question, setQuestion] = useState('');
  const [state, setState] = useState<AiAssistantState>({
    status: 'idle',
    answer: null,
    refused: false,
    error: null,
    tookMs: null,
  });

  const askQuestion = useCallback(async () => {
    const trimmed = question.trim();
    if (!trimmed || trimmed.length > MAX_MESSAGE_LENGTH) {
      return;
    }

    setState({
      status: 'loading',
      answer: null,
      refused: false,
      error: null,
      tookMs: null,
    });

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, locale: 'ru' }),
      });

      const data: AiAssistantResponse | AiAssistantErrorResponse = await response.json();

      if (!data.ok) {
        setState({
          status: 'error',
          answer: null,
          refused: false,
          error: (data as AiAssistantErrorResponse).error || 'Неизвестная ошибка',
          tookMs: null,
        });
        return;
      }

      const successData = data as AiAssistantResponse;
      setState({
        status: 'success',
        answer: successData.answer,
        refused: successData.refused ?? false,
        error: null,
        tookMs: successData.meta?.tookMs ?? null,
      });
    } catch (err) {
      setState({
        status: 'error',
        answer: null,
        refused: false,
        error: 'Не удалось связаться с сервером',
        tookMs: null,
      });
    }
  }, [question]);

  const clearState = useCallback(() => {
    setQuestion('');
    setState({
      status: 'idle',
      answer: null,
      refused: false,
      error: null,
      tookMs: null,
    });
  }, []);

  return {
    question,
    setQuestion,
    state,
    askQuestion,
    clearState,
    maxLength: MAX_MESSAGE_LENGTH,
  };
}
