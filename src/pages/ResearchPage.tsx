import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useResearchSearch, useFilteredResults } from '../features/researchSearch/hooks/useResearchSearch';
import { ResearchResultsList } from '../features/researchSearch/components/ResearchResultsList';

const DEFAULT_LANGS = ['ru', 'zh', 'de', 'fr', 'es', 'en'];

export default function ResearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQuery = searchParams.get('q') ?? '';
  const initialLang = searchParams.get('lang') ?? 'all';
  const [languageFilter, setLanguageFilter] = useState(initialLang);
  const [minYear, setMinYear] = useState<string>('');

  const { query, setQuery, langs, setLangs, state, runSearch } = useResearchSearch({
    mode: 'page',
    initialQuery,
    initialLangs: initialLang === 'all' ? DEFAULT_LANGS : [initialLang],
    trigger: 'manual',
    autoTriggerInitial: Boolean(initialQuery.trim().length >= 3),
  });

  useEffect(() => {
    const paramQuery = searchParams.get('q') ?? '';
    if (paramQuery !== query) {
      setQuery(paramQuery);
    }
  }, [searchParams, query, setQuery]);

  useEffect(() => {
    if (initialQuery.trim().length >= 3) {
      runSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (initialLang !== languageFilter) {
      setLanguageFilter(initialLang);
    }
  }, [initialLang]);

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
    minYear ? Number(minYear) : undefined
  );

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
      <p className="text-muted mb-6">Open Access выдача из OpenAlex (fallback S2 добавим позже).</p>

      <form onSubmit={handleSubmit} className="mb-6 grid gap-3 md:grid-cols-[1.4fr_0.6fr_0.6fr_auto]">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Введите запрос..."
          className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-fg shadow-sm focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30"
        />

        <select
          value={languageFilter}
          onChange={(event) => {
            const value = event.target.value;
            setLanguageFilter(value);
            if (value === 'all') {
              setLangs(DEFAULT_LANGS);
            } else {
              setLangs([value]);
            }
          }}
          className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-fg shadow-sm focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value="all">Все языки</option>
          {languagesFromResults.map((lang) => (
            <option key={lang} value={lang}>
              {lang.toUpperCase()}
            </option>
          ))}
        </select>

        <input
          type="number"
          inputMode="numeric"
          value={minYear}
          onChange={(event) => setMinYear(event.target.value)}
          placeholder="Год с..."
          className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-fg shadow-sm focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30"
        />

        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={query.trim().length < 3}
        >
          Искать
        </button>
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
            Нашли {filteredResults.length} работ
            {state.meta?.allowListApplied ? ' (фильтр по OA-источникам включён)' : ''}.
          </div>
          <ResearchResultsList results={filteredResults} />
        </div>
      ) : null}
    </div>
  );
}
