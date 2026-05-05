import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { debugError } from '../lib/debug';
import {
  normalizeExamDoc,
  normalizeSlotDoc,
} from '../lib/exams/examsFirestore';
import type { Exam, ExamSlot } from '../types/exam';

interface UseExamResult {
  exam: Exam | null;
  slots: ExamSlot[];
  loading: boolean;
}

/**
 * Подписка на документ экзамена + все его слоты (отсортированные по startAt).
 * Возвращает null/пусто, пока данные не загружены или экзамен не найден.
 */
export function useExam(examId: string | null): UseExamResult {
  const [exam, setExam] = useState<Exam | null>(null);
  const [slots, setSlots] = useState<ExamSlot[]>([]);
  const [examLoaded, setExamLoaded] = useState(false);
  const [slotsLoaded, setSlotsLoaded] = useState(false);

  useEffect(() => {
    if (!examId) {
      setExam(null);
      setExamLoaded(true);
      return;
    }
    setExamLoaded(false);
    const unsub = onSnapshot(
      doc(db, 'exams', examId),
      (snap) => {
        setExam(snap.exists() ? normalizeExamDoc(snap.id, snap.data()) : null);
        setExamLoaded(true);
      },
      (err) => {
        debugError('useExam: exam snapshot error', err);
        setExam(null);
        setExamLoaded(true);
      }
    );
    return () => unsub();
  }, [examId]);

  useEffect(() => {
    if (!examId) {
      setSlots([]);
      setSlotsLoaded(true);
      return;
    }
    setSlotsLoaded(false);
    const q = query(
      collection(db, 'exams', examId, 'slots'),
      orderBy('startAt', 'asc')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const next = snap.docs
          .map((d) => normalizeSlotDoc(d.id, d.data()))
          .filter((s): s is ExamSlot => s !== null);
        setSlots(next);
        setSlotsLoaded(true);
      },
      (err) => {
        debugError('useExam: slots snapshot error', err);
        setSlots([]);
        setSlotsLoaded(true);
      }
    );
    return () => unsub();
  }, [examId]);

  return { exam, slots, loading: !examLoaded || !slotsLoaded };
}
