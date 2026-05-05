import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { debugError } from '../../../lib/debug';
import {
  examBookingDetailsId,
  type Exam,
  type ExamBookingDetails,
  type ExamSlot,
} from '../../../types/exam';
import { deleteSlotIfEmpty } from '../../../lib/exams/examsFirestore';
import { StudentEssayModal } from './StudentEssayModal';

interface SlotDetailsModalProps {
  exam: Exam;
  slot: ExamSlot;
  /** Подписи групп (groupId → human name). */
  groupNames: Record<string, string>;
  onClose: () => void;
}

export function SlotDetailsModal({
  exam,
  slot,
  groupNames,
  onClose,
}: SlotDetailsModalProps) {
  const [details, setDetails] = useState<Record<string, ExamBookingDetails | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [essayFor, setEssayFor] = useState<{
    userId: string;
    userName: string;
    userEmail: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all(
      exam.groupIds.map(async (gid) => {
        if (slot.bookings[gid] == null) {
          return [gid, null] as const;
        }
        const ref = doc(
          db,
          'exams',
          exam.id,
          'bookingDetails',
          examBookingDetailsId(slot.id, gid)
        );
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          return [gid, null] as const;
        }
        const data = snap.data() as Record<string, unknown>;
        const value: ExamBookingDetails = {
          slotId: typeof data.slotId === 'string' ? data.slotId : slot.id,
          groupId: typeof data.groupId === 'string' ? data.groupId : gid,
          userId: typeof data.userId === 'string' ? data.userId : '',
          userName: typeof data.userName === 'string' ? data.userName : '',
          userEmail: typeof data.userEmail === 'string' ? data.userEmail : '',
          bookedAt: (data.bookedAt as Timestamp) ?? Timestamp.now(),
        };
        return [gid, value] as const;
      })
    )
      .then((entries) => {
        if (cancelled) return;
        const next: Record<string, ExamBookingDetails | null> = {};
        for (const [gid, val] of entries) {
          next[gid] = val;
        }
        setDetails(next);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        debugError('SlotDetailsModal: load details failed', err);
        setError('Ошибка загрузки деталей слота');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [exam.id, exam.groupIds, slot.id, slot.bookings]);

  const isEmpty = exam.groupIds.every((gid) => slot.bookings[gid] == null);
  const startStr = slot.startAt
    .toDate()
    .toLocaleString('ru-RU', { dateStyle: 'long', timeStyle: 'short' });
  const endStr = slot.endAt.toDate().toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleDelete = async () => {
    if (!isEmpty) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteSlotIfEmpty(exam.id, slot);
      onClose();
    } catch (err) {
      debugError('SlotDetailsModal: delete failed', err);
      setError(err instanceof Error ? err.message : 'Не удалось удалить');
      setDeleting(false);
    }
  };

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-lg rounded-2xl bg-card p-6 shadow-brand"
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
          <h3 className="text-lg font-bold text-fg">Слот</h3>
          <p className="mt-1 text-sm text-muted">
            {startStr} — {endStr}
          </p>
          <div className="mt-4 space-y-2">
            {exam.groupIds.map((gid) => {
              const fact = slot.bookings[gid];
              const det = details[gid];
              const groupName = groupNames[gid] ?? gid;
              if (fact == null) {
                return (
                  <div
                    key={gid}
                    className="flex items-center justify-between rounded-lg border border-border bg-card2 px-3 py-2 text-sm"
                  >
                    <span className="font-semibold">{groupName}</span>
                    <span className="text-muted">свободно</span>
                  </div>
                );
              }
              return (
                <div
                  key={gid}
                  className="flex items-center justify-between rounded-lg border border-border bg-amber-50 px-3 py-2 text-sm"
                >
                  <span className="font-semibold">{groupName}</span>
                  {loading ? (
                    <span className="text-muted">…</span>
                  ) : det ? (
                    <button
                      type="button"
                      onClick={() =>
                        setEssayFor({
                          userId: det.userId,
                          userName: det.userName,
                          userEmail: det.userEmail,
                        })
                      }
                      className="text-left text-amber-900 underline-offset-2 hover:underline"
                    >
                      <div>{det.userName}</div>
                      <div className="text-xs text-amber-700">{det.userEmail}</div>
                    </button>
                  ) : (
                    <span className="text-muted">детали недоступны</span>
                  )}
                </div>
              );
            })}
          </div>
          {error && (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-3 py-1 text-sm font-semibold"
            >
              Закрыть
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={!isEmpty || deleting}
              className="rounded-md bg-red-600 px-3 py-1 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              title={
                isEmpty
                  ? 'Удалить пустой слот'
                  : 'Сначала отмените брони (договоритесь со студентами)'
              }
            >
              {deleting ? 'Удаляю…' : 'Удалить слот'}
            </button>
          </div>
        </div>
      </div>
      {essayFor && (
        <StudentEssayModal
          examId={exam.id}
          userId={essayFor.userId}
          userName={essayFor.userName}
          userEmail={essayFor.userEmail}
          onClose={() => setEssayFor(null)}
        />
      )}
    </>,
    document.body,
  );
}
