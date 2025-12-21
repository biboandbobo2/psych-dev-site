import { useState, type FormEvent } from 'react';
import { useAiAssistant } from '../hooks/useAiAssistant';
import { useAiChat } from '../hooks/useAiChat';
import { BookSearchBlock } from '../../bookSearch';

export function AiAssistantBlock() {
  const [mode, setMode] = useState<'single' | 'chat'>('single');
  const { question, setQuestion, state, askQuestion, clearState, maxLength } = useAiAssistant();
  const {
    input,
    setInput,
    messages,
    state: chatState,
    sendMessage,
    clearChat,
    maxLength: chatMaxLength,
  } = useAiChat();

  const isLoading = state.status === 'loading';
  const isChatLoading = chatState.status === 'loading';
  const charCount = question.length;
  const isOverLimit = charCount > maxLength;
  const canSubmit = question.trim().length > 0 && !isOverLimit && !isLoading;
  const chatCharCount = input.length;
  const chatOverLimit = chatCharCount > chatMaxLength;
  const canSendChat = input.trim().length > 0 && !chatOverLimit && !isChatLoading;

  const hasTranscript =
    (mode === 'chat' && messages.length > 0) ||
    (mode === 'single' && Boolean(state.answer && state.answer.trim()));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (canSubmit) {
      askQuestion();
    }
  };

  const handleChatSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (canSendChat) {
      sendMessage();
    }
  };

  const buildTranscript = () => {
    if (mode === 'chat' && messages.length > 0) {
      return messages
        .map((msg) => `${msg.role === 'user' ? 'Вы' : 'Ассистент'}: ${msg.text}`)
        .join('\n\n');
    }
    if (state.answer) {
      const questionText = question.trim();
      if (questionText) {
        return `Вы: ${questionText}\n\nАссистент: ${state.answer}`;
      }
      return `Ассистент: ${state.answer}`;
    }
    return '';
  };

  const handleDownloadTranscript = () => {
    const transcript = buildTranscript();
    if (!transcript) return;
    const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const date = new Date().toISOString().slice(0, 10);
    link.download = `ai-assistant-${mode}-${date}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="border-t border-border pt-6 mt-6" aria-labelledby="ai-assistant-title">
      <header className="mb-4">
        <h3 id="ai-assistant-title" className="text-base font-semibold text-fg">
          ИИ-помощник по психологии
        </h3>
        <p className="text-xs text-muted mt-1">Отвечает только по психологии.</p>
        <div className="mt-2 flex flex-wrap gap-2 items-center">
          <div className="inline-flex rounded-lg border border-border bg-card p-1 text-sm">
            <button
              type="button"
              onClick={() => setMode('single')}
              className={`rounded-md px-3 py-1.5 transition ${
                mode === 'single' ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted hover:text-fg'
              }`}
            >
              Быстрый ответ
            </button>
            <button
              type="button"
              onClick={() => setMode('chat')}
              className={`rounded-md px-3 py-1.5 transition ${
                mode === 'chat' ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted hover:text-fg'
              }`}
            >
              Диалоговый режим
            </button>
          </div>
          <button
            type="button"
            onClick={handleDownloadTranscript}
            disabled={!hasTranscript}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted transition hover:bg-card2 hover:text-fg disabled:cursor-not-allowed disabled:opacity-60"
          >
            ⬇️ Скачать историю
          </button>
        </div>
      </header>

      {mode === 'single' ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="ai-question-input" className="sr-only">
              Ваш вопрос
            </label>
            <textarea
              id="ai-question-input"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Например: Что такое теория привязанности?"
              disabled={isLoading}
              rows={2}
              className={`w-full rounded-lg border px-4 py-3 text-sm text-fg shadow-sm resize-none focus:outline-none focus:ring-2 transition ${
                isOverLimit
                  ? 'border-red-400 focus:border-red-400 focus:ring-red-200'
                  : 'border-border bg-card focus:border-accent/60 focus:ring-accent/30'
              } disabled:opacity-60 disabled:cursor-not-allowed`}
              aria-describedby="ai-char-count"
            />
            <div
              id="ai-char-count"
              className={`text-xs text-right ${isOverLimit ? 'text-red-500 font-medium' : 'text-muted'}`}
            >
              {charCount}/{maxLength}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Думаю…
                </>
              ) : (
                'Спросить'
              )}
            </button>
            <button
              type="button"
              onClick={clearState}
              disabled={isLoading && question.length === 0 && state.status === 'idle'}
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-muted transition hover:bg-card2 hover:text-fg disabled:cursor-not-allowed disabled:opacity-60"
            >
              Очистить
            </button>
          </div>

          {state.status === 'loading' && (
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              Формирую ответ…
            </div>
          )}

          {state.status === 'error' && state.error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {state.error}
            </div>
          )}

          {state.status === 'success' && state.answer && (
            <div className="mt-4 space-y-2">
              {state.refused && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
                  Вопрос не относится к психологии. Попробуйте переформулировать.
                </div>
              )}
              <div className="rounded-lg border border-border bg-card px-4 py-4 text-sm text-fg leading-relaxed whitespace-pre-wrap">
                {state.answer}
              </div>
              {state.tookMs && (
                <p className="text-xs text-muted text-right">
                  Ответ за {(state.tookMs / 1000).toFixed(1)} сек
                </p>
              )}
            </div>
          )}
        </form>
      ) : (
        <div className="space-y-3">
          <form onSubmit={handleChatSubmit} className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="ai-chat-input" className="sr-only">
                Сообщение в чат
              </label>
              <textarea
                id="ai-chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Например: Давай обсудим стадии развития по Пиаже"
                disabled={isChatLoading}
                rows={2}
                className={`w-full rounded-lg border px-4 py-3 text-sm text-fg shadow-sm resize-none focus:outline-none focus:ring-2 transition ${
                  chatOverLimit
                    ? 'border-red-400 focus:border-red-400 focus:ring-red-200'
                    : 'border-border bg-card focus:border-accent/60 focus:ring-accent/30'
                } disabled:opacity-60 disabled:cursor-not-allowed`}
                aria-describedby="ai-chat-char-count"
              />
              <div
                id="ai-chat-char-count"
                className={`text-xs text-right ${chatOverLimit ? 'text-red-500 font-medium' : 'text-muted'}`}
              >
                {chatCharCount}/{chatMaxLength}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!canSendChat}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isChatLoading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Думаю…
                  </>
                ) : (
                  'Отправить'
                )}
              </button>
              <button
                type="button"
                onClick={clearChat}
                disabled={isChatLoading && input.length === 0 && chatState.status === 'idle'}
                className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-muted transition hover:bg-card2 hover:text-fg disabled:cursor-not-allowed disabled:opacity-60"
              >
                Очистить чат
              </button>
            </div>
          </form>

          <div className="max-h-64 overflow-y-auto space-y-2 rounded-lg border border-border bg-card px-3 py-3">
            {messages.length === 0 ? (
              <p className="text-sm text-muted">Начните диалог: сообщения не сохраняются и видны только вам.</p>
            ) : (
              messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}-${message.text.slice(0, 8)}`}
                  className={`rounded-lg px-3 py-2 text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'bg-emerald-50 text-emerald-900'
                      : 'bg-card2 text-fg border border-border'
                  }`}
                >
                  <span className="block text-[11px] uppercase tracking-wide text-muted mb-1">
                    {message.role === 'user' ? 'Вы' : 'Ассистент'}
                  </span>
                  <span className="whitespace-pre-wrap">{message.text}</span>
                </div>
              ))
            )}
          </div>

          {chatState.status === 'loading' && (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              Формирую ответ…
            </div>
          )}

          {chatState.status === 'error' && chatState.error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {chatState.error}
            </div>
          )}

          {chatState.status === 'success' && chatState.refused && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
              Вопрос не относится к психологии. Попробуйте переформулировать.
            </div>
          )}

          {chatState.status === 'success' && chatState.tookMs && (
            <p className="text-xs text-muted text-right">
              Ответ за {(chatState.tookMs / 1000).toFixed(1)} сек
            </p>
          )}
        </div>
      )}

      {/* Book Search Section */}
      <BookSearchBlock />
    </section>
  );
}
