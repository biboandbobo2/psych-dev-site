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

function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = START_HOUR; h < END_HOUR; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
    slots.push(`${String(h).padStart(2, '0')}:30`);
  }
  return slots;
}

function isBusy(time: string, date: string, blocks: BusyBlock[]): boolean {
  const slotStart = new Date(`${date}T${time}:00+04:00`).getTime();
  const slotEnd = slotStart + 30 * 60 * 1000; // 30-min granularity
  for (const b of blocks) {
    const busyStart = new Date(b.start).getTime();
    const busyEnd = busyStart + b.lengthSeconds * 1000;
    if (slotStart < busyEnd && slotEnd > busyStart) return true;
  }
  return false;
}

function isPast(date: string, time: string): boolean {
  const now = Date.now();
  const slotTime = new Date(`${date}T${time}:00+04:00`).getTime();
  return slotTime < now;
}

function formatDateHeader(date: string): { day: string; label: string } {
  const d = new Date(date + 'T00:00:00');
  const dayOfWeek = (d.getDay() + 6) % 7;
  const dayNum = d.getDate();
  const month = MONTH_SHORT[d.getMonth()];
  return { day: DAY_LABELS[dayOfWeek], label: `${dayNum} ${month}` };
}

export function WeekSchedule({ rooms, weekDates, busy, loading, onSlotClick }: WeekScheduleProps) {
  const timeSlots = useMemo(() => generateTimeSlots(), []);

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
          <table className="w-full border-collapse min-w-[900px]">
            {/* Header: days */}
            <thead>
              <tr className="bg-dom-cream">
                <th className="sticky left-0 z-10 bg-dom-cream w-16 px-2 py-3 text-xs font-medium text-dom-gray-500 border-b border-r border-dom-gray-200" />
                {weekDates.map((date) => {
                  const { day, label } = formatDateHeader(date);
                  return (
                    <th
                      key={date}
                      colSpan={rooms.length}
                      className="px-1 py-3 text-center border-b border-r border-dom-gray-200 last:border-r-0"
                    >
                      <div className="text-xs font-bold text-dom-gray-900">{day}</div>
                      <div className="text-xs text-dom-gray-500">{label}</div>
                    </th>
                  );
                })}
              </tr>
              {/* Sub-header: rooms per day */}
              <tr className="bg-dom-cream/50">
                <th className="sticky left-0 z-10 bg-dom-cream/50 w-16 px-2 py-1.5 border-b border-r border-dom-gray-200" />
                {weekDates.map((date) =>
                  rooms.map((room, ri) => (
                    <th
                      key={`${date}-${room.id}`}
                      className={`px-0.5 py-1.5 text-center border-b border-dom-gray-200 ${ri === rooms.length - 1 ? 'border-r' : ''} last:border-r-0`}
                    >
                      <div
                        className="w-3 h-3 rounded-full mx-auto"
                        style={{ backgroundColor: room.color }}
                        title={room.name}
                      />
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((time, ti) => {
                const isHour = time.endsWith(':00');
                return (
                  <tr key={time} className={isHour ? 'border-t border-dom-gray-200' : ''}>
                    <td className={`sticky left-0 z-10 bg-white w-16 px-2 text-right text-xs font-medium border-r border-dom-gray-200 ${isHour ? 'text-dom-gray-700 pt-1' : 'text-transparent'}`}>
                      {isHour ? time : '\u00A0'}
                    </td>
                    {weekDates.map((date) =>
                      rooms.map((room, ri) => {
                        const key = `${room.id}:${date}`;
                        const blocks = busy.get(key) || [];
                        const occupied = isBusy(time, date, blocks);
                        const past = isPast(date, time);
                        const disabled = occupied || past;

                        return (
                          <td
                            key={`${date}-${room.id}-${time}`}
                            className={`
                              h-5 px-0 border-b border-dom-gray-200/50
                              ${ri === rooms.length - 1 ? 'border-r border-dom-gray-200' : ''}
                              last:border-r-0
                              ${disabled ? '' : 'cursor-pointer hover:bg-dom-green/10 transition-colors'}
                            `}
                            onClick={disabled ? undefined : () => onSlotClick(room, date, time)}
                            title={disabled
                              ? (past ? 'Прошедшее время' : 'Занято')
                              : `${room.name} — ${time}`
                            }
                          >
                            {occupied && (
                              <div
                                className="w-full h-full opacity-60 rounded-sm"
                                style={{ backgroundColor: room.color }}
                              />
                            )}
                            {past && !occupied && (
                              <div className="w-full h-full bg-dom-gray-200/30" />
                            )}
                          </td>
                        );
                      })
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-4 text-xs text-dom-gray-500">
          {rooms.map((room) => (
            <div key={room.id} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full opacity-60" style={{ backgroundColor: room.color }} />
              {room.name.replace(' кабинет', '')}
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-dom-green/20 border border-dom-green/30" />
            Свободно
          </div>
        </div>
      </div>
    </section>
  );
}
