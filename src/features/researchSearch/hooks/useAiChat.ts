import { useCallback, useState } from 'react';
import type { AiAssistantState } from './useAiAssistant';
import { MAX_MESSAGE_LENGTH } from './useAiAssistant';

export type ChatMessage = { role: 'user' | 'assistant'; text: string };

const MAX_HISTORY_ITEMS = 6;

interface AiAssistantResponse {
  ok: true;
  answer: string;
  refused?: boolean;
  meta?: { tookMs: number; tokensUsed?: number; requestsToday?: number };
}

interface AiAssistantErrorResponse {
  ok: false;
  error: string;
}

export function useAiChat() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [state, setState] = useState<AiAssistantState>({
    status: 'idle',
    answer: null,
    refused: false,
    error: null,
    tookMs: null,
  });

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || trimmed.length > MAX_MESSAGE_LENGTH) return;

    const history = messages
      .slice(-MAX_HISTORY_ITEMS)
      .map((message) => ({ role: message.role, message: message.text }));

    setState({
      status: 'loading',
      answer: null,
      refused: false,
      error: null,
      tookMs: null,
    });

    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, locale: 'ru', history }),
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
      setMessages((prev) => [...prev, { role: 'assistant', text: successData.answer }]);
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
    } finally {
      setInput('');
    }
  }, [input, messages]);

  const clearChat = useCallback(() => {
    setInput('');
    setMessages([]);
    setState({
      status: 'idle',
      answer: null,
      refused: false,
      error: null,
      tookMs: null,
    });
  }, []);

  return {
    input,
    setInput,
    messages,
    state,
    sendMessage,
    clearChat,
    maxLength: MAX_MESSAGE_LENGTH,
  };
}
