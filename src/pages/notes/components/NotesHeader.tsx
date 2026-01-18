import { PERIOD_FILTER_GROUPS } from '../../../utils/periodConfig';
import { ExportNotesButton } from '../../../components/ExportNotesButton';
import { Emoji, EmojiText } from '../../../components/Emoji';
import type { AgeRange, Note } from '../../types/notes';
import type { SortOption } from '../../utils/sortNotes';

interface NotesHeaderProps {
  selectedPeriod: 'all' | AgeRange;
  onPeriodChange: (value: 'all' | AgeRange) => void;
  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onClearSearch: () => void;
  showStats: boolean;
  onToggleStats: () => void;
  onCreate: () => void;
  notesForExport: Note[];
}

export function NotesHeader({
  selectedPeriod,
  onPeriodChange,
  sortBy,
  onSortChange,
  searchQuery,
  onSearchQueryChange,
  onClearSearch,
  showStats,
  onToggleStats,
  onCreate,
  notesForExport,
}: NotesHeaderProps) {
  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-fg">
          <EmojiText text="📝 Мои заметки" />
        </h1>
        <button
          onClick={onCreate}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 sm:w-48"
        >
          <span className="text-lg">＋</span>
          <span>Новая заметка</span>
        </button>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <select
          value={selectedPeriod}
          onChange={(event) => onPeriodChange(event.target.value as 'all' | AgeRange)}
          className="w-full rounded-lg border border-border bg-card px-4 py-2 text-sm text-fg shadow-sm focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/30 sm:flex-1"
        >
          <option value="all">Все возрастные периоды</option>
          {PERIOD_FILTER_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(event) => onSortChange(event.target.value as SortOption)}
          className="w-full rounded-lg border border-border bg-card px-4 py-2 text-sm text-fg shadow-sm focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/30 sm:w-48"
        >
          <option value="date-new">Сначала новые</option>
          <option value="date-old">Сначала старые</option>
          <option value="period">По периодам</option>
        </select>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-1 sm:items-center">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Поиск по заметкам..."
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              className="w-full rounded-lg border border-border bg-card px-4 py-2 pl-10 text-sm text-fg shadow-sm focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
              <Emoji token="🔍" size={14} />
            </span>
            {searchQuery ? (
              <button
                onClick={onClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition hover:text-fg"
                aria-label="Очистить поиск"
              >
                ✕
              </button>
            ) : null}
          </div>
          <button
            onClick={onToggleStats}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-fg shadow-sm transition hover:bg-card2"
          >
            <Emoji token="📊" size={16} />
            <span className="hidden sm:inline">Статистика</span>
            <span className="text-xs">{showStats ? '▲' : '▼'}</span>
          </button>
        </div>
        <div className="w-full sm:w-48">
          <ExportNotesButton notes={notesForExport} />
        </div>
      </div>
    </>
  );
}
