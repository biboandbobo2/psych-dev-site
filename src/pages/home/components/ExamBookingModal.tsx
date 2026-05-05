import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useExam } from '../../../hooks/useExam';
import { useMyExamBooking } from '../../../hooks/useMyExamBooking';
import { bookExamSlot, cancelExamBooking } from '../../../lib/exams/examsClient';
import { addMonths, formatMonthYearRu } from '../../../lib/calendarGrid';
import { debugError } from '../../../lib/debug';
import { ExamMonthGrid } from '../../admin/exams/ExamMonthGrid';
import type { Exam, ExamSlot } from '../../../types/exam';

interface ExamBookingModalProps {
  exam: Exam;
  myGroupId: string;
  onClose: () => void;
}

function formatSlotRange(slot: ExamSlot, timezone: string): string {
  const fmt = (d: Date) =>
    d.toLocaleString('ru-RU', {
      timeZone: timezone,
      dateStyle: 'long',
      timeStyle: 'short',
    });
  const endOnly = (d: Date) =>
    d.toLocaleTimeString('ru-RU', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
    });
  return `${fmt(slot.startAt.toDate())} — ${endOnly(slot.endAt.toDate())}`;
}

export function ExamBookingModal({
  exam,
  myGroupId,
  onClose,
}: ExamBookingModalProps) {
  const { slots } = useExam(exam.id);
  const { booking } = useMyExamBooking(exam.id);
  const [cursorDate, setCursorDate] = useState<Date>(() => new Date());
  const [pickedSlot, setPickedSlot] = useState<ExamSlot | null>(null);
  const [essay, setEssay] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const myBookedSlot = useMemo(
    () => slots.find((s) => s.id === booking?.slotId) ?? null,
    [slots, booking]
  );

  const canCancelMy = useMemo(() => {
    if (!myBookedSlot) return false;
    const deadline =
      myBookedSlot.startAt.toMillis() - exam.cancelLeadTimeHours * 3600 * 1000;
    return Date.now() <= deadline;
  }, [myBookedSlot, exam.cancelLeadTimeHours]);

  const handleSlotClick = (slot: ExamSlot) => {
    if (booking) {
      // у юзера уже есть бронь — этот клик в read-only календаре игнорируем
      return;
    }
    if (slot.bookings[myGroupId] != null) return;
    setPickedSlot(slot);
    setEssay('');
    setError(null);
  };

  const handleBook = async () => {
    if (!pickedSlot) return;
    const trimmed = essay.trim();
    if (trimmed.length < exam.essayMinChars) {
      setError(`Минимум ${exam.essayMinChars} символов в эссе`);
      return;
    }
    if (trimmed.length > exam.essayMaxChars) {
      setError(`Максимум ${exam.essayMaxChars} символов в эссе`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await bookExamSlot({
        examId: exam.id,
        slotId: pickedSlot.id,
        essay: trimmed,
      });
      setPickedSlot(null);
      setEssay('');
    } catch (err) {
      debugError('ExamBookingModal: book failed', err);
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: unknown }).message)
          : 'Не удалось забронировать';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await cancelExamBooking({ examId: exam.id });
      setConfirmingCancel(false);
    } catch (err) {
      debugError('ExamBookingModal: cancel failed', err);
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: unknown }).message)
          : 'Не удалось отменить';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl rounded-2xl bg-card p-6 shadow-brand"
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
        <h3 className="text-lg font-bold text-fg">{exam.title}</h3>
        {exam.announcement.body && (
          <p className="mt-1 whitespace-pre-wrap text-sm text-muted">
            {exam.announcement.body}
          </p>
        )}

        {booking && myBookedSlot && (
          <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-900">Моя запись</p>
            <p className="mt-1 text-sm text-emerald-900">
              {formatSlotRange(myBookedSlot, exam.timezone)}
            </p>
            <p className="mt-2 text-xs text-emerald-800">
              {canCancelMy
                ? `Отмену можно сделать не позже чем за ${exam.cancelLeadTimeHours} ч до начала. После отмены эссе удаляется, можно записаться заново.`
                : `Отмена больше недоступна — до начала меньше ${exam.cancelLeadTimeHours} часов.`}
            </p>
            {canCancelMy && !confirmingCancel && (
              <button
                type="button"
                onClick={() => setConfirmingCancel(true)}
                className="mt-3 rounded-md border border-emerald-700 px-3 py-1 text-sm font-semibold text-emerald-900 hover:bg-emerald-100"
              >
                Отменить бронь
              </button>
            )}
            {confirmingCancel && (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={submitting}
                  className="rounded-md bg-red-600 px-3 py-1 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {submitting ? 'Отменяю…' : 'Подтвердить — эссе удалить'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingCancel(false)}
                  disabled={submitting}
                  className="rounded-md border border-border px-3 py-1 text-sm font-semibold"
                >
                  Назад
                </button>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCursorDate((d) => addMonths(d, -1))}
              className="rounded-md border border-border px-2 py-1 text-sm"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => setCursorDate(new Date())}
              className="rounded-md border border-border px-2 py-1 text-sm"
            >
              Сегодня
            </button>
            <button
              type="button"
              onClick={() => setCursorDate((d) => addMonths(d, 1))}
              className="rounded-md border border-border px-2 py-1 text-sm"
            >
              →
            </button>
            <span className="ml-3 text-sm font-semibold">
              {formatMonthYearRu(cursorDate)}
            </span>
          </div>
        </div>

        <div className="mt-3">
          <ExamMonthGrid
            monthDate={cursorDate}
            exam={exam}
            slots={slots}
            mode="student"
            myBookedSlotId={booking?.slotId ?? null}
            myGroupId={myGroupId}
            onSlotClick={handleSlotClick}
          />
        </div>

        {pickedSlot && !booking && (
          <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
            <p className="text-sm font-semibold text-indigo-900">
              Выбран слот: {formatSlotRange(pickedSlot, exam.timezone)}
            </p>
            <textarea
              value={essay}
              onChange={(e) => setEssay(e.target.value)}
              rows={8}
              placeholder={`Эссе (${exam.essayMinChars}–${exam.essayMaxChars} символов). После отправки редактирование невозможно.`}
              className="mt-2 w-full rounded-md border border-indigo-300 bg-white px-3 py-2 text-sm"
            />
            <div className="mt-1 flex items-center justify-between text-xs text-indigo-800">
              <span>
                {essay.trim().length} / {exam.essayMaxChars} символов
              </span>
              <span>мин {exam.essayMinChars}</span>
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setPickedSlot(null);
                  setEssay('');
                  setError(null);
                }}
                disabled={submitting}
                className="rounded-md border border-border px-3 py-1 text-sm font-semibold"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleBook}
                disabled={submitting}
                className="rounded-md bg-indigo-600 px-3 py-1 text-sm font-semibold text-white disabled:opacity-50"
              >
                {submitting ? 'Отправляю…' : 'Забронировать'}
              </button>
            </div>
          </div>
        )}

        {!pickedSlot && error && (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        )}
      </div>
    </div>,
    document.body,
  );
}
