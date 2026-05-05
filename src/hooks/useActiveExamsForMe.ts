import { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { debugError } from '../lib/debug';
import { normalizeExamDoc } from '../lib/exams/examsFirestore';
import type { Exam } from '../types/exam';
import { useMyGroups } from './useMyGroups';

interface UseActiveExamsForMeResult {
  exams: Exam[];
  loading: boolean;
}

/**
 * Список active экзаменов, в которых текущий пользователь — участник
 * (хотя бы одна из exam.groupIds совпадает с группой юзера). Если юзер
 * без групп — пустой список.
 */
export function useActiveExamsForMe(): UseActiveExamsForMeResult {
  const { groups: myGroups, loading: groupsLoading } = useMyGroups();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (groupsLoading) {
      setLoading(true);
      return;
    }
    const myGroupIds = myGroups.map((g) => g.id);
    if (myGroupIds.length === 0) {
      setExams([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, 'exams'),
      where('status', '==', 'active'),
      where('groupIds', 'array-contains-any', myGroupIds.slice(0, 30))
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const next = snap.docs
          .map((d) => normalizeExamDoc(d.id, d.data()))
          .filter((e): e is Exam => e !== null);
        setExams(next);
        setLoading(false);
      },
      (err) => {
        debugError('useActiveExamsForMe: snapshot error', err);
        setExams([]);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [myGroups, groupsLoading]);

  return { exams, loading };
}
