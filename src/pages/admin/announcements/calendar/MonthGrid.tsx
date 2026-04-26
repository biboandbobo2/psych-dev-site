import { useMemo } from 'react';
import type { GroupEvent } from '../../../../types/groupFeed';
import { buildMonthGrid, groupItemsByDate } from '../../../../lib/calendarGrid';
import { DayCell } from './DayCell';

interface MonthGridProps {
  monthDate: Date;
  events: GroupEvent[];
  getGroupAccent?: (groupId: string) => string | undefined;
  onCreateClick: (date: Date) => void;
  onItemClick: (item: GroupEvent) => void;
}

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export function MonthGrid({
  monthDate,
  events,
  getGroupAccent,
  onCreateClick,
  onItemClick,
}: MonthGridProps) {
  const days = useMemo(() => buildMonthGrid(monthDate), [monthDate]);
  const byDate = useMemo(
    () =>
      groupItemsByDate(events, (ev) => {
        if (ev.kind === 'assignment') {
          if (!ev.dueDate) return null;
          // ISO YYYY-MM-DD → местная полночь
          const [y, m, d] = ev.dueDate.split('-').map((s) => Number(s));
          if (!y || !m || !d) return null;
          return new Date(y, m - 1, d);
        }
        const startMs = ev.startAt?.toMillis?.();
        if (typeof startMs === 'number') return new Date(startMs);
        return null;
      }),
    [events]
  );

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="px-1 py-1 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-500"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => (
          <div key={day.isoDate} className="group/cell">
            <DayCell
              day={day}
              events={byDate.get(day.isoDate) ?? []}
              getGroupAccent={getGroupAccent}
              onCreateClick={onCreateClick}
              onItemClick={onItemClick}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
