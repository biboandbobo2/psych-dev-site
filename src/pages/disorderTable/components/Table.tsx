import type { CSSProperties } from 'react';
import {
  buildDisorderTableCellKey,
  type DisorderTableColumn,
  type DisorderTableEntry,
  type DisorderTableFilters,
  type DisorderTableRow,
} from '../../../features/disorderTable';
import { Cell } from './Cell';

const TEXT_CLAMP_STYLE: CSSProperties = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
};

interface TableProps {
  loading: boolean;
  isMobile: boolean;
  displayedRows: readonly DisorderTableRow[];
  displayedColumns: readonly DisorderTableColumn[];
  draftFilters: DisorderTableFilters;
  activeFilters: DisorderTableFilters;
  matrix: Map<string, DisorderTableEntry[]>;
  selectedCellKeys: Set<string>;
  isCellSelectionMode: boolean;
  commentCountByEntryId: Map<string, number>;
  normalizedSearch: string;
  filteredEntriesCount: number;
  totalEntriesCount: number;
  onToggleColumnFilter: (columnId: string) => void;
  onToggleRowFilter: (rowId: string) => void;
  onCellClick: (rowId: string, columnId: string) => void;
}

export function Table({
  loading,
  isMobile,
  displayedRows,
  displayedColumns,
  draftFilters,
  activeFilters,
  matrix,
  selectedCellKeys,
  isCellSelectionMode,
  commentCountByEntryId,
  normalizedSearch,
  filteredEntriesCount,
  totalEntriesCount,
  onToggleColumnFilter,
  onToggleRowFilter,
  onCellClick,
}: TableProps) {
  return (
    <section className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex h-full flex-col">
        <div className="shrink-0 border-b border-slate-200 px-4 py-2 text-xs text-slate-600 sm:text-sm">
          Показано записей:{' '}
          <span className="font-semibold text-slate-900">{filteredEntriesCount}</span> из{' '}
          {totalEntriesCount}
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-600">
            Загрузка таблицы...
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto">
            <table
              className={`${isMobile ? 'min-w-[980px]' : 'w-full'} table-fixed border-collapse`}
            >
              <thead>
                <tr className="bg-slate-100">
                  <th className="w-56 border-b border-r border-slate-200 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Функции / Типы расстройств
                  </th>
                  {displayedColumns.map((column) => {
                    const inDraft = draftFilters.columnIds.includes(column.id);
                    const inActive = activeFilters.columnIds.includes(column.id);
                    return (
                      <th
                        key={column.id}
                        className="border-b border-r border-slate-200 px-1.5 py-1.5 text-left"
                      >
                        <button
                          type="button"
                          onClick={() => onToggleColumnFilter(column.id)}
                          className={`w-full rounded px-2 py-1.5 text-left text-[11px] font-semibold transition ${
                            inDraft
                              ? inActive
                                ? 'bg-blue-100 text-blue-900'
                                : 'bg-amber-50 text-amber-900'
                              : inActive
                                ? 'bg-blue-50 text-blue-800'
                                : 'text-blue-900 hover:bg-blue-50'
                          }`}
                          title={column.label}
                        >
                          <span style={TEXT_CLAMP_STYLE}>{column.label}</span>
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {displayedRows.map((row) => {
                  const inDraft = draftFilters.rowIds.includes(row.id);
                  const inActive = activeFilters.rowIds.includes(row.id);

                  return (
                    <tr key={row.id} className="align-top">
                      <th className="border-b border-r border-slate-200 bg-white px-1.5 py-1.5 text-left">
                        <button
                          type="button"
                          onClick={() => onToggleRowFilter(row.id)}
                          className={`w-full rounded px-2 py-1.5 text-left text-[11px] font-semibold transition ${
                            inDraft
                              ? inActive
                                ? 'bg-teal-100 text-teal-900'
                                : 'bg-amber-50 text-amber-900'
                              : inActive
                                ? 'bg-teal-50 text-teal-800'
                                : 'text-teal-900 hover:bg-teal-50'
                          }`}
                          title={row.label}
                        >
                          <span style={TEXT_CLAMP_STYLE}>{row.label}</span>
                        </button>
                      </th>

                      {displayedColumns.map((column) => {
                        const key = buildDisorderTableCellKey(row.id, column.id);
                        const cellEntries = matrix.get(key) ?? [];
                        const isSelected = selectedCellKeys.has(key);
                        const cellCommentCount = cellEntries.reduce(
                          (sum, entry) => sum + (commentCountByEntryId.get(entry.id) ?? 0),
                          0,
                        );

                        return (
                          <Cell
                            key={key}
                            rowId={row.id}
                            columnId={column.id}
                            cellEntries={cellEntries}
                            cellCommentCount={cellCommentCount}
                            isSelected={isSelected}
                            isCellSelectionMode={isCellSelectionMode}
                            isMobile={isMobile}
                            normalizedSearch={normalizedSearch}
                            onClick={onCellClick}
                          />
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
