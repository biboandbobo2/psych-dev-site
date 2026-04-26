import { useMemo } from 'react';
import type { GroupEvent } from '../../../../types/groupFeed';
import { buildWeekGrid, groupItemsByDate } from '../../../../lib/calendarGrid';
import { DayCell } from './DayCell';

interface WeekGridProps {
  /** Любая дата внутри недели — берётся понедельник этой недели. */
  weekDate: Date;
  events: GroupEvent[];
  getGroupAccent?: (groupId: string) => string | undefined;
  onCreateClick: (date: Date) => void;
  onItemClick: (item: GroupEvent) => void;
}

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export function WeekGrid({
  weekDate,
  events,
  getGroupAccent,
  onCreateClick,
  onItemClick,
}: WeekGridProps) {
  const days = useMemo(() => buildWeekGrid(weekDate), [weekDate]);
  const byDate = useMemo(
    () =>
      groupItemsByDate(events, (ev) => {
        if (ev.kind === 'assignment') {
          if (!ev.dueDate) return null;
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
        {days.map((day, idx) => (
          <div
            key={day.isoDate}
            className="px-1 py-1 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-500"
          >
            {WEEKDAY_LABELS[idx]}{' '}
            <span className={day.isToday ? 'text-indigo-700' : ''}>
              {day.dayOfMonth}
            </span>
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
