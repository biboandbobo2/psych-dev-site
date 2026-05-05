import { useMemo } from 'react';
import {
  buildMonthGrid,
  groupItemsByDate,
  type CalendarMonthDay,
} from '../../../lib/calendarGrid';
import type { Exam, ExamSlot } from '../../../types/exam';

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export type SlotViewMode = 'admin' | 'student';

interface ExamMonthGridProps {
  monthDate: Date;
  exam: Exam;
  slots: ExamSlot[];
  mode: SlotViewMode;
  /** Только для student — id слота, на который записан текущий юзер. */
  myBookedSlotId?: string | null;
  /** Только для student — группа текущего юзера среди exam.groupIds. null если ни в одной. */
  myGroupId?: string | null;
  /** Открыть форму создания слота на этот день (admin). */
  onCreateSlot?: (date: Date) => void;
  /** Клик по слоту: для admin — детали и удаление; для student — выбор/просмотр своей брони. */
  onSlotClick: (slot: ExamSlot) => void;
}

export function ExamMonthGrid({
  monthDate,
  exam,
  slots,
  mode,
  myBookedSlotId = null,
  myGroupId = null,
  onCreateSlot,
  onSlotClick,
}: ExamMonthGridProps) {
  const days = useMemo(() => buildMonthGrid(monthDate), [monthDate]);
  const byDate = useMemo(
    () => groupItemsByDate(slots, (s) => new Date(s.startAt.toMillis())),
    [slots]
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
          <DayCell
            key={day.isoDate}
            day={day}
            slots={byDate.get(day.isoDate) ?? []}
            exam={exam}
            mode={mode}
            myBookedSlotId={myBookedSlotId}
            myGroupId={myGroupId}
            onCreateSlot={onCreateSlot}
            onSlotClick={onSlotClick}
          />
        ))}
      </div>
    </div>
  );
}

interface DayCellProps {
  day: CalendarMonthDay;
  slots: ExamSlot[];
  exam: Exam;
  mode: SlotViewMode;
  myBookedSlotId: string | null;
  myGroupId: string | null;
  onCreateSlot?: (date: Date) => void;
  onSlotClick: (slot: ExamSlot) => void;
}

function DayCell({
  day,
  slots,
  exam,
  mode,
  myBookedSlotId,
  myGroupId,
  onCreateSlot,
  onSlotClick,
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
        {slots.slice(0, 4).map((slot) => (
          <SlotBadge
            key={slot.id}
            slot={slot}
            exam={exam}
            mode={mode}
            isMine={slot.id === myBookedSlotId}
            myGroupId={myGroupId}
            onClick={() => onSlotClick(slot)}
          />
        ))}
        {slots.length > 4 && (
          <div className="text-[10px] text-gray-500">
            +{slots.length - 4} ещё
          </div>
        )}
      </div>
      {mode === 'admin' && slots.length === 0 && onCreateSlot && (
        <button
          type="button"
          onClick={() => onCreateSlot(day.date)}
          aria-label={`Создать слот на ${day.isoDate}`}
          className="absolute inset-0 cursor-pointer rounded-md hover:bg-[#F4F9FF]"
        />
      )}
      {mode === 'admin' && slots.length > 0 && onCreateSlot && (
        <button
          type="button"
          onClick={() => onCreateSlot(day.date)}
          aria-label={`Добавить ещё слот на ${day.isoDate}`}
          className="mt-auto self-end text-[10px] font-bold text-indigo-600 hover:text-indigo-800"
        >
          +
        </button>
      )}
    </div>
  );
}

interface SlotBadgeProps {
  slot: ExamSlot;
  exam: Exam;
  mode: SlotViewMode;
  isMine: boolean;
  myGroupId: string | null;
  onClick: () => void;
}

function shortTime(ms: number): string {
  return new Date(ms).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function SlotBadge({ slot, exam, mode, isMine, myGroupId, onClick }: SlotBadgeProps) {
  const occupied = exam.groupIds.filter((gid) => slot.bookings[gid] != null).length;
  const total = exam.groupIds.length;

  // student: что показывать?
  // - моя бронь — зелёный, кнопка активна
  // - в моей группе занято — серый, неактивна
  // - в моей группе свободно — синий, активна
  let baseColor = 'bg-indigo-50 text-indigo-900 hover:bg-indigo-100';
  let disabled = false;
  if (mode === 'student') {
    if (isMine) {
      baseColor = 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200 ring-1 ring-emerald-400';
    } else if (myGroupId && slot.bookings[myGroupId] != null) {
      baseColor = 'bg-gray-100 text-gray-400';
      disabled = true;
    }
  }

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={`${shortTime(slot.startAt.toMillis())} — занято ${occupied}/${total}`}
      className={`flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[11px] leading-tight ${baseColor} disabled:cursor-not-allowed`}
    >
      <span aria-hidden className="shrink-0">
        {isMine ? '✅' : '🕒'}
      </span>
      <span className="shrink-0 font-mono text-[10px] opacity-70">
        {shortTime(slot.startAt.toMillis())}
      </span>
      <span className="truncate">
        {occupied}/{total}
      </span>
    </button>
  );
}
