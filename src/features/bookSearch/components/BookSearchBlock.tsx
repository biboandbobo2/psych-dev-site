/**
 * Основной компонент поиска по книгам
 */
import { type FormEvent } from 'react';
import { useBookAnswer } from '../hooks/useBookAnswer';
import { BookSelector } from './BookSelector';
import { BookAnswer } from './BookAnswer';

export function BookSearchBlock() {
  const {
    query,
    setQuery,
    selectedBooks,
    setSelectedBooks,
    state,
    askQuestion,
    clearState,
    maxLength,
    maxBooks,
  } = useBookAnswer();

  const isLoading = state.status === 'loading';
  const charCount = query.length;
  const isOverLimit = charCount > maxLength;
  const canSubmit =
    query.trim().length >= 3 &&
    !isOverLimit &&
    !isLoading &&
    selectedBooks.length > 0;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (canSubmit) {
      askQuestion();
    }
  };

  return (
    <section
      className="border-t border-border pt-6 mt-6"
      aria-labelledby="book-search-title"
    >
      <header className="mb-4">
        <h3 id="book-search-title" className="text-base font-semibold text-fg">
          Поиск по книгам
        </h3>
        <p className="text-xs text-muted mt-1">
          Задайте вопрос — получите ответ с цитатами из книг
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Book Selector */}
        <BookSelector
          selectedIds={selectedBooks}
          onChange={setSelectedBooks}
          maxBooks={maxBooks}
        />

        {/* Question Input */}
        <div className="space-y-1">
          <label htmlFor="book-question-input" className="sr-only">
            Ваш вопрос
          </label>
          <textarea
            id="book-question-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Например: Что такое теория привязанности и как она развивалась?"
            disabled={isLoading}
            rows={3}
            className={`w-full rounded-lg border px-4 py-3 text-sm text-fg shadow-sm resize-none focus:outline-none focus:ring-2 transition ${
              isOverLimit
                ? 'border-red-400 focus:border-red-400 focus:ring-red-200'
                : 'border-border bg-card focus:border-accent/60 focus:ring-accent/30'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
            aria-describedby="book-char-count"
          />
          <div
            id="book-char-count"
            className={`text-xs text-right ${
              isOverLimit ? 'text-red-500 font-medium' : 'text-muted'
            }`}
          >
            {charCount}/{maxLength}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Ищу ответ…
              </>
            ) : (
              'Найти ответ'
            )}
          </button>
          <button
            type="button"
            onClick={clearState}
            disabled={isLoading && query.length === 0 && state.status === 'idle'}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-muted transition hover:bg-card2 hover:text-fg disabled:cursor-not-allowed disabled:opacity-60"
          >
            Очистить
          </button>
        </div>
      </form>

      {/* Loading State */}
      {state.status === 'loading' && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          Ищу ответ в выбранных книгах…
        </div>
      )}

      {/* Error State */}
      {state.status === 'error' && state.error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.error}
        </div>
      )}

      {/* Success State */}
      {state.status === 'success' && state.answer && (
        <div className="mt-4">
          <BookAnswer
            answer={state.answer}
            citations={state.citations}
            tookMs={state.tookMs}
          />
        </div>
      )}
    </section>
  );
}
