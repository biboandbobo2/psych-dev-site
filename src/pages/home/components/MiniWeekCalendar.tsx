import { useMemo } from 'react';
import { toDateKey, type ParsedCalendarEvent } from '../homeHelpers';

interface MiniWeekCalendarProps {
  calendarEventsByDate: Map<string, ParsedCalendarEvent[]>;
  onSelectDate: (dateKey: string) => void;
  onOpen: () => void;
}

export function MiniWeekCalendar({
  calendarEventsByDate,
  onSelectDate,
  onOpen,
}: MiniWeekCalendarProps) {
  const days = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    const weekday = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
    const todayKey = toDateKey(today);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const key = toDateKey(d);
      return {
        n: d.getDate(),
        d: weekday[i],
        dateKey: key,
        isToday: key === todayKey,
      };
    });
  }, []);

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-brand">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-bold text-fg">Календарь</h3>
        <button
          type="button"
          onClick={onOpen}
          className="text-xs text-muted transition hover:text-accent"
        >
          Открыть →
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map((day) => {
          const hasEvents = calendarEventsByDate.has(day.dateKey);
          return (
            <button
              key={day.dateKey}
              type="button"
              onClick={() => onSelectDate(day.dateKey)}
              className="py-1 transition hover:opacity-80"
            >
              <div className="text-[10px] uppercase text-muted">{day.d}</div>
              <div
                className={`mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                  day.isToday ? 'bg-mark font-bold text-[#5a4b00]' : 'text-fg'
                }`}
              >
                {day.n}
              </div>
              <div
                className={`mx-auto mt-1 h-1.5 w-1.5 rounded-full ${
                  hasEvents ? 'bg-accent' : 'bg-transparent'
                }`}
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}
