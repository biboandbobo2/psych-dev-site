import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../auth/AuthProvider';
import { useAllGroups } from '../../../hooks/useAllGroups';
import { useExam } from '../../../hooks/useExam';
import {
  archiveExam,
  normalizeExamDoc,
} from '../../../lib/exams/examsFirestore';
import { addMonths, formatMonthYearRu } from '../../../lib/calendarGrid';
import { debugError } from '../../../lib/debug';
import type { Exam, ExamSlot } from '../../../types/exam';
import { ExamMonthGrid } from './ExamMonthGrid';
import { CreateExamModal } from './CreateExamModal';
import { CreateSlotModal } from './CreateSlotModal';
import { SlotDetailsModal } from './SlotDetailsModal';

export default function AdminExams() {
  const { user, isSuperAdmin } = useAuth();
  const { groups } = useAllGroups();
  const [activeExams, setActiveExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [cursorDate, setCursorDate] = useState<Date>(() => new Date());
  const [showCreateExam, setShowCreateExam] = useState(false);
  const [createSlotDate, setCreateSlotDate] = useState<Date | null>(null);
  const [openSlot, setOpenSlot] = useState<ExamSlot | null>(null);

  // Подписка на список активных экзаменов.
  useEffect(() => {
    if (!isSuperAdmin) return;
    const q = query(
      collection(db, 'exams'),
      where('status', '==', 'active')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const next = snap.docs
          .map((d) => normalizeExamDoc(d.id, d.data()))
          .filter((e): e is Exam => e !== null)
          .sort((a, b) => {
            const am = a.createdAt?.toMillis?.() ?? 0;
            const bm = b.createdAt?.toMillis?.() ?? 0;
            return bm - am;
          });
        setActiveExams(next);
        setSelectedExamId((prev) => {
          if (prev && next.some((e) => e.id === prev)) return prev;
          return next[0]?.id ?? null;
        });
      },
      (err) => {
        debugError('AdminExams: list snapshot error', err);
      }
    );
    return () => unsub();
  }, [isSuperAdmin]);

  const { exam, slots, loading } = useExam(selectedExamId);

  const groupNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const g of groups) {
      map[g.id] = g.name;
    }
    return map;
  }, [groups]);

  if (!isSuperAdmin) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted">Нужны права super-admin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Экзамены</h1>
        <div className="flex items-center gap-2">
          {activeExams.length > 1 && (
            <select
              value={selectedExamId ?? ''}
              onChange={(e) => setSelectedExamId(e.target.value || null)}
              className="rounded-md border border-border bg-card2 px-3 py-1 text-sm"
            >
              {activeExams.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => setShowCreateExam(true)}
            className="rounded-md bg-indigo-600 px-3 py-1 text-sm font-semibold text-white"
          >
            + Новый экзамен
          </button>
        </div>
      </header>

      {!exam && !loading && (
        <p className="text-sm text-muted">
          Активных экзаменов пока нет. Создайте новый.
        </p>
      )}

      {exam && (
        <>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-fg">{exam.title}</p>
                <p className="text-xs text-muted">
                  Курс: {exam.courseId} • Слот: {exam.slotDurationMinutes} мин •
                  Окно отмены: {exam.cancelLeadTimeHours} ч
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (!confirm('Архивировать экзамен? Карточка для студентов исчезнет.')) return;
                  try {
                    await archiveExam(exam.id);
                  } catch (err) {
                    debugError('AdminExams: archive failed', err);
                    alert('Не удалось архивировать');
                  }
                }}
                className="rounded-md border border-amber-500 px-3 py-1 text-sm font-semibold text-amber-700 hover:bg-amber-50"
              >
                В архив
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
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
              <p className="text-xs text-muted">
                Клик по пустому дню — создать слот. По бейджу — открыть слот.
              </p>
            </div>
            <ExamMonthGrid
              monthDate={cursorDate}
              exam={exam}
              slots={slots}
              mode="admin"
              onCreateSlot={(d) => setCreateSlotDate(d)}
              onSlotClick={(s) => setOpenSlot(s)}
            />
          </div>
        </>
      )}

      {showCreateExam && user && (
        <CreateExamModal
          groups={groups}
          createdBy={user.uid}
          onClose={() => setShowCreateExam(false)}
          onCreated={(id) => {
            setSelectedExamId(id);
            setShowCreateExam(false);
          }}
        />
      )}
      {createSlotDate && exam && user && (
        <CreateSlotModal
          exam={exam}
          prefillDate={createSlotDate}
          createdBy={user.uid}
          onClose={() => setCreateSlotDate(null)}
        />
      )}
      {openSlot && exam && (
        <SlotDetailsModal
          exam={exam}
          slot={openSlot}
          groupNames={groupNames}
          onClose={() => setOpenSlot(null)}
        />
      )}
    </div>
  );
}
