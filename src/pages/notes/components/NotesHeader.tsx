import { ExportNotesButton } from '../../../components/ExportNotesButton';
import { SELECT_CHEVRON_CLASS, SELECT_CHEVRON_STYLE } from '../../../components/ui/selectChevron';
import type { Note } from '../../../types/notes';
import type { SortOption } from '../../../utils/sortNotes';

interface NotesHeaderProps {
  lessons: Array<{
    periodKey: string;
    periodTitle: string;
  }>;
  selectedPeriod: 'all' | string;
  onPeriodChange: (value: 'all' | string) => void;
  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onClearSearch: () => void;
  onCreate: () => void;
  notesForExport: Note[];
  /** Строка под заголовком: «4 заметки · 2 занятия»; пустая — не рендерится. */
  summary: string;
}

const CONTROL_CLASS =
  'w-full rounded-lg border border-border bg-card px-4 py-2 text-sm text-fg shadow-sm focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/30';

export function NotesHeader({
  lessons,
  selectedPeriod,
  onPeriodChange,
  sortBy,
  onSortChange,
  searchQuery,
  onSearchQueryChange,
  onClearSearch,
  onCreate,
  notesForExport,
  summary,
}: NotesHeaderProps) {
  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-fg">📝 Мои заметки</h1>
          {summary ? <p className="mt-1 text-sm text-muted">{summary}</p> : null}
        </div>
        <div className="flex gap-2">
          <div className="flex-1 sm:w-36 sm:flex-none">
            <ExportNotesButton notes={notesForExport} />
          </div>
          <button
            onClick={onCreate}
            className="inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white transition hover:bg-accent-deep sm:flex-none"
          >
            <span className="text-lg leading-none">＋</span>
            <span>Новая заметка</span>
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          value={selectedPeriod}
          onChange={(event) => onPeriodChange(event.target.value as 'all' | string)}
          className={`${CONTROL_CLASS} ${SELECT_CHEVRON_CLASS} sm:flex-1`}
          style={SELECT_CHEVRON_STYLE}
          aria-label="Занятие"
        >
          <option value="all">Все занятия курса</option>
          {lessons.map((lesson) => (
            <option key={lesson.periodKey} value={lesson.periodKey}>
              {lesson.periodTitle}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(event) => onSortChange(event.target.value as SortOption)}
          className={`${CONTROL_CLASS} ${SELECT_CHEVRON_CLASS} sm:w-44`}
          style={SELECT_CHEVRON_STYLE}
          aria-label="Сортировка"
        >
          <option value="date-new">Сначала новые</option>
          <option value="date-old">Сначала старые</option>
          <option value="period">По занятиям</option>
        </select>

        <div className="relative sm:w-64">
          <input
            type="text"
            placeholder="Поиск по заметкам..."
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            className={`${CONTROL_CLASS} pl-10`}
          />
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">🔍</span>
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
      </div>
    </>
  );
}
