import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useResearchSearch, useFilteredResults } from '../features/researchSearch/hooks/useResearchSearch';
import { ResearchResultsList } from '../features/researchSearch/components/ResearchResultsList';
import { BookSearchBlock } from '../features/bookSearch';

// Default languages for search (Chinese disabled for now)
const DEFAULT_LANGS = ['ru', 'en', 'de', 'fr', 'es'];

const ALL_LANGUAGES = [
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  // { code: 'zh', label: '中文' }, // TODO: Re-enable when needed
];

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 1990;

type SortOption = 'relevance' | 'year-desc' | 'year-asc';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'relevance', label: 'По релевантности' },
  { value: 'year-desc', label: 'Сначала новые' },
  { value: 'year-asc', label: 'Сначала старые' },
];

export default function ResearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQuery = searchParams.get('q') ?? '';
  const initialLang = searchParams.get('lang') ?? 'all';
  const [languageFilter, setLanguageFilter] = useState(initialLang);
  const [minYear, setMinYear] = useState<number>(MIN_YEAR);
  const [sortBy, setSortBy] = useState<SortOption>('relevance');

  const { query, setQuery, langs, setLangs, state, runSearch } = useResearchSearch({
    mode: 'page',
    initialQuery,
    initialLangs: initialLang === 'all' ? DEFAULT_LANGS : [initialLang],
    initialPsychologyOnly: true, // Always filter by psychology
    trigger: 'manual',
    autoTriggerInitial: Boolean(initialQuery.trim().length >= 3),
  });

  const toggleLang = (code: string) => {
    if (langs.includes(code)) {
      if (langs.length > 1) {
        setLangs(langs.filter((l) => l !== code));
      }
    } else {
      setLangs([...langs, code]);
    }
  };

  // Search is auto-triggered by the hook when autoTriggerInitial is true
  // No need for manual useEffect trigger here

  const languagesFromResults = useMemo(() => {
    const langsSet = new Set<string>();
    state.results.forEach((item) => {
      if (item.language && item.language !== 'unknown') {
        langsSet.add(item.language);
      }
    });
    return Array.from(langsSet);
  }, [state.results]);

  const filteredResults = useFilteredResults(
    state.results,
    languageFilter === 'all' ? 'all' : languageFilter,
    minYear > MIN_YEAR ? minYear : undefined
  );

  // Apply sorting
  const sortedResults = useMemo(() => {
    if (sortBy === 'relevance') return filteredResults;
    return [...filteredResults].sort((a, b) => {
      const yearA = a.year ?? 0;
      const yearB = b.year ?? 0;
      return sortBy === 'year-desc' ? yearB - yearA : yearA - yearB;
    });
  }, [filteredResults, sortBy]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextParams: Record<string, string> = {};
    if (query.trim()) nextParams.q = query.trim();
    if (languageFilter !== 'all') nextParams.lang = languageFilter;
    setSearchParams(nextParams);
    if (languageFilter === 'all') {
      setLangs(DEFAULT_LANGS);
    } else {
      setLangs([languageFilter]);
    }
    runSearch();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center gap-3 text-sm text-muted">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-fg transition hover:bg-card2"
        >
          ← Назад
        </button>
        <span className="uppercase tracking-[0.2em] text-xs">Научный поиск</span>
      </div>

      <h1 className="text-3xl font-bold text-fg mb-3">Результаты исследований</h1>
      <p className="text-muted mb-6">Open Access выдача по психологии и смежным областям.</p>

      <form onSubmit={handleSubmit} className="mb-6 space-y-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Введите запрос..."
            className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-fg shadow-sm focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={query.trim().length < 3}
          >
            Искать
          </button>
          <button
            type="button"
            onClick={() => alert('Глубокий поиск (Wikidata + мультиязычный) — в разработке')}
            className="rounded-lg border-2 border-purple-500 bg-purple-50 px-4 py-3 text-sm font-semibold text-purple-700 shadow-sm transition hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={query.trim().length < 3}
            title="Поиск через Wikidata с автоматическим переводом на все языки"
          >
            Глубокий поиск
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted self-center mr-1">Фильтр по языкам статей:</span>
          {ALL_LANGUAGES.map(({ code, label }) => (
            <button
              key={code}
              type="button"
              onClick={() => toggleLang(code)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                langs.includes(code)
                  ? 'bg-blue-600 text-white'
                  : 'bg-card border border-border text-muted hover:bg-card2'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted" htmlFor="lang-filter">
              Фильтр по языку:
            </label>
            <select
              id="lang-filter"
              value={languageFilter}
              onChange={(event) => setLanguageFilter(event.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-fg shadow-sm focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/30"
            >
              <option value="all">Все</option>
              {languagesFromResults.map((lang) => (
                <option key={lang} value={lang}>
                  {lang.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-muted" htmlFor="year-slider">
              Год с: <span className="font-semibold text-fg">{minYear === MIN_YEAR ? 'любого' : minYear}</span>
            </label>
            <input
              id="year-slider"
              type="range"
              min={MIN_YEAR}
              max={CURRENT_YEAR}
              value={minYear}
              onChange={(e) => setMinYear(Number(e.target.value))}
              className="w-32 h-2 bg-border rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            {minYear > MIN_YEAR && (
              <button
                type="button"
                onClick={() => setMinYear(MIN_YEAR)}
                className="text-xs text-muted hover:text-fg"
              >
                Сбросить
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-muted" htmlFor="sort-select">
              Сортировка:
            </label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-fg shadow-sm focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/30"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </form>

      {state.status === 'idle' ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted">
          Введите запрос (от 3 символов), чтобы начать поиск по открытым источникам.
        </div>
      ) : null}

      {state.status === 'loading' ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          Выполняем поиск…
        </div>
      ) : null}

      {state.status === 'error' ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Не удалось загрузить результаты: {state.error}
        </div>
      ) : null}

      {state.status === 'success' ? (
        <div className="mt-4">
          <div className="mb-3 text-sm text-muted">
            Нашли {sortedResults.length} работ
            {state.meta?.psychologyFilterApplied ? ' (только психология)' : ''}.
            {state.meta?.queryVariantsUsed && state.meta.queryVariantsUsed.length > 1 ? (
              <span className="ml-2 text-xs text-accent">
                Запросы: {state.meta.queryVariantsUsed.join(', ')}
              </span>
            ) : null}
          </div>
          <ResearchResultsList results={sortedResults} query={query} />
        </div>
      ) : null}

      {/* Book Search */}
      <BookSearchBlock />
    </div>
  );
}
