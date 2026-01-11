import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContentSearch } from '../hooks/useContentSearch';
import { ContentSearchResults } from './ContentSearchResults';
import { usePeriods } from '../../../hooks/usePeriods';
import { useClinicalTopics } from '../../../hooks/useClinicalTopics';
import { useGeneralTopics } from '../../../hooks/useGeneralTopics';
import { useSearchHistory } from '../../../hooks';
import { getPublishedTests } from '../../../lib/tests';
import type { Test } from '../../../types/tests';

interface ContentSearchDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function ContentSearchDrawer({ open, onClose }: ContentSearchDrawerProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState('');

  // Загружаем контент всех курсов
  const { periods, loading: periodsLoading } = usePeriods(true);
  const { topics: clinicalTopics, loading: clinicalLoading } = useClinicalTopics();
  const { topics: generalTopics, loading: generalLoading } = useGeneralTopics();

  // Загружаем тесты
  const [tests, setTests] = useState<Test[]>([]);
  const [testsLoading, setTestsLoading] = useState(false);
  const testsLoadedRef = useRef(false);

  useEffect(() => {
    if (!open || testsLoadedRef.current) return;

    setTestsLoading(true);
    getPublishedTests()
      .then((loadedTests) => {
        setTests(loadedTests);
        testsLoadedRef.current = true;
      })
      .finally(() => setTestsLoading(false));
  }, [open]);

  const isLoading = periodsLoading || clinicalLoading || generalLoading || testsLoading;

  const contentData = useMemo(
    () => ({
      periods,
      clinicalTopics,
      generalTopics,
    }),
    [periods, clinicalTopics, generalTopics]
  );

  const { state, search, reset, isReady } = useContentSearch(contentData, tests);
  const { saveSearch } = useSearchHistory();

  // Ref для отслеживания сохранённого запроса (сохраняем только при клике на результат)
  const savedQueryRef = useRef<string>('');

  // Обработка Escape и фокус на input при открытии
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 100);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.clearTimeout(timer);
    };
  }, [open, onClose]);

  // Сброс состояния при закрытии
  useEffect(() => {
    if (!open) {
      setInputValue('');
      reset();
    }
  }, [open, reset]);

  if (!open) return null;

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === overlayRef.current) {
      onClose();
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    search(inputValue);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setInputValue(value);
    // Автоматический поиск при вводе (debounce не нужен, поиск быстрый)
    if (value.trim().length >= 2) {
      search(value);
    } else {
      reset();
    }
  };

  const handleResultClick = (path: string) => {
    // Сохраняем поиск только при клике на результат (пользователь нашёл что искал)
    if (state.query && state.query !== savedQueryRef.current) {
      savedQueryRef.current = state.query;
      saveSearch({
        type: 'content',
        query: state.query,
        resultsCount: state.results.length,
      });
    }
    navigate(path);
    onClose();
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm"
      onClick={handleOverlayClick}
      role="presentation"
    >
      <section
        className="relative h-full max-h-screen w-full max-w-[600px] overflow-y-auto bg-white shadow-2xl border-l border-border translate-x-0 transition-transform duration-200"
        aria-label="Поиск по сайту"
      >
        <header className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Поиск</p>
            <h2 className="text-lg font-semibold text-fg">По контенту сайта</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-muted hover:text-fg hover:bg-card transition"
            aria-label="Закрыть поиск"
          >
            ✕
          </button>
        </header>

        <div className="px-6 py-4 space-y-4">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-fg" htmlFor="content-search-input">
                Что ищете?
              </label>
              <input
                id="content-search-input"
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                placeholder="Например: привязанность, Выготский, кризис 7 лет..."
                className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-fg shadow-sm focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30"
                autoComplete="off"
              />
              <p className="text-xs text-muted">
                Поиск по заголовкам, понятиям, авторам, литературе и тестам
              </p>
            </div>
          </form>

          {isLoading && (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              Загружаем контент...
            </div>
          )}

          {!isLoading && state.status === 'idle' && (
            <div className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted">
              Введите запрос (от 2 символов) для поиска по всем курсам.
            </div>
          )}

          {!isLoading && state.status === 'success' && state.results.length === 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Ничего не найдено по запросу «{state.query}»
            </div>
          )}

          {!isLoading && state.status === 'success' && state.results.length > 0 && (
            <ContentSearchResults
              results={state.results}
              query={state.query}
              onResultClick={handleResultClick}
            />
          )}
        </div>
      </section>
    </div>
  );
}
