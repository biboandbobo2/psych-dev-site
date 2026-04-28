import { renderHighlightedText } from '../utils/highlight';

interface SearchMatch {
  key: string;
  rowId: string;
  columnId: string;
  count: number;
  preview: string;
}

interface SearchResultsPanelProps {
  matches: SearchMatch[];
  rowLabels: Map<string, string>;
  columnLabels: Map<string, string>;
  normalizedSearch: string;
  onOpenCell: (rowId: string, columnId: string) => void;
}

export function SearchResultsPanel({
  matches,
  rowLabels,
  columnLabels,
  normalizedSearch,
  onOpenCell,
}: SearchResultsPanelProps) {
  return (
    <section className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5">
      <div className="mb-1.5 text-xs font-semibold text-emerald-900">
        Найдено пересечений: {matches.length}
      </div>
      {matches.length === 0 ? (
        <p className="text-xs text-emerald-800">По текущим фильтрам совпадений нет.</p>
      ) : (
        <div className="grid max-h-36 grid-cols-1 gap-1.5 overflow-auto sm:grid-cols-2">
          {matches.map((match) => (
            <button
              key={match.key}
              type="button"
              onClick={() => onOpenCell(match.rowId, match.columnId)}
              className="rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-left transition hover:border-emerald-400 hover:bg-emerald-50"
            >
              <p className="text-xs font-semibold text-emerald-900">
                {rowLabels.get(match.rowId) ?? match.rowId} ×{' '}
                {columnLabels.get(match.columnId) ?? match.columnId}
              </p>
              <p className="mt-1 text-xs text-slate-700">
                {renderHighlightedText(match.preview, normalizedSearch)}
              </p>
              {match.count > 1 && (
                <p className="mt-1 text-[10px] font-medium text-emerald-700">
                  +{match.count - 1} ещё в этом пересечении
                </p>
              )}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export function TrackLegend() {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
      <span className="font-semibold text-slate-600">Цвета заметок:</span>
      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-slate-700">
        Без цвета
      </span>
      <span className="rounded-full bg-sky-100 px-2.5 py-0.5 font-medium text-sky-800">
        Патопсихология
      </span>
      <span className="rounded-full bg-fuchsia-100 px-2.5 py-0.5 font-medium text-fuchsia-800">
        Психиатрия
      </span>
    </div>
  );
}

interface ActiveFiltersChipsProps {
  searchQuery: string;
  hasActiveSearch: boolean;
  activeColumnIds: string[];
  activeRowIds: string[];
  rowLabels: Map<string, string>;
  columnLabels: Map<string, string>;
}

export function ActiveFiltersChips({
  searchQuery,
  hasActiveSearch,
  activeColumnIds,
  activeRowIds,
  rowLabels,
  columnLabels,
}: ActiveFiltersChipsProps) {
  return (
    <div className="flex flex-wrap gap-1.5 text-[11px]">
      {hasActiveSearch && (
        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 font-medium text-amber-700">
          Поиск: {searchQuery.trim()}
        </span>
      )}
      {activeColumnIds.map((columnId) => (
        <span
          key={`active-column-${columnId}`}
          className="rounded-full bg-blue-50 px-2.5 py-0.5 font-medium text-blue-700"
        >
          {columnLabels.get(columnId) ?? columnId}
        </span>
      ))}
      {activeRowIds.map((rowId) => (
        <span
          key={`active-row-${rowId}`}
          className="rounded-full bg-teal-50 px-2.5 py-0.5 font-medium text-teal-700"
        >
          {rowLabels.get(rowId) ?? rowId}
        </span>
      ))}
    </div>
  );
}
