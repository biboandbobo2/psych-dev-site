import { useMemo, useState } from 'react';
import { useActiveExamsForMe } from '../../../hooks/useActiveExamsForMe';
import { useMyGroups } from '../../../hooks/useMyGroups';
import { useMyExamBooking } from '../../../hooks/useMyExamBooking';
import { useExam } from '../../../hooks/useExam';
import type { Exam } from '../../../types/exam';
import { ExamBookingModal } from './ExamBookingModal';

export function MyExamsSection() {
  const { exams, loading } = useActiveExamsForMe();
  const [openExamId, setOpenExamId] = useState<string | null>(null);

  const openExam = useMemo(
    () => exams.find((e) => e.id === openExamId) ?? null,
    [exams, openExamId]
  );

  if (loading || exams.length === 0) return null;

  return (
    <>
      <section className="rounded-2xl border border-border bg-card p-5 shadow-brand">
        <h3 className="mb-3 text-xl font-bold text-fg">Экзамены</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {exams.map((exam) => (
            <ExamCard
              key={exam.id}
              exam={exam}
              onOpen={() => setOpenExamId(exam.id)}
            />
          ))}
        </div>
      </section>
      {openExam && <BookingModalGate exam={openExam} onClose={() => setOpenExamId(null)} />}
    </>
  );
}

interface ExamCardProps {
  exam: Exam;
  onOpen: () => void;
}

function ExamCard({ exam, onOpen }: ExamCardProps) {
  const { booking } = useMyExamBooking(exam.id);
  const { slots } = useExam(exam.id);

  const myBookedSlot = booking ? slots.find((s) => s.id === booking.slotId) : null;
  const slotLabel = myBookedSlot
    ? myBookedSlot.startAt.toDate().toLocaleString('ru-RU', {
        timeZone: exam.timezone,
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : null;

  return (
    <article className="rounded-xl border border-border bg-card2 p-4">
      <p className="text-sm font-semibold text-fg">{exam.title}</p>
      <p className="mt-2 text-sm text-muted">
        {booking ? `Моя запись: ${slotLabel}` : exam.announcement.title}
      </p>
      <button
        type="button"
        onClick={onOpen}
        className="mt-3 inline-flex rounded-md border border-accent/30 bg-accent-100 px-3 py-1 text-sm font-semibold text-accent transition hover:bg-accent-100/70"
      >
        {booking ? 'Открыть' : 'Записаться'}
      </button>
    </article>
  );
}

function BookingModalGate({ exam, onClose }: { exam: Exam; onClose: () => void }) {
  const { groups } = useMyGroups();
  const myGroupId = useMemo(() => {
    const matches = groups.filter((g) => exam.groupIds.includes(g.id));
    return matches.length === 1 ? matches[0].id : null;
  }, [groups, exam.groupIds]);

  if (!myGroupId) {
    return (
      <ErrorModal
        message={
          groups.length === 0
            ? 'Загрузка групп…'
            : 'Вы состоите в нескольких группах экзамена — обратитесь к администратору.'
        }
        onClose={onClose}
      />
    );
  }

  return <ExamBookingModal exam={exam} myGroupId={myGroupId} onClose={onClose} />;
}

function ErrorModal({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="rounded-2xl bg-card p-6 text-sm text-fg"
        onClick={(e) => e.stopPropagation()}
      >
        {message}
        <button
          type="button"
          onClick={onClose}
          className="mt-3 block rounded-md border border-border px-3 py-1 text-sm"
        >
          Закрыть
        </button>
      </div>
    </div>
  );
}
