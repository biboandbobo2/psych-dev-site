import { useState, useMemo, useCallback } from 'react';
import type { Room } from './types';
import { DURATION_OPTIONS } from './types';
import type { DurationOption } from './types';
import type { BusyBlock } from './useWeekSchedule';

interface WeekScheduleProps {
  rooms: Room[];
  weekDates: string[];
  busy: Map<string, BusyBlock[]>;
  loading: boolean;
  weekOffset: number;
  onWeekChange: (offset: number) => void;
  onSlotClick: (room: Room, date: string, time: string, duration: DurationOption) => void;
}

const DAY_LABELS = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
const MONTH_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const START_HOUR = 9;
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

function yToHalfHourSlot(yPx: number): number {
  return Math.floor(yPx / HALF_HOUR_PX);
}

function halfSlotToTime(slot: number): string {
  const totalMinutes = slot * 30 + START_HOUR * 60;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function isRangeOverlapping(startTime: string, durationMin: number, date: string, blocks: BusyBlock[]): boolean {
  const [sh, sm] = startTime.split(':').map(Number);
  const slotStart = new Date(`${date}T${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}:00+04:00`).getTime();
  const slotEnd = slotStart + durationMin * 60 * 1000;
  for (const b of blocks) {
    const busyStart = new Date(b.start).getTime();
    const busyEnd = busyStart + b.lengthSeconds * 1000;
    if (slotStart < busyEnd && slotEnd > busyStart) return true;
  }
  return false;
}

function slotFits(time: string, durationMin: number): boolean {
  const [h, m] = time.split(':').map(Number);
  const endMin = h * 60 + m + durationMin;
  return endMin <= END_HOUR * 60;
}

function getNowLineTop(): number | null {
  const now = new Date();
  const hours = now.getHours() + now.getMinutes() / 60;
  const offset = hours - START_HOUR;
  if (offset < 0 || offset >= TOTAL_HOURS) return null;
  return offset * ROW_HEIGHT;
}

function isTouchDevice(): boolean {
  return typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
}

interface MobileSelection {
  roomId: string;
  date: string;
  time: string;
  top: number;
}

export function WeekSchedule({ rooms, weekDates, busy, loading, weekOffset, onWeekChange, onSlotClick }: WeekScheduleProps) {
  const hours = useMemo(() => {
    const arr: number[] = [];
    for (let h = START_HOUR; h < END_HOUR; h++) arr.push(h);
    return arr;
  }, []);

  const today = useMemo(() => todayStr(), []);
  const [duration, setDuration] = useState<DurationOption>(DURATION_OPTIONS[0]);
  const [hover, setHover] = useState<{ roomId: string; date: string; halfSlot: number } | null>(null);
  const [mobileSelection, setMobileSelection] = useState<MobileSelection | null>(null);
  const isTouch = useMemo(() => isTouchDevice(), []);

  const durationPx = (duration.minutes / 60) * ROW_HEIGHT;
  const durationHalfSlots = duration.minutes / 30;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>, roomId: string, date: string) => {
    if (isTouch) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    setHover({ roomId, date, halfSlot: yToHalfHourSlot(y) });
  }, [isTouch]);

  const handleMouseLeave = useCallback(() => {
    if (!isTouch) setHover(null);
  }, [isTouch]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>, room: Room, date: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const halfSlot = yToHalfHourSlot(y);
    const time = halfSlotToTime(halfSlot);
    const slotMs = new Date(`${date}T${time}:00+04:00`).getTime();
    if (slotMs < Date.now()) return;
    if (!slotFits(time, duration.minutes)) return;
    const key = `${room.id}:${date}`;
    const blocks = busy.get(key) || [];
    if (isRangeOverlapping(time, duration.minutes, date, blocks)) return;

    if (isTouch) {
      // Mobile: first tap = select, show confirm button
      if (mobileSelection?.roomId === room.id && mobileSelection?.date === date && mobileSelection?.time === time) {
        // Second tap on same slot = book
        onSlotClick(room, date, time, duration);
        setMobileSelection(null);
      } else {
        setMobileSelection({ roomId: room.id, date, time, top: halfSlot * HALF_HOUR_PX });
      }
    } else {
      onSlotClick(room, date, time, duration);
    }
  }, [busy, onSlotClick, duration, isTouch, mobileSelection]);

  const handleMobileBook = useCallback(() => {
    if (!mobileSelection) return;
    const room = rooms.find((r) => r.id === mobileSelection.roomId);
    if (room) {
      onSlotClick(room, mobileSelection.date, mobileSelection.time, duration);
    }
    setMobileSelection(null);
  }, [mobileSelection, rooms, onSlotClick, duration]);

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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-1.5 w-[160px]">
            {DURATION_OPTIONS.map((opt) => (
              <button
                key={opt.minutes}
                onClick={() => { setDuration(opt); setMobileSelection(null); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${duration.minutes === opt.minutes ? 'bg-dom-green text-white border-dom-green' : 'bg-white text-dom-gray-700 border-dom-gray-200 hover:border-dom-green/40'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="text-center flex-1">
            <h2 className="text-2xl md:text-3xl font-bold text-dom-gray-900">Расписание</h2>
            <p className="mt-1 text-sm text-dom-gray-500">Нажмите на свободное время чтобы забронировать</p>
          </div>
          <div className="flex items-center gap-2 w-[160px] justify-end">
            <button onClick={() => onWeekChange(weekOffset - 1)} disabled={weekOffset <= 0}
              className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${weekOffset <= 0 ? 'border-dom-gray-200 text-dom-gray-300 cursor-not-allowed' : 'border-dom-gray-200 text-dom-gray-700 hover:border-dom-green/40 hover:text-dom-green'}`}
              aria-label="Предыдущая неделя">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button onClick={() => onWeekChange(weekOffset + 1)} disabled={weekOffset >= 3}
              className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${weekOffset >= 3 ? 'border-dom-gray-200 text-dom-gray-300 cursor-not-allowed' : 'border-dom-gray-200 text-dom-gray-700 hover:border-dom-green/40 hover:text-dom-green'}`}
              aria-label="Следующая неделя">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
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
                  <div key={date} className={`flex-1 py-3 text-center ${di < weekDates.length - 1 ? 'border-r border-dom-gray-200' : ''} ${isToday ? 'bg-dom-green/8' : ''}`}>
                    <div className={`text-xs font-bold ${isToday ? 'text-dom-green' : 'text-dom-gray-900'}`}>{day}</div>
                    <div className={`text-xs ${isToday ? 'text-dom-green' : 'text-dom-gray-500'}`}>{label}</div>
                  </div>
                );
              })}
            </div>

            {/* Grid body */}
            <div className="flex">
              <div className="w-14 flex-shrink-0 relative" style={{ height: TOTAL_HEIGHT }}>
                {hours.filter((h) => h > START_HOUR).map((h) => (
                  <div key={h} className="absolute right-2 text-xs text-dom-gray-500 font-medium leading-none" style={{ top: (h - START_HOUR) * ROW_HEIGHT - 5 }}>
                    {`${String(h).padStart(2, '0')}:00`}
                  </div>
                ))}
              </div>

              {weekDates.map((date, di) => {
                const isToday = date === today;
                const nowTop = isToday ? getNowLineTop() : null;
                return (
                  <div key={date} className={`flex-1 flex ${di < weekDates.length - 1 ? 'border-r border-dom-gray-200' : ''} ${isToday ? 'bg-dom-green/[0.03]' : ''}`}>
                    {rooms.map((room) => {
                      const key = `${room.id}:${date}`;
                      const blocks = busy.get(key) || [];
                      const isHovered = hover?.roomId === room.id && hover?.date === date;
                      const hoverSlot = isHovered ? hover.halfSlot : -1;
                      const hoverTop = hoverSlot * HALF_HOUR_PX;

                      const hoverTime = hoverSlot >= 0 ? halfSlotToTime(hoverSlot) : '';
                      const hoverPast = hoverSlot >= 0 && new Date(`${date}T${hoverTime}:00+04:00`).getTime() < Date.now();
                      const hoverFitsTime = hoverSlot >= 0 && slotFits(hoverTime, duration.minutes);
                      const hoverFitsBusy = hoverSlot >= 0 && !isRangeOverlapping(hoverTime, duration.minutes, date, blocks);
                      const hoverFits = hoverFitsTime && hoverFitsBusy && !hoverPast;

                      const isMobileSelected = mobileSelection?.roomId === room.id && mobileSelection?.date === date;

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
                            <div key={h} className="absolute left-0 right-0 border-t border-dom-gray-200/50" style={{ top: (h - START_HOUR) * ROW_HEIGHT }} />
                          ))}

                          {/* Past overlay */}
                          {(() => {
                            const dateStart = new Date(`${date}T${String(START_HOUR).padStart(2, '0')}:00:00+04:00`).getTime();
                            const dateEnd = new Date(`${date}T${String(END_HOUR).padStart(2, '0')}:00:00+04:00`).getTime();
                            const nowMs = Date.now();
                            if (nowMs <= dateStart) return null;
                            if (nowMs >= dateEnd) return <div className="absolute inset-0 bg-dom-gray-200/15 pointer-events-none" />;
                            const pastH = (nowMs - dateStart) / (3600 * 1000) * ROW_HEIGHT;
                            return <div className="absolute left-0 right-0 top-0 bg-dom-gray-200/15 pointer-events-none" style={{ height: pastH }} />;
                          })()}

                          {/* Now line */}
                          {nowTop !== null && (
                            <div className="absolute left-0 right-0 pointer-events-none z-10" style={{ top: nowTop }}>
                              <div className="h-0.5 bg-dom-red/60" />
                            </div>
                          )}

                          {/* Desktop hover highlight */}
                          {!isTouch && hoverSlot >= 0 && !hoverPast && (
                            <div
                              className="absolute left-0.5 right-0.5 pointer-events-none rounded-sm border"
                              style={{
                                top: hoverTop,
                                height: Math.min(durationPx, TOTAL_HEIGHT - hoverTop),
                                backgroundColor: hoverFits ? `${room.color}20` : 'rgba(120,120,120,0.15)',
                                borderColor: hoverFits ? `${room.color}60` : 'rgba(120,120,120,0.3)',
                              }}
                            />
                          )}

                          {/* Mobile selection highlight */}
                          {isMobileSelected && mobileSelection && (
                            <>
                              <div
                                className="absolute left-0.5 right-0.5 rounded-sm border-2 z-20"
                                style={{
                                  top: mobileSelection.top,
                                  height: durationPx,
                                  backgroundColor: `${room.color}25`,
                                  borderColor: room.color,
                                }}
                              />
                              <button
                                onClick={(e) => { e.stopPropagation(); handleMobileBook(); }}
                                className="absolute left-1/2 -translate-x-1/2 z-30 bg-dom-green text-white text-[10px] font-medium px-2 py-1 rounded-md shadow-lg whitespace-nowrap"
                                style={{ top: mobileSelection.top + durationPx + 4 }}
                              >
                                Забронировать
                              </button>
                            </>
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
