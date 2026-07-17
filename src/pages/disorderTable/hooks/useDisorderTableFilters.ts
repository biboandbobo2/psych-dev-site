import { useMemo, useState } from 'react';
import { buildDisorderTableFilters } from '../../../features/disorderTable';
import { areSameSelections } from '../utils/highlight';

interface UseDisorderTableFiltersParams {
  /** Вызывается при применении/сбросе фильтров (сброс выбора ячеек, как в исходном поведении). */
  onFiltersCommitted: () => void;
}

export function useDisorderTableFilters({ onFiltersCommitted }: UseDisorderTableFiltersParams) {
  const [activeFilterRowIds, setActiveFilterRowIds] = useState<string[]>([]);
  const [activeFilterColumnIds, setActiveFilterColumnIds] = useState<string[]>([]);
  const [draftFilterRowIds, setDraftFilterRowIds] = useState<string[]>([]);
  const [draftFilterColumnIds, setDraftFilterColumnIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const activeFilters = useMemo(
    () => buildDisorderTableFilters(activeFilterRowIds, activeFilterColumnIds),
    [activeFilterRowIds, activeFilterColumnIds],
  );
  const draftFilters = useMemo(
    () => buildDisorderTableFilters(draftFilterRowIds, draftFilterColumnIds),
    [draftFilterRowIds, draftFilterColumnIds],
  );

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const hasActiveFilters = activeFilters.rowIds.length > 0 || activeFilters.columnIds.length > 0;
  const hasActiveSearch = normalizedSearch.length > 0;
  const canApplyFilters =
    !areSameSelections(draftFilters.rowIds, activeFilters.rowIds) ||
    !areSameSelections(draftFilters.columnIds, activeFilters.columnIds);

  const toggleDraftRowFilter = (rowId: string) => {
    setDraftFilterRowIds((prev) =>
      prev.includes(rowId) ? prev.filter((item) => item !== rowId) : [...prev, rowId],
    );
  };

  const toggleDraftColumnFilter = (columnId: string) => {
    setDraftFilterColumnIds((prev) =>
      prev.includes(columnId) ? prev.filter((item) => item !== columnId) : [...prev, columnId],
    );
  };

  const applyDraftFilters = () => {
    const next = buildDisorderTableFilters(draftFilterRowIds, draftFilterColumnIds);
    setActiveFilterRowIds(next.rowIds);
    setActiveFilterColumnIds(next.columnIds);
    onFiltersCommitted();
  };

  const clearAllFilters = () => {
    setActiveFilterRowIds([]);
    setActiveFilterColumnIds([]);
    setDraftFilterRowIds([]);
    setDraftFilterColumnIds([]);
    setSearchQuery('');
    onFiltersCommitted();
  };

  return {
    activeFilters,
    draftFilters,
    searchQuery,
    setSearchQuery,
    normalizedSearch,
    hasActiveFilters,
    hasActiveSearch,
    canApplyFilters,
    toggleDraftRowFilter,
    toggleDraftColumnFilter,
    applyDraftFilters,
    clearAllFilters,
  };
}
