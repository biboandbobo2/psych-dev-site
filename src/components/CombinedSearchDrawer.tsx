import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContentSearch } from '../features/contentSearch/hooks/useContentSearch';
import { ContentSearchResults } from '../features/contentSearch/components/ContentSearchResults';
import { useResearchSearch } from '../features/researchSearch/hooks/useResearchSearch';
import { ResearchResultsList } from '../features/researchSearch/components/ResearchResultsList';
import { usePeriods } from '../hooks/usePeriods';
import { useClinicalTopics } from '../hooks/useClinicalTopics';
import { useGeneralTopics } from '../hooks/useGeneralTopics';
import { useSearchHistory } from '../hooks';
import { useContentSearchStore } from '../stores';
import { getPublishedTests } from '../lib/tests';
import type { Test } from '../types/tests';
import { Emoji } from './Emoji';

type SearchTab = 'content' | 'research';

const DRAWER_LANGS = ['ru', 'en'];

interface CombinedSearchDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CombinedSearchDrawer({ open, onClose }: CombinedSearchDrawerProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const contentInputRef = useRef<HTMLInputElement | null>(null);
  const researchInputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<SearchTab>('content');
  const [contentInputValue, setContentInputValue] = useState('');

  // Content search data
  const { periods, loading: periodsLoading } = usePeriods(true);
  const { topics: clinicalTopics, loading: clinicalLoading } = useClinicalTopics();
  const { topics: generalTopics, loading: generalLoading } = useGeneralTopics();
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

  const isContentLoading = periodsLoading || clinicalLoading || generalLoading || testsLoading;

  const contentData = useMemo(
    () => ({ periods, clinicalTopics, generalTopics }),
    [periods, clinicalTopics, generalTopics]
  );

  const { state: contentState, search: contentSearch, reset: contentReset } = useContentSearch(contentData, tests);
  const { saveSearch } = useSearchHistory();
  const { initialQuery, clearInitialQuery } = useContentSearchStore();

  // Research search
  const { query: researchQuery, setQuery: setResearchQuery, state: researchState, runSearch: runResearchSearch } = useResearchSearch({
    mode: 'drawer',
    initialLangs: DRAWER_LANGS,
    initialPsychologyOnly: true,
    trigger: 'manual',
    autoTriggerInitial: false,
  });

  // Save refs for deduplication
  const savedContentQueryRef = useRef<string>('');
  const saveContentTimeoutRef = useRef<number | null>(null);
  const savedResearchQueryRef = useRef<string>('');

  // Apply initial query for content search
  useEffect(() => {
    if (open && initialQuery) {
      setActiveTab('content');
      setContentInputValue(initialQuery);
      contentSearch(initialQuery);
      clearInitialQuery();
    }
  }, [open, initialQuery, contentSearch, clearInitialQuery]);

  // Save content search with debounce
  const doSaveContentSearch = (query: string, resultsCount: number) => {
    if (query.trim().length >= 2 && query !== savedContentQueryRef.current) {
      savedContentQueryRef.current = query;
      saveSearch({ type: 'content', query: query.trim(), resultsCount });
    }
  };

  useEffect(() => {
    if (contentState.status === 'success' && contentState.query.trim().length >= 2) {
      if (saveContentTimeoutRef.current) window.clearTimeout(saveContentTimeoutRef.current);
      saveContentTimeoutRef.current = window.setTimeout(() => {
        doSaveContentSearch(contentState.query, contentState.results.length);
      }, 10000);
    }
    return () => {
      if (saveContentTimeoutRef.current) window.clearTimeout(saveContentTimeoutRef.current);
    };
  }, [contentState.status, contentState.query, contentState.results.length]);

  // Save research search
  useEffect(() => {
    if (researchState.status === 'success' && researchQuery.trim().length >= 3 && researchQuery !== savedResearchQueryRef.current) {
      savedResearchQueryRef.current = researchQuery;
      const simplifiedResults = researchState.results.slice(0, 20).map((r) => ({
        title: r.title,
        url: r.primaryUrl || r.oaPdfUrl || (r.doi ? `https://doi.org/${r.doi}` : undefined),
        year: r.year,
        authors: r.authors.slice(0, 2).join(', ') + (r.authors.length > 2 ? ' и др.' : ''),
      }));
      saveSearch({ type: 'research', query: researchQuery.trim(), resultsCount: researchState.results.length, searchResults: simplifiedResults });
    }
  }, [researchState.status, researchState.results, researchQuery, saveSearch]);

  // Handle close - save content search if needed
  useEffect(() => {
    if (!open && contentState.query.trim().length >= 2) {
      if (saveContentTimeoutRef.current) {
        window.clearTimeout(saveContentTimeoutRef.current);
        saveContentTimeoutRef.current = null;
      }
      doSaveContentSearch(contentState.query, contentState.results.length);
    }
  }, [open]);

  // Escape key and focus
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    const timer = window.setTimeout(() => {
      if (activeTab === 'content') contentInputRef.current?.focus();
      else researchInputRef.current?.focus();
    }, 100);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.clearTimeout(timer);
    };
  }, [open, onClose, activeTab]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setContentInputValue('');
      contentReset();
    }
  }, [open, contentReset]);

  if (!open) return null;

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === overlayRef.current) onClose();
  };

  const handleContentInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setContentInputValue(value);
    if (value.trim().length >= 2) contentSearch(value);
    else contentReset();
  };

  const handleContentResultClick = (path: string) => {
    if (contentState.query) doSaveContentSearch(contentState.query, contentState.results.length);
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
        className="relative h-full max-h-screen w-full max-w-[640px] overflow-y-auto bg-white shadow-2xl border-l border-border"
        aria-label="Поиск"
        data-testid="combined-search-drawer"
      >
        <header className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Поиск</p>
            <h2 className="text-lg font-semibold text-fg">По сайту и статьям</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-muted hover:text-fg hover:bg-card transition"
            aria-label="Закрыть поиск"
          >
            <Emoji token="✕" size={16} />
          </button>
        </header>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('content')}
            className={`flex-1 py-3 text-sm font-medium transition ${
              activeTab === 'content'
                ? 'text-amber-700 border-b-2 border-amber-500 bg-amber-50'
                : 'text-muted hover:text-fg hover:bg-gray-50'
            }`}
          >
            По сайту
          </button>
          <button
            onClick={() => setActiveTab('research')}
            className={`flex-1 py-3 text-sm font-medium transition ${
              activeTab === 'research'
                ? 'text-indigo-700 border-b-2 border-indigo-500 bg-indigo-50'
                : 'text-muted hover:text-fg hover:bg-gray-50'
            }`}
          >
            Научные статьи
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Content Search Tab */}
          {activeTab === 'content' && (
            <>
              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-fg" htmlFor="content-search-input">
                    Что ищете?
                  </label>
                  <input
                    id="content-search-input"
                    ref={contentInputRef}
                    type="text"
                    value={contentInputValue}
                    onChange={handleContentInputChange}
                    placeholder="Например: привязанность, Выготский, кризис 7 лет..."
                    className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-fg shadow-sm focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30"
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted">
                    Поиск по заголовкам, понятиям, авторам, литературе и тестам
                  </p>
                </div>
              </form>

              {isContentLoading && (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                  Загружаем контент...
                </div>
              )}

              {!isContentLoading && contentState.status === 'idle' && (
                <div className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted">
                  Введите запрос (от 2 символов) для поиска по всем курсам.
                </div>
              )}

              {!isContentLoading && contentState.status === 'success' && contentState.results.length === 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Ничего не найдено по запросу «{contentState.query}»
                </div>
              )}

              {!isContentLoading && contentState.status === 'success' && contentState.results.length > 0 && (
                <ContentSearchResults
                  results={contentState.results}
                  query={contentState.query}
                  onResultClick={handleContentResultClick}
                />
              )}
            </>
          )}

          {/* Research Search Tab */}
          {activeTab === 'research' && (
            <>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  runResearchSearch();
                }}
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium text-fg" htmlFor="research-search-input">
                    Запрос
                  </label>
                  <input
                    id="research-search-input"
                    ref={researchInputRef}
                    type="text"
                    value={researchQuery}
                    onChange={(e) => setResearchQuery(e.target.value)}
                    placeholder="Например: attachment theory, executive functions..."
                    className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-fg shadow-sm focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                  <p className="text-xs text-muted">Минимум 3 символа. Источники: OpenAlex, Semantic Scholar.</p>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted">Поиск по русским и английским источникам</p>
                  <button
                    type="submit"
                    disabled={researchQuery.trim().length < 3}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Искать
                  </button>
                </div>
              </form>

              {researchState.status === 'idle' && (
                <div className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted">
                  Введите запрос (от 3 символов), затем нажмите «Искать».
                </div>
              )}

              {researchState.status === 'loading' && (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                  Выполняем поиск…
                </div>
              )}

              {researchState.status === 'error' && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  Не удалось загрузить результаты: {researchState.error}
                </div>
              )}

              {researchState.status === 'success' && (
                <div className="max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
                  <ResearchResultsList
                    results={researchState.results.slice(0, 15)}
                    query={researchQuery}
                    onOpenAll={() => {
                      if (!researchQuery.trim()) return;
                      navigate(`/research?q=${encodeURIComponent(researchQuery.trim())}`);
                      onClose();
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
