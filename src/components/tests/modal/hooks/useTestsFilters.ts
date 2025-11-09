import { useState, useEffect, useCallback } from 'react';
import type { URLSearchParams as URLSearchParamsType } from 'react-router-dom';

export type DisplayStatus = 'published' | 'draft' | 'taken_down';
export type SortOption = 'updated-desc' | 'created-desc' | 'title-asc';

export interface Filters {
  query: string;
  statuses: DisplayStatus[];
  rubric: string | 'all';
  questionMin?: number;
  questionMax?: number;
  hasNextLevel: boolean;
  sort: SortOption;
}

export interface FilterDraft {
  query: string;
  statuses: DisplayStatus[];
  rubric: string | 'all';
  questionMin: string;
  questionMax: string;
  hasNextLevel: boolean;
  sort: SortOption;
}

const DEFAULT_FILTERS: Filters = {
  query: '',
  statuses: [],
  rubric: 'all',
  questionMin: undefined,
  questionMax: undefined,
  hasNextLevel: false,
  sort: 'updated-desc',
};

const QUERY_KEYS = {
  query: 'test_q',
  statuses: 'test_status',
  rubric: 'test_rubric',
  min: 'test_min',
  max: 'test_max',
  hasNext: 'test_next',
  sort: 'test_sort',
};

function parseFiltersFromSearch(params: URLSearchParamsType): Filters {
  const query = params.get(QUERY_KEYS.query) ?? '';
  const statusesParam = params.get(QUERY_KEYS.statuses) ?? '';
  const statuses = statusesParam
    .split(',')
    .map((value) => value.trim())
    .filter((value): value is DisplayStatus =>
      value === 'draft' || value === 'published' || value === 'taken_down'
    );
  const rubric = params.get(QUERY_KEYS.rubric) ?? 'all';
  const min = params.get(QUERY_KEYS.min);
  const max = params.get(QUERY_KEYS.max);
  const hasNext = params.get(QUERY_KEYS.hasNext) === '1';
  const sortParam = params.get(QUERY_KEYS.sort) as SortOption | null;

  return {
    query,
    statuses,
    rubric: rubric || 'all',
    questionMin: min ? Number(min) : undefined,
    questionMax: max ? Number(max) : undefined,
    hasNextLevel: hasNext,
    sort: sortParam ?? 'updated-desc',
  };
}

function filtersToDraft(filters: Filters): FilterDraft {
  return {
    query: filters.query,
    statuses: filters.statuses,
    rubric: filters.rubric,
    questionMin: filters.questionMin?.toString() ?? '',
    questionMax: filters.questionMax?.toString() ?? '',
    hasNextLevel: filters.hasNextLevel,
    sort: filters.sort,
  };
}

function normalizeDraft(draft: FilterDraft): Filters {
  const questionMin =
    draft.questionMin.trim() === '' ? undefined : Number(draft.questionMin);
  const questionMax =
    draft.questionMax.trim() === '' ? undefined : Number(draft.questionMax);

  return {
    query: draft.query.trim(),
    statuses: draft.statuses,
    rubric: draft.rubric,
    questionMin: Number.isFinite(questionMin) ? questionMin : undefined,
    questionMax: Number.isFinite(questionMax) ? questionMax : undefined,
    hasNextLevel: draft.hasNextLevel,
    sort: draft.sort,
  };
}

function updateSearchParamsWithFilters(
  current: URLSearchParamsType,
  filters: Filters
): URLSearchParamsType {
  const next = new URLSearchParams(current.toString());

  Object.values(QUERY_KEYS).forEach((key) => {
    next.delete(key);
  });

  if (filters.query) {
    next.set(QUERY_KEYS.query, filters.query);
  }
  if (filters.statuses.length > 0) {
    next.set(QUERY_KEYS.statuses, filters.statuses.join(','));
  }
  if (filters.rubric !== 'all') {
    next.set(QUERY_KEYS.rubric, filters.rubric);
  }
  if (typeof filters.questionMin === 'number') {
    next.set(QUERY_KEYS.min, filters.questionMin.toString());
  }
  if (typeof filters.questionMax === 'number') {
    next.set(QUERY_KEYS.max, filters.questionMax.toString());
  }
  if (filters.hasNextLevel) {
    next.set(QUERY_KEYS.hasNext, '1');
  }
  if (filters.sort !== DEFAULT_FILTERS.sort) {
    next.set(QUERY_KEYS.sort, filters.sort);
  }

  return next;
}

interface UseTestsFiltersOptions {
  searchParams: URLSearchParamsType;
  setSearchParams: (params: URLSearchParamsType, options?: { replace?: boolean }) => void;
}

/**
 * Hook for managing test filters with URL sync
 */
export function useTestsFilters({ searchParams, setSearchParams }: UseTestsFiltersOptions) {
  const [filters, setFilters] = useState<Filters>(() =>
    parseFiltersFromSearch(new URLSearchParams(window.location.search))
  );
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterDraft, setFilterDraft] = useState<FilterDraft>(
    filtersToDraft(filters)
  );

  // Update filter draft when opening panel
  useEffect(() => {
    if (filterOpen) {
      setFilterDraft(filtersToDraft(filters));
    }
  }, [filterOpen, filters]);

  // Sync filters from URL params
  useEffect(() => {
    const parsed = parseFiltersFromSearch(searchParams);
    setFilters(parsed);
  }, [searchParams]);

  const handleOpenFilters = useCallback(() => {
    setFilterOpen(true);
  }, []);

  const handleApplyFilters = useCallback(() => {
    const normalized = normalizeDraft(filterDraft);
    setFilters(normalized);
    const nextParams = updateSearchParamsWithFilters(searchParams, normalized);
    setSearchParams(nextParams, { replace: true });
    setFilterOpen(false);
  }, [filterDraft, searchParams, setSearchParams]);

  const handleResetFilters = useCallback(() => {
    setFilterDraft(filtersToDraft(DEFAULT_FILTERS));
    setFilters(DEFAULT_FILTERS);
    const nextParams = updateSearchParamsWithFilters(
      searchParams,
      DEFAULT_FILTERS
    );
    setSearchParams(nextParams, { replace: true });
    setFilterOpen(false);
  }, [searchParams, setSearchParams]);

  const handleCloseFilters = useCallback(() => {
    setFilterOpen(false);
  }, []);

  return {
    filters,
    filterOpen,
    filterDraft,
    setFilterDraft,
    handlers: {
      handleOpenFilters,
      handleApplyFilters,
      handleResetFilters,
      handleCloseFilters,
    },
  };
}
