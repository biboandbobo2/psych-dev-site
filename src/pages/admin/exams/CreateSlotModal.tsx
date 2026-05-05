import { useState } from 'react';
import { createPortal } from 'react-dom';
import { debugError } from '../../../lib/debug';
import { createSlot } from '../../../lib/exams/examsFirestore';
import type { Exam } from '../../../types/exam';

interface CreateSlotModalProps {
  exam: Exam;
  prefillDate: Date;
  createdBy: string;
  onClose: () => void;
}

function localTimeISO(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CreateSlotModal({
  exam,
  prefillDate,
  createdBy,
  onClose,
}: CreateSlotModalProps) {
  // По умолчанию: 14:00 в выбранный день.
  const initial = new Date(prefillDate);
  initial.setHours(14, 0, 0, 0);
  const [datetime, setDatetime] = useState(localTimeISO(initial));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!datetime) {
      setError('Укажите дату и время');
      return;
    }
    const date = new Date(datetime);
    if (Number.isNaN(date.getTime())) {
      setError('Некорректная дата');
      return;
    }
    setSubmitting(true);
    try {
      await createSlot(
        exam.id,
        date,
        exam.slotDurationMinutes,
        exam.groupIds,
        createdBy
      );
      onClose();
    } catch (err) {
      debugError('CreateSlotModal: createSlot failed', err);
      setError(err instanceof Error ? err.message : 'Не удалось создать слот');
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-card p-6 shadow-brand"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute right-4 top-4 rounded-full p-1 text-muted transition hover:bg-card2"
        >
          ✕
        </button>
        <h3 className="text-lg font-bold text-fg">Новый слот</h3>
        <p className="mt-1 text-xs text-muted">
          Длительность {exam.slotDurationMinutes} мин (из настроек экзамена)
        </p>
        <div className="mt-4 space-y-2">
          <label className="block text-sm font-semibold">
            Дата и время начала
            <input
              type="datetime-local"
              value={datetime}
              onChange={(e) => setDatetime(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-card2 px-3 py-2 text-sm"
            />
          </label>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-3 py-1 text-sm font-semibold"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-md bg-indigo-600 px-3 py-1 text-sm font-semibold text-white disabled:opacity-50"
          >
            {submitting ? 'Создаю…' : 'Создать'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
