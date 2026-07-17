import { useMemo } from 'react';
import {
  applyDisorderTableFilters,
  buildDisorderTableCellKey,
  buildDisorderTableFullMatrix,
  DISORDER_TABLE_COLUMNS,
  DISORDER_TABLE_ROWS,
  type DisorderTableCellSelection,
  type DisorderTableEntry,
  type DisorderTableFilters,
} from '../../../features/disorderTable';
import { buildPreviewText } from '../utils/highlight';

interface UseDisorderTableMatrixParams {
  entries: DisorderTableEntry[];
  activeFilters: DisorderTableFilters;
  normalizedSearch: string;
  hasActiveSearch: boolean;
  activeCell: DisorderTableCellSelection | null;
}

export function useDisorderTableMatrix({
  entries,
  activeFilters,
  normalizedSearch,
  hasActiveSearch,
  activeCell,
}: UseDisorderTableMatrixParams) {
  const selectionFilteredEntries = useMemo(
    () => applyDisorderTableFilters(entries, activeFilters),
    [entries, activeFilters],
  );

  const filteredEntries = useMemo(() => {
    if (!normalizedSearch) return selectionFilteredEntries;
    return selectionFilteredEntries.filter((entry) =>
      entry.text.toLowerCase().includes(normalizedSearch),
    );
  }, [selectionFilteredEntries, normalizedSearch]);

  const displayedRows = useMemo(
    () =>
      activeFilters.rowIds.length > 0
        ? DISORDER_TABLE_ROWS.filter((row) => activeFilters.rowIds.includes(row.id))
        : DISORDER_TABLE_ROWS,
    [activeFilters.rowIds],
  );
  const displayedColumns = useMemo(
    () =>
      activeFilters.columnIds.length > 0
        ? DISORDER_TABLE_COLUMNS.filter((column) => activeFilters.columnIds.includes(column.id))
        : DISORDER_TABLE_COLUMNS,
    [activeFilters.columnIds],
  );

  const matrix = useMemo(
    () =>
      buildDisorderTableFullMatrix(
        displayedRows.map((row) => row.id),
        displayedColumns.map((column) => column.id),
        filteredEntries,
      ),
    [displayedRows, displayedColumns, filteredEntries],
  );

  const activeCellEntries = useMemo(() => {
    if (!activeCell) return [];
    return matrix.get(buildDisorderTableCellKey(activeCell.rowId, activeCell.columnId)) ?? [];
  }, [activeCell, matrix]);

  const searchIntersectionMatches = useMemo(() => {
    if (!hasActiveSearch) return [];

    return displayedRows.flatMap((row) =>
      displayedColumns.flatMap((column) => {
        const key = buildDisorderTableCellKey(row.id, column.id);
        const cellEntries = matrix.get(key) ?? [];
        if (cellEntries.length === 0) return [];

        return [
          {
            key,
            rowId: row.id,
            columnId: column.id,
            count: cellEntries.length,
            preview: buildPreviewText(cellEntries[0].text, normalizedSearch, 100),
          },
        ];
      }),
    );
  }, [displayedRows, displayedColumns, matrix, hasActiveSearch, normalizedSearch]);

  return {
    filteredEntries,
    displayedRows,
    displayedColumns,
    matrix,
    activeCellEntries,
    searchIntersectionMatches,
  };
}
