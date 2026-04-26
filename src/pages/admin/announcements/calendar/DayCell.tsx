import type { GroupEvent } from '../../../../types/groupFeed';
import type { CalendarMonthDay } from '../../../../lib/calendarGrid';
import { ItemBadge } from './ItemBadge';

interface DayCellProps {
  day: CalendarMonthDay;
  events: GroupEvent[];
  /** Возвращает класс акцента для конкретной группы (для multi-group color-coding). */
  getGroupAccent?: (groupId: string) => string | undefined;
  onCreateClick: (date: Date) => void;
  onItemClick: (item: GroupEvent) => void;
}

export function DayCell({
  day,
  events,
  getGroupAccent,
  onCreateClick,
  onItemClick,
}: DayCellProps) {
  const dimClass = day.isCurrentMonth ? '' : 'opacity-50';
  const todayClass = day.isToday
    ? 'border-indigo-500 bg-indigo-50/30'
    : 'border-gray-200 bg-white';

  return (
    <div
      className={`relative flex min-h-[88px] flex-col rounded-md border p-1 ${todayClass} ${dimClass}`}
    >
      <div className="flex items-start justify-between">
        <span
          className={`text-xs font-semibold ${
            day.isToday ? 'text-indigo-700' : 'text-[#2C3E50]'
          }`}
        >
          {day.dayOfMonth}
        </span>
      </div>
      <div className="mt-1 space-y-0.5 overflow-hidden">
        {events.slice(0, 4).map((ev) => (
          <ItemBadge
            key={ev.id}
            event={ev}
            groupAccentClass={getGroupAccent?.(ev.groupId)}
            onClick={() => onItemClick(ev)}
          />
        ))}
        {events.length > 4 && (
          <div className="text-[10px] text-gray-500">
            +{events.length - 4} ещё
          </div>
        )}
      </div>
      {/* Невидимый overlay-кнопка для создания при клике в пустое место — рендерим только если в дне 0 событий, чтобы не блокировать клики по ItemBadge */}
      {events.length === 0 && (
        <button
          type="button"
          onClick={() => onCreateClick(day.date)}
          aria-label={`Создать на ${day.isoDate}`}
          className="absolute inset-0 cursor-pointer rounded-md hover:bg-[#F4F9FF]"
        />
      )}
    </div>
  );
}
