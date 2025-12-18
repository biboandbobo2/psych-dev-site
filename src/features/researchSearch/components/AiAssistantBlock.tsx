import { useAiAssistant } from '../hooks/useAiAssistant';

export function AiAssistantBlock() {
  const { question, setQuestion, state, askQuestion, clearState, maxLength } = useAiAssistant();
  const isLoading = state.status === 'loading';
  const charCount = question.length;
  const isOverLimit = charCount > maxLength;
  const canSubmit = question.trim().length > 0 && !isOverLimit && !isLoading;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) {
      askQuestion();
    }
  };

  return (
    <section className="border-t border-border pt-6 mt-6" aria-labelledby="ai-assistant-title">
      <header className="mb-4">
        <h3 id="ai-assistant-title" className="text-base font-semibold text-fg">
          ИИ-помощник по психологии
        </h3>
        <p className="text-xs text-muted mt-1">
          Отвечает только по психологии. Вопрос до {maxLength} символов.
        </p>
      </header>

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
      </form>

      {/* Loading state */}
      {state.status === 'loading' && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          Формирую ответ…
        </div>
      )}

      {/* Error state */}
      {state.status === 'error' && state.error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.error}
        </div>
      )}

      {/* Success state */}
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
    </section>
  );
}
