import { cn } from '../../lib/cn';
import { BaseModal, ModalCancelButton } from '../../components/ui/BaseModal';
import { WEEKDAY_LABELS, formatDateKey, toDateKey, type ParsedCalendarEvent } from './homeHelpers';

interface EventsCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  cursor: Date;
  onCursorChange: (cursor: Date) => void;
  selectedDateKey: string | null;
  onSelectDate: (key: string) => void;
  eventsByDate: Map<string, ParsedCalendarEvent[]>;
  undatedEvents: ParsedCalendarEvent[];
}

export function EventsCalendarModal({
  isOpen,
  onClose,
  cursor,
  onCursorChange,
  selectedDateKey,
  onSelectDate,
  eventsByDate,
  undatedEvents,
}: EventsCalendarModalProps) {
  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const firstWeekday = (monthStart.getDay() + 6) % 7;
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const calendarCells: Array<{ day: number; dateKey: string } | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const date = new Date(cursor.getFullYear(), cursor.getMonth(), day);
      return { day, dateKey: toDateKey(date) };
    }),
  ];
  const selectedDayEvents = selectedDateKey ? eventsByDate.get(selectedDateKey) ?? [] : [];
  const monthLabel = cursor.toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Календарь событий"
      maxWidth="2xl"
      footer={<ModalCancelButton onClick={onClose}>Закрыть</ModalCancelButton>}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-[#DDE5EE] bg-[#F8FAFD] px-3 py-2">
          <button
            type="button"
            onClick={() => onCursorChange(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="rounded-lg border border-[#C9D6E6] bg-white px-3 py-1 text-sm font-semibold text-[#3359CB] transition hover:bg-[#F0F5FF]"
          >
            ←
          </button>
          <p className="text-sm font-bold capitalize text-[#2C3E50]">{monthLabel}</p>
          <button
            type="button"
            onClick={() => onCursorChange(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="rounded-lg border border-[#C9D6E6] bg-white px-3 py-1 text-sm font-semibold text-[#3359CB] transition hover:bg-[#F0F5FF]"
          >
            →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="px-1 py-1 text-center text-xs font-semibold uppercase text-[#6B7A8D]">
              {label}
            </div>
          ))}
          {calendarCells.map((cell, index) => {
            if (!cell) {
              return <div key={`empty-${index}`} className="h-10 rounded-md bg-transparent" />;
            }

            const isSelected = selectedDateKey === cell.dateKey;
            const hasEvents = eventsByDate.has(cell.dateKey);
            return (
              <button
                key={cell.dateKey}
                type="button"
                onClick={() => onSelectDate(cell.dateKey)}
                className={cn(
                  'relative h-10 rounded-md border text-sm transition',
                  isSelected
                    ? 'border-[#3359CB] bg-[#3359CB] text-white'
                    : hasEvents
                    ? 'border-[#9EB7D9] bg-[#EEF4FF] text-[#244A8F] hover:bg-[#E3EEFF]'
                    : 'border-[#E5EBF3] bg-white text-[#465A75] hover:bg-[#F8FAFD]'
                )}
              >
                {cell.day}
                {hasEvents && !isSelected ? (
                  <span className="absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#3359CB]" />
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border border-[#DDE5EE] bg-[#FAFCFF] p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#4A5FA5]">
            {selectedDateKey
              ? `События на ${formatDateKey(selectedDateKey)}`
              : 'Выберите дату в календаре'}
          </p>
          {selectedDayEvents.length ? (
            <ul className="mt-2 space-y-2">
              {selectedDayEvents.map((event) => (
                <li key={event.id} className="rounded-lg bg-white px-3 py-2 text-sm text-[#44566F]">
                  <p className="font-semibold text-[#2C3E50]">{event.dateLabel}</p>
                  <p className="mt-1">{event.text}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-[#6B7A8D]">На выбранную дату событий пока нет.</p>
          )}
        </div>

        {undatedEvents.length ? (
          <div className="rounded-xl border border-[#E7EEF8] bg-[#F7FAFF] p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#5F6F87]">
              События без точной даты
            </p>
            <ul className="mt-2 space-y-2">
              {undatedEvents.map((event) => (
                <li key={event.id} className="rounded-lg bg-white px-3 py-2 text-sm text-[#556880]">
                  <p className="font-semibold text-[#2C3E50]">{event.dateLabel}</p>
                  <p className="mt-1">{event.text}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </BaseModal>
  );
}
