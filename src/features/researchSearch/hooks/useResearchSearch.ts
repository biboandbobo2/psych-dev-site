import { useEffect, useRef, useState } from 'react';
import { debugError, debugLog, debugWarn } from '../../../lib/debug';
import type { PapersApiResponse, ResearchWork } from '../types';

type Status = 'idle' | 'loading' | 'error' | 'success';

// TODO: Re-enable Chinese when needed
const DEFAULT_LANGS = ['ru', 'de', 'fr', 'es', 'en'];

interface UseResearchSearchOptions {
  mode: 'drawer' | 'page';
  initialQuery?: string;
  initialLangs?: string[];
  initialPsychologyOnly?: boolean;
  trigger?: 'manual' | 'auto';
  autoTriggerInitial?: boolean;
}

interface UseResearchSearchState {
  status: Status;
  error: string | null;
  results: ResearchWork[];
  meta: PapersApiResponse['meta'] | null;
}

export function useResearchSearch({
  mode,
  initialQuery = '',
  initialLangs = DEFAULT_LANGS,
  initialPsychologyOnly = true,
  trigger = 'manual',
  autoTriggerInitial = true,
}: UseResearchSearchOptions) {
  const [query, setQuery] = useState(initialQuery);
  const [langs, setLangs] = useState<string[]>(initialLangs);
  const [psychologyOnly, setPsychologyOnly] = useState(initialPsychologyOnly);
  const [requestId, setRequestId] = useState(() =>
    initialQuery.trim().length >= 3 && autoTriggerInitial ? 1 : 0
  );
  const [state, setState] = useState<UseResearchSearchState>({
    status: initialQuery.trim().length >= 3 && autoTriggerInitial ? 'loading' : 'idle',
    error: null,
    results: [],
    meta: null,
  });

  const controllerRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, PapersApiResponse>>(new Map());
  const debounceRef = useRef<number>();

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
      controllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < 3) {
      setState((prev) => ({
        ...prev,
        status: 'idle',
        error: null,
        results: [],
        meta: null,
      }));
      controllerRef.current?.abort();
      return;
    }

    const isManual = trigger === 'manual';
    if (isManual && requestId === 0) {
      return;
    }

    const cacheKey = `${trimmed}|${langs.join(',')}|${mode}|${psychologyOnly}`;
    if (cacheRef.current.has(cacheKey)) {
      const cached = cacheRef.current.get(cacheKey)!;
      setState({
        status: 'success',
        error: null,
        results: cached.results,
        meta: cached.meta,
      });
      return;
    }

    setState((prev) => ({ ...prev, status: 'loading', error: null }));

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    debounceRef.current = window.setTimeout(async () => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      try {
        const params = new URLSearchParams({
          q: trimmed,
          limit: mode === 'page' ? '30' : '20',
          langs: langs.join(','),
          mode,
          psychologyOnly: psychologyOnly ? 'true' : 'false',
        });

        debugLog('[useResearchSearch] fetching', params.toString());
        const response = await fetch(`/api/papers?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          const message = payload?.message || `Ошибка запроса (${response.status})`;
          throw new Error(message);
        }

        const data = (await response.json()) as PapersApiResponse;
        cacheRef.current.set(cacheKey, data);
        setState({
          status: 'success',
          error: null,
          results: data.results,
          meta: data.meta,
        });
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          debugWarn('[useResearchSearch] aborted', trimmed);
          return;
        }
        debugError('[useResearchSearch] error', error);
        setState({
          status: 'error',
          error: (error as Error).message || 'Не удалось выполнить поиск',
          results: [],
          meta: null,
        });
      }
    }, 600);
  }, [query, langs, mode, trigger, requestId, psychologyOnly]);

  const runSearch = () => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setState((prev) => ({
        ...prev,
        status: 'idle',
        error: 'Введите минимум 3 символа',
        results: [],
        meta: null,
      }));
      return;
    }
    setRequestId((prev) => prev + 1);
  };

  return {
    query,
    setQuery,
    langs,
    setLangs,
    psychologyOnly,
    setPsychologyOnly,
    state,
    runSearch,
  };
}

export function useFilteredResults(results: ResearchWork[], languageFilter: string, minYear?: number) {
  return results.filter((item) => {
    const langOk = languageFilter === 'all' || item.language === languageFilter;
    const yearOk = !minYear || !item.year || item.year >= minYear;
    return langOk && yearOk;
  });
}
