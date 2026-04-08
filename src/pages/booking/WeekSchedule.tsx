import { useState, useMemo, useCallback } from 'react';
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
const ROW_HEIGHT = 40;
const TOTAL_HEIGHT = TOTAL_HOURS * ROW_HEIGHT;
const HALF_HOUR_PX = ROW_HEIGHT / 2;

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

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

function yToTime(yPx: number): string {
  const totalMinutes = (yPx / ROW_HEIGHT) * 60 + START_HOUR * 60;
  const snapped = Math.floor(totalMinutes / 30) * 30;
  const h = Math.floor(snapped / 60);
  const m = snapped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function yToHourSlot(yPx: number): number {
  return Math.floor(yPx / ROW_HEIGHT);
}

function isBusyAt(time: string, date: string, blocks: BusyBlock[]): boolean {
  const slotStart = new Date(`${date}T${time}:00+04:00`).getTime();
  const slotEnd = slotStart + 30 * 60 * 1000;
  for (const b of blocks) {
    const busyStart = new Date(b.start).getTime();
    const busyEnd = busyStart + b.lengthSeconds * 1000;
    if (slotStart < busyEnd && slotEnd > busyStart) return true;
  }
  return false;
}

function getNowLineTop(): number | null {
  const now = new Date();
  const hours = now.getHours() + now.getMinutes() / 60;
  const offset = hours - START_HOUR;
  if (offset < 0 || offset >= TOTAL_HOURS) return null;
  return offset * ROW_HEIGHT;
}

export function WeekSchedule({ rooms, weekDates, busy, loading, onSlotClick }: WeekScheduleProps) {
  const hours = useMemo(() => {
    const arr: number[] = [];
    for (let h = START_HOUR; h < END_HOUR; h++) arr.push(h);
    return arr;
  }, []);

  const today = useMemo(() => todayStr(), []);
  const [hover, setHover] = useState<{ roomId: string; date: string; hourSlot: number } | null>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>, roomId: string, date: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    setHover({ roomId, date, hourSlot: yToHourSlot(y) });
  }, []);

  const handleMouseLeave = useCallback(() => setHover(null), []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>, room: Room, date: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const time = yToTime(y);
    const key = `${room.id}:${date}`;
    const blocks = busy.get(key) || [];
    if (!isBusyAt(time, date, blocks)) {
      onSlotClick(room, date, time);
    }
  }, [busy, onSlotClick]);

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
          <p className="mt-2 text-dom-gray-500">Нажмите на свободное время чтобы забронировать</p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-dom-gray-200 shadow-brand">
          <div className="min-w-[900px]">
            {/* Header */}
            <div className="flex bg-dom-cream border-b border-dom-gray-200">
              <div className="w-14 flex-shrink-0" />
              {weekDates.map((date, di) => {
                const { day, label } = formatDateHeader(date);
                const isToday = date === today;
                return (
                  <div
                    key={date}
                    className={`flex-1 py-3 text-center ${di < weekDates.length - 1 ? 'border-r border-dom-gray-200' : ''} ${isToday ? 'bg-dom-green/8' : ''}`}
                  >
                    <div className={`text-xs font-bold ${isToday ? 'text-dom-green' : 'text-dom-gray-900'}`}>{day}</div>
                    <div className={`text-xs ${isToday ? 'text-dom-green' : 'text-dom-gray-500'}`}>{label}</div>
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
              {weekDates.map((date, di) => {
                const isToday = date === today;
                const nowTop = isToday ? getNowLineTop() : null;
                return (
                  <div
                    key={date}
                    className={`flex-1 flex ${di < weekDates.length - 1 ? 'border-r border-dom-gray-200' : ''} ${isToday ? 'bg-dom-green/[0.03]' : ''}`}
                  >
                    {rooms.map((room) => {
                      const key = `${room.id}:${date}`;
                      const blocks = busy.get(key) || [];
                      const isHovered = hover?.roomId === room.id && hover?.date === date;
                      const hoverSlot = isHovered ? hover.hourSlot : -1;

                      return (
                        <div
                          key={room.id}
                          className="flex-1 relative"
                          style={{ height: TOTAL_HEIGHT }}
                          onMouseMove={(e) => handleMouseMove(e, room.id, date)}
                          onMouseLeave={handleMouseLeave}
                          onClick={(e) => handleClick(e, room, date)}
                        >
                          {/* Hour lines */}
                          {hours.map((h) => (
                            <div
                              key={h}
                              className="absolute left-0 right-0 border-t border-dom-gray-200/50"
                              style={{ top: (h - START_HOUR) * ROW_HEIGHT }}
                            />
                          ))}

                          {/* Past overlay */}
                          {(() => {
                            const dateStart = new Date(`${date}T${String(START_HOUR).padStart(2, '0')}:00:00+04:00`).getTime();
                            const dateEnd = new Date(`${date}T${String(END_HOUR).padStart(2, '0')}:00:00+04:00`).getTime();
                            const nowMs = Date.now();
                            if (nowMs <= dateStart) return null;
                            if (nowMs >= dateEnd) {
                              return <div className="absolute inset-0 bg-dom-gray-200/15 pointer-events-none" />;
                            }
                            const pastH = (nowMs - dateStart) / (3600 * 1000) * ROW_HEIGHT;
                            return <div className="absolute left-0 right-0 top-0 bg-dom-gray-200/15 pointer-events-none" style={{ height: pastH }} />;
                          })()}

                          {/* Now line (today only) */}
                          {nowTop !== null && (
                            <div className="absolute left-0 right-0 pointer-events-none z-10" style={{ top: nowTop }}>
                              <div className="h-0.5 bg-dom-red/60" />
                            </div>
                          )}

                          {/* Hover highlight — full hour block */}
                          {hoverSlot >= 0 && hoverSlot < TOTAL_HOURS && (
                            <div
                              className="absolute left-0 right-0 bg-dom-green/10 pointer-events-none rounded-sm border border-dom-green/20"
                              style={{ top: hoverSlot * ROW_HEIGHT, height: ROW_HEIGHT }}
                            />
                          )}

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
                                  height: Math.max(pos.height - 1, 4),
                                  backgroundColor: room.color,
                                  opacity: 0.65,
                                  borderLeft: `3px solid ${room.color}`,
                                }}
                              />
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-4 text-xs text-dom-gray-500">
          {rooms.map((room) => (
            <div key={room.id} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: room.color, opacity: 0.65 }} />
              {room.name.replace(' кабинет', '')}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
