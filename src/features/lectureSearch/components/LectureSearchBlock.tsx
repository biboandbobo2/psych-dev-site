import { useEffect, useRef, type FormEvent } from 'react';
import { LectureAnswer } from './LectureAnswer';
import { LectureSelector } from './LectureSelector';
import { useLectureAnswer } from '../hooks/useLectureAnswer';
import { useSearchHistory } from '../../../hooks';

export function LectureSearchBlock() {
  const {
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
    maxLength,
  } = useLectureAnswer();
  const { saveSearch } = useSearchHistory();
  const lastSavedQueryRef = useRef('');

  const isLoading = state.status === 'loading';
  const charCount = query.length;
  const isOverLimit = charCount > maxLength;
  const canSubmit =
    query.trim().length >= 3 &&
    !isOverLimit &&
    !isLoading &&
    Boolean(selectedCourseId) &&
    (useWholeCourse || selectedLectureKeys.length > 0);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (canSubmit) {
      askQuestion();
    }
  };

  useEffect(() => {
    if (state.status !== 'success' || !query.trim() || query === lastSavedQueryRef.current) {
      return;
    }

    lastSavedQueryRef.current = query;
    void saveSearch({
      type: 'ai_chat',
      query: query.trim(),
      hasAnswer: Boolean(state.answer),
      aiResponse: state.answer || undefined,
    });
  }, [query, saveSearch, state.answer, state.status]);

  return (
    <section className="mt-6 border-t border-border pt-6" aria-labelledby="lecture-search-title">
      <header className="mb-4">
        <h3 id="lecture-search-title" className="text-base font-semibold text-fg">
          ИИ по лекциям
        </h3>
        <p className="mt-1 text-xs text-muted">
          Выберите весь курс или точечные лекции и задайте вопрос по их транскриптам.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <LectureSelector
          selectedCourseId={selectedCourseId}
          onCourseChange={setSelectedCourseId}
          useWholeCourse={useWholeCourse}
          onUseWholeCourseChange={setUseWholeCourse}
          selectedLectureKeys={selectedLectureKeys}
          onLectureKeysChange={setSelectedLectureKeys}
        />

        <div className="space-y-1">
          <label htmlFor="lecture-question-input" className="sr-only">
            Ваш вопрос по лекциям
          </label>
          <textarea
            id="lecture-question-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Например: как в лекциях описывается развитие памяти?"
            disabled={isLoading}
            rows={3}
            className={`w-full rounded-lg border px-4 py-3 text-sm text-fg shadow-sm resize-none focus:outline-none focus:ring-2 transition ${
              isOverLimit
                ? 'border-red-400 focus:border-red-400 focus:ring-red-200'
                : 'border-border bg-card focus:border-accent/60 focus:ring-accent/30'
            } disabled:cursor-not-allowed disabled:opacity-60`}
          />
          <div className={`text-right text-xs ${isOverLimit ? 'font-medium text-red-500' : 'text-muted'}`}>
            {charCount}/{maxLength}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Ищу ответ…
              </>
            ) : (
              'Найти по лекциям'
            )}
          </button>
          <button
            type="button"
            onClick={clearState}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-muted transition hover:bg-card2 hover:text-fg"
          >
            Очистить
          </button>
        </div>
      </form>

      {state.status === 'loading' ? (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
          Ищу ответ в выбранных транскриптах…
        </div>
      ) : null}

      {state.status === 'error' && state.error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.error}
        </div>
      ) : null}

      {state.status === 'success' && state.answer ? (
        <div className="mt-4">
          <LectureAnswer
            answer={state.answer}
            citations={state.citations}
            tookMs={state.tookMs}
          />
        </div>
      ) : null}
    </section>
  );
}
