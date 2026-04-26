import { useState, type FormEvent } from 'react';
import type { GroupEvent } from '../../../../types/groupFeed';

export interface EventFormValue {
  text: string;
  startAtMs: number | null;
  endAtMs: number | null;
  isAllDay: boolean;
  zoomLink: string;
  siteLink: string;
}

export interface EventFormSubmitPayload {
  text: string;
  startAtMs: number;
  endAtMs: number;
  isAllDay: boolean;
  zoomLink: string;
  siteLink: string;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function localInputValue(date: Date, allDay: boolean): string {
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  if (allDay) return `${yyyy}-${mm}-${dd}`;
  return `${yyyy}-${mm}-${dd}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function msToInput(ms: number | null, allDay: boolean): string {
  if (ms === null) return '';
  return localInputValue(new Date(ms), allDay);
}

export function eventToFormValue(event: GroupEvent): EventFormValue {
  return {
    text: event.text ?? '',
    startAtMs: event.startAt?.toMillis?.() ?? null,
    endAtMs: event.endAt?.toMillis?.() ?? null,
    isAllDay: Boolean(event.isAllDay),
    zoomLink: event.zoomLink ?? '',
    siteLink: event.siteLink ?? '',
  };
}

export const EMPTY_EVENT_FORM: EventFormValue = {
  text: '',
  startAtMs: null,
  endAtMs: null,
  isAllDay: false,
  zoomLink: '',
  siteLink: '',
};

interface EventFormProps {
  initialValue?: EventFormValue;
  initialStartDate?: Date;
  saving: boolean;
  errorMessage: string | null;
  submitLabel: string;
  onSubmit: (value: EventFormSubmitPayload) => void;
}

export function EventForm({
  initialValue,
  initialStartDate,
  saving,
  errorMessage,
  submitLabel,
  onSubmit,
}: EventFormProps) {
  const seed: EventFormValue = (() => {
    if (initialValue) return initialValue;
    if (initialStartDate) {
      const startMs = initialStartDate.getTime();
      return {
        ...EMPTY_EVENT_FORM,
        startAtMs: startMs,
        endAtMs: startMs + 90 * 60 * 1000,
      };
    }
    return EMPTY_EVENT_FORM;
  })();

  const [text, setText] = useState(seed.text);
  const [startLocal, setStartLocal] = useState(msToInput(seed.startAtMs, seed.isAllDay));
  const [endLocal, setEndLocal] = useState(msToInput(seed.endAtMs, seed.isAllDay));
  const [isAllDay, setIsAllDay] = useState(seed.isAllDay);
  const [zoomLink, setZoomLink] = useState(seed.zoomLink);
  const [siteLink, setSiteLink] = useState(seed.siteLink);
  const [validation, setValidation] = useState<string | null>(null);

  const canSubmit =
    text.trim().length >= 3 && startLocal.length > 0 && endLocal.length > 0;

  const handleStartChange = (value: string) => {
    setStartLocal(value);
    if (value && !endLocal) {
      const startMs = Date.parse(value);
      if (!Number.isNaN(startMs)) {
        const defaultEnd = new Date(startMs + 90 * 60 * 1000);
        setEndLocal(localInputValue(defaultEnd, isAllDay));
      }
    }
  };

  const handleAllDayChange = (next: boolean) => {
    setIsAllDay(next);
    if (startLocal) {
      const start = new Date(Date.parse(startLocal));
      if (!Number.isNaN(start.getTime())) setStartLocal(localInputValue(start, next));
    }
    if (endLocal) {
      const end = new Date(Date.parse(endLocal));
      if (!Number.isNaN(end.getTime())) setEndLocal(localInputValue(end, next));
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setValidation(null);
    const startMs = Date.parse(startLocal);
    const endMs = Date.parse(endLocal);
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
      setValidation('Укажите корректные дату и время');
      return;
    }
    if (endMs <= startMs) {
      setValidation('Время окончания должно быть позже начала');
      return;
    }
    onSubmit({
      text: text.trim(),
      startAtMs: startMs,
      endAtMs: endMs,
      isAllDay,
      zoomLink: zoomLink.trim(),
      siteLink: siteLink.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <label className="flex flex-1 min-w-[180px] flex-col gap-1 text-xs text-gray-600">
          Начало
          <input
            type={isAllDay ? 'date' : 'datetime-local'}
            value={startLocal}
            onChange={(e) => handleStartChange(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            disabled={saving}
            required
          />
        </label>
        <label className="flex flex-1 min-w-[180px] flex-col gap-1 text-xs text-gray-600">
          Окончание
          <input
            type={isAllDay ? 'date' : 'datetime-local'}
            value={endLocal}
            onChange={(e) => setEndLocal(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            disabled={saving}
            required
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-xs text-gray-600">
        <input
          type="checkbox"
          checked={isAllDay}
          onChange={(e) => handleAllDayChange(e.target.checked)}
          disabled={saving}
        />
        Весь день
      </label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Описание события"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        disabled={saving}
      />
      <input
        type="url"
        value={zoomLink}
        onChange={(e) => setZoomLink(e.target.value)}
        placeholder="Zoom-ссылка (опционально)"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        disabled={saving}
      />
      <input
        type="url"
        value={siteLink}
        onChange={(e) => setSiteLink(e.target.value)}
        placeholder="Ссылка на страницу сайта (опционально)"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        disabled={saving}
      />
      {validation && <p className="text-xs text-rose-700">{validation}</p>}
      {errorMessage && <p className="text-xs text-rose-700">{errorMessage}</p>}
      <button
        type="submit"
        disabled={saving || !canSubmit}
        className="rounded-md bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {saving ? 'Сохраняем…' : submitLabel}
      </button>
    </form>
  );
}
