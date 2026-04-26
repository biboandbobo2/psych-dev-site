import type { Group } from '../../../../types/groups';
import { addMonths, formatMonthYearRu } from '../../../../lib/calendarGrid';

export const ALL_GROUPS_VALUE = '__all__';

interface CalendarToolbarProps {
  monthDate: Date;
  onMonthChange: (next: Date) => void;
  groups: Group[];
  selectedGroupId: string;
  onGroupChange: (groupId: string) => void;
  onCreateClick: () => void;
}

export function CalendarToolbar({
  monthDate,
  onMonthChange,
  groups,
  selectedGroupId,
  onGroupChange,
  onCreateClick,
}: CalendarToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white p-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onMonthChange(addMonths(monthDate, -1))}
          aria-label="Предыдущий месяц"
          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm hover:bg-gray-50"
        >
          ←
        </button>
        <button
          type="button"
          onClick={() => onMonthChange(new Date())}
          className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
          title="К текущему месяцу"
        >
          Сегодня
        </button>
        <button
          type="button"
          onClick={() => onMonthChange(addMonths(monthDate, 1))}
          aria-label="Следующий месяц"
          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm hover:bg-gray-50"
        >
          →
        </button>
        <h2 className="ml-2 text-base font-semibold text-[#2C3E50]">
          {formatMonthYearRu(monthDate)}
        </h2>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-xs uppercase tracking-wide text-[#8A97AB]">
            Группа
          </span>
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
