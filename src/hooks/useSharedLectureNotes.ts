// ЛЕГАСИ-контур: «Поделиться конспектом» выпилен в пользу живых открытых
// конспектов (этап C редизайна, см. useOpenLectureNotes). Коллекция
// `sharedLectureNotes` больше не пополняется; хуки ниже остались только
// для лекторского экрана /admin/questions (просмотр и удаление старых записей).
import { useCallback, useEffect, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { debugError } from '../lib/debug';
import {
  mapSharedLectureNoteRecord,
  type SharedLectureNote,
} from '../types/sharedLectureNotes';

/** Удаление легаси-записи (автор или лектор курса — по правилам). */
export function useSharedLectureNoteActions() {
  const deleteSharedNote = useCallback(async (shareId: string) => {
    await deleteDoc(doc(db, 'sharedLectureNotes', shareId));
  }, []);

  return { deleteSharedNote };
}

/** Все расшаренные конспекты курса — для лектора (правила требуют canEditCourse). */
export function useCourseSharedNotes(courseId: string | null) {
  const [sharedNotes, setSharedNotes] = useState<SharedLectureNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) {
      setSharedNotes([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      query(collection(db, 'sharedLectureNotes'), where('courseId', '==', courseId)),
      (snap) => {
        setSharedNotes(
          snap.docs
            .map((d) => mapSharedLectureNoteRecord(d.id, d.data()))
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        );
        setLoading(false);
        setError(null);
      },
      (err) => {
        debugError('[useCourseSharedNotes] snapshot error', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [courseId]);

  return { sharedNotes, loading, error };
}
