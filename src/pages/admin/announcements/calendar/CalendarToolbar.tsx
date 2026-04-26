import type { Group } from '../../../../types/groups';
import {
  addDays,
  addMonths,
  formatMonthYearRu,
  formatWeekRangeRu,
} from '../../../../lib/calendarGrid';

export const ALL_GROUPS_VALUE = '__all__';

export type CalendarView = 'month' | 'week';

interface CalendarToolbarProps {
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  cursorDate: Date;
  onCursorChange: (next: Date) => void;
  groups: Group[];
  selectedGroupId: string;
  onGroupChange: (groupId: string) => void;
  onCreateClick: () => void;
}

export function CalendarToolbar({
  view,
  onViewChange,
  cursorDate,
  onCursorChange,
  groups,
  selectedGroupId,
  onGroupChange,
  onCreateClick,
}: CalendarToolbarProps) {
  const goPrev = () =>
    onCursorChange(view === 'month' ? addMonths(cursorDate, -1) : addDays(cursorDate, -7));
  const goNext = () =>
    onCursorChange(view === 'month' ? addMonths(cursorDate, 1) : addDays(cursorDate, 7));
  const label =
    view === 'month' ? formatMonthYearRu(cursorDate) : formatWeekRangeRu(cursorDate);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white p-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={goPrev}
          aria-label={view === 'month' ? 'Предыдущий месяц' : 'Предыдущая неделя'}
          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm hover:bg-gray-50"
        >
          ←
        </button>
        <button
          type="button"
          onClick={() => onCursorChange(new Date())}
          className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
          title="К текущему дню"
        >
          Сегодня
        </button>
        <button
          type="button"
          onClick={goNext}
          aria-label={view === 'month' ? 'Следующий месяц' : 'Следующая неделя'}
          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm hover:bg-gray-50"
        >
          →
        </button>
        <h2 className="ml-2 text-base font-semibold text-[#2C3E50]">{label}</h2>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-md bg-gray-50 p-1">
          {(['month', 'week'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onViewChange(v)}
              className={`rounded px-2.5 py-1 text-xs transition ${
                view === v ? 'bg-white shadow-sm' : 'text-gray-600 hover:bg-white/60'
              }`}
            >
              {v === 'month' ? 'Месяц' : 'Неделя'}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-xs uppercase tracking-wide text-[#8A97AB]">Группа</span>
          <select
            value={selectedGroupId}
            onChange={(e) => onGroupChange(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
          >
            <option value={ALL_GROUPS_VALUE}>Все группы</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={onCreateClick}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700"
        >
          ＋ Создать
        </button>
      </div>
    </div>
  );
}
