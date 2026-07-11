import { useCallback, useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../stores/useAuthStore';
import { debugError } from '../lib/debug';
import { useLessonScopedDocs } from './useLessonScopedDocs';
import {
  mapSharedLectureNoteRecord,
  type SharedLectureNote,
  type SharedLectureNoteInput,
} from '../types/sharedLectureNotes';

/** Отправка и удаление расшаренных фрагментов конспекта. */
export function useSharedLectureNoteActions() {
  const user = useAuthStore((s) => s.user);

  const shareLectureNote = useCallback(
    async (input: SharedLectureNoteInput) => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const payload = {
        authorUid: user.uid,
        authorName: user.displayName ?? null,
        courseId: input.courseId,
        periodId: input.periodId,
        periodTitle: input.periodTitle ?? null,
        lectureTitle: input.lectureTitle ?? null,
        videoId: input.videoId ?? null,
        segments: input.segments.map((segment) => ({
          id: segment.id,
          startMs: segment.startMs,
          text: segment.text,
        })),
        visibility: input.visibility,
        groupId: input.visibility === 'group' ? input.groupId ?? null : null,
        createdAt: serverTimestamp(),
      };

      const ref = await addDoc(collection(db, 'sharedLectureNotes'), payload);
      return ref.id;
    },
    [user]
  );

  const deleteSharedNote = useCallback(async (shareId: string) => {
    await deleteDoc(doc(db, 'sharedLectureNotes', shareId));
  }, []);

  return { shareLectureNote, deleteSharedNote };
}

/** Конспекты занятия, расшаренные в группы студента (плюс его собственные). */
export function useLessonSharedNotes(
  courseId: string | null,
  periodId: string | null,
  groupIds: string[]
) {
  const { docs, loading } = useLessonScopedDocs(
    'sharedLectureNotes',
    mapSharedLectureNoteRecord,
    courseId,
    periodId,
    groupIds
  );

  return { sharedNotes: docs, loading };
}

/** Все расшаренные конспекты курса — для лектора (правила требуют canEditCourse). */
export function useCourseSharedNotes(courseId: string | null) {
  const [sharedNotes, setSharedNotes] = useState<SharedLectureNote[]>([]);
  const [loading, setLoading] = useState(true);

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
      },
      (err) => {
        debugError('[useCourseSharedNotes] snapshot error', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [courseId]);

  return { sharedNotes, loading };
}
