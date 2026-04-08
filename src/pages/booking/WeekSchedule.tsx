import { useMemo } from 'react';
import type { Room } from './types';
import type { BusyBlock } from './useWeekSchedule';

interface WeekScheduleProps {
  rooms: Room[];
  weekDates: string[];
  busy: Map<string, BusyBlock[]>;
  loading: boolean;
  onSlotClick: (room: Room, date: string, time: string) => void;
}

const DAY_LABELS = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
const MONTH_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const START_HOUR = 8;
const END_HOUR = 22;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const ROW_HEIGHT = 48; // px per hour
const TOTAL_HEIGHT = TOTAL_HOURS * ROW_HEIGHT;

function formatDateHeader(date: string): { day: string; label: string } {
  const d = new Date(date + 'T00:00:00');
  const dayOfWeek = (d.getDay() + 6) % 7;
  return { day: DAY_LABELS[dayOfWeek], label: `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}` };
}

function blockToPosition(block: BusyBlock): { top: number; height: number } | null {
  const d = new Date(block.start);
  const hours = d.getHours() + d.getMinutes() / 60;
  const startOffset = hours - START_HOUR;
  const durationHours = block.lengthSeconds / 3600;
  if (startOffset + durationHours <= 0 || startOffset >= TOTAL_HOURS) return null;
  const top = Math.max(0, startOffset) * ROW_HEIGHT;
  const bottom = Math.min(TOTAL_HOURS, startOffset + durationHours) * ROW_HEIGHT;
  return { top, height: bottom - top };
}

function timeFromClick(yPx: number): string {
  const hours = START_HOUR + yPx / ROW_HEIGHT;
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60 / 30) * 30;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function isPastHour(date: string, hour: number): boolean {
  const now = Date.now();
  const t = new Date(`${date}T${String(hour).padStart(2, '0')}:00:00+04:00`).getTime();
  return t < now;
}

export function WeekSchedule({ rooms, weekDates, busy, loading, onSlotClick }: WeekScheduleProps) {
  const hours = useMemo(() => {
    const arr: number[] = [];
    for (let h = START_HOUR; h < END_HOUR; h++) arr.push(h);
    return arr;
  }, []);

  if (loading) {
    return (
      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-dom-gray-900">Расписание на неделю</h2>
          </div>
          <div className="h-64 bg-dom-gray-200 animate-pulse rounded-2xl" />
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-dom-gray-900">Расписание на неделю</h2>
          <p className="mt-2 text-dom-gray-500">Нажмите на свободный слот чтобы забронировать</p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-dom-gray-200 shadow-brand">
          <div className="min-w-[900px]">
            {/* Header: days */}
            <div className="flex bg-dom-cream border-b border-dom-gray-200">
              <div className="w-14 flex-shrink-0" />
              {weekDates.map((date, di) => {
                const { day, label } = formatDateHeader(date);
                return (
                  <div
                    key={date}
                    className={`flex-1 py-3 text-center ${di < weekDates.length - 1 ? 'border-r border-dom-gray-200' : ''}`}
                  >
                    <div className="text-xs font-bold text-dom-gray-900">{day}</div>
                    <div className="text-xs text-dom-gray-500">{label}</div>
                  </div>
                );
              })}
            </div>

            {/* Grid body */}
            <div className="flex">
              {/* Time labels */}
              <div className="w-14 flex-shrink-0 relative" style={{ height: TOTAL_HEIGHT }}>
                {hours.map((h) => (
                  <div
                    key={h}
                    className="absolute right-2 text-xs text-dom-gray-500 font-medium leading-none"
                    style={{ top: (h - START_HOUR) * ROW_HEIGHT - 5 }}
                  >
                    {`${String(h).padStart(2, '0')}:00`}
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {weekDates.map((date, di) => (
                <div
                  key={date}
                  className={`flex-1 flex ${di < weekDates.length - 1 ? 'border-r border-dom-gray-200' : ''}`}
                >
                  {rooms.map((room) => {
                    const key = `${room.id}:${date}`;
                    const blocks = busy.get(key) || [];
                    return (
                      <div
                        key={room.id}
                        className="flex-1 relative"
                        style={{ height: TOTAL_HEIGHT }}
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const y = e.clientY - rect.top;
                          const time = timeFromClick(y);
                          const h = parseInt(time.split(':')[0], 10);
                          if (!isPastHour(date, h)) {
                            onSlotClick(room, date, time);
                          }
                        }}
                      >
                        {/* Hour lines */}
                        {hours.map((h) => (
                          <div
                            key={h}
                            className="absolute left-0 right-0 border-t border-dom-gray-200/60"
                            style={{ top: (h - START_HOUR) * ROW_HEIGHT }}
                          />
                        ))}

                        {/* Past overlay */}
                        {(() => {
                          const now = new Date();
                          const dateStart = new Date(`${date}T${String(START_HOUR).padStart(2, '0')}:00:00+04:00`).getTime();
                          const dateEnd = new Date(`${date}T${String(END_HOUR).padStart(2, '0')}:00:00+04:00`).getTime();
                          const nowMs = now.getTime();
                          if (nowMs <= dateStart) return null;
                          if (nowMs >= dateEnd) {
                            return <div className="absolute inset-0 bg-dom-gray-200/20 pointer-events-none" />;
                          }
                          const pastH = (nowMs - dateStart) / (3600 * 1000) * ROW_HEIGHT;
                          return <div className="absolute left-0 right-0 top-0 bg-dom-gray-200/20 pointer-events-none" style={{ height: pastH }} />;
                        })()}

                        {/* Busy blocks */}
                        {blocks.map((block, bi) => {
                          const pos = blockToPosition(block);
                          if (!pos) return null;
                          return (
                            <div
                              key={bi}
                              className="absolute left-0.5 right-0.5 rounded-sm pointer-events-none"
                              style={{
                                top: pos.top,
                                height: Math.max(pos.height - 1, 2),
                                backgroundColor: room.color,
                                opacity: 0.5,
                              }}
                            />
                          );
                        })}

                        {/* Hover cursor for free areas */}
                        <div className="absolute inset-0 hover:bg-dom-green/5 transition-colors cursor-pointer" />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-4 text-xs text-dom-gray-500">
          {rooms.map((room) => (
            <div key={room.id} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm opacity-50" style={{ backgroundColor: room.color }} />
              {room.name.replace(' кабинет', '')}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
