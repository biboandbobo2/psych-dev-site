import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../stores/useAuthStore';
import { debugError } from '../lib/debug';
import {
  mapLectureQuestionRecord,
  type LectureQuestion,
  type LectureQuestionInput,
} from '../types/lectureQuestions';

function sortByCreatedAtDesc(questions: LectureQuestion[]) {
  return [...questions].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/** Создание и удаление вопросов (без подписки). */
export function useLectureQuestionActions() {
  const user = useAuthStore((s) => s.user);

  const createQuestion = useCallback(
    async (input: LectureQuestionInput) => {
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
        startMs: input.startMs ?? null,
        text: input.text,
        visibility: input.visibility,
        groupId: input.visibility === 'group' ? input.groupId ?? null : null,
        createdAt: serverTimestamp(),
      };

      const ref = await addDoc(collection(db, 'lectureQuestions'), payload);
      return ref.id;
    },
    [user]
  );

  const deleteQuestion = useCallback(async (questionId: string) => {
    await deleteDoc(doc(db, 'lectureQuestions', questionId));
  }, []);

  return { createQuestion, deleteQuestion };
}

/**
 * Вопросы занятия для студента: вопросы его групп (visibility='group')
 * плюс его собственные (включая «только лектору»). Только equality-фильтры —
 * composite-индексы не нужны, сортировка на клиенте.
 */
export function useLessonQuestions(
  courseId: string | null,
  periodId: string | null,
  groupIds: string[]
) {
  const user = useAuthStore((s) => s.user);
  const [bySource, setBySource] = useState<Record<string, LectureQuestion[]>>({});
  const [loading, setLoading] = useState(true);
  const groupKey = groupIds.join(',');

  useEffect(() => {
    setBySource({});

    if (!courseId || !periodId || !user) {
      setLoading(false);
      return undefined;
    }

    const sources: Array<{ key: string; constraints: QueryConstraint[] }> = groupIds.map(
      (groupId) => ({
        key: `group:${groupId}`,
        constraints: [
          where('courseId', '==', courseId),
          where('periodId', '==', periodId),
          where('groupId', '==', groupId),
          where('visibility', '==', 'group'),
        ],
      })
    );
    sources.push({
      key: 'own',
      constraints: [
        where('courseId', '==', courseId),
        where('periodId', '==', periodId),
        where('authorUid', '==', user.uid),
      ],
    });

    setLoading(true);
    let pending = sources.length;

    const unsubscribes = sources.map(({ key, constraints }) =>
      onSnapshot(
        query(collection(db, 'lectureQuestions'), ...constraints),
        (snap) => {
          setBySource((current) => ({
            ...current,
            [key]: snap.docs.map((d) => mapLectureQuestionRecord(d.id, d.data())),
          }));
          pending = Math.max(0, pending - 1);
          if (pending === 0) {
            setLoading(false);
          }
        },
        (err) => {
          debugError('[useLessonQuestions] snapshot error', key, err);
          pending = Math.max(0, pending - 1);
          if (pending === 0) {
            setLoading(false);
          }
        }
      )
    );

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, periodId, groupKey, user]);

  const questions = useMemo(() => {
    const seen = new Set<string>();
    const merged: LectureQuestion[] = [];
    for (const list of Object.values(bySource)) {
      for (const question of list) {
        if (!seen.has(question.id)) {
          seen.add(question.id);
          merged.push(question);
        }
      }
    }
    return sortByCreatedAtDesc(merged);
  }, [bySource]);

  return { questions, loading };
}

/** Все вопросы курса — для лектора (правила требуют canEditCourse). */
export function useCourseQuestions(courseId: string | null) {
  const [questions, setQuestions] = useState<LectureQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) {
      setQuestions([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      query(collection(db, 'lectureQuestions'), where('courseId', '==', courseId)),
      (snap) => {
        setQuestions(
          sortByCreatedAtDesc(snap.docs.map((d) => mapLectureQuestionRecord(d.id, d.data())))
        );
        setLoading(false);
        setError(null);
      },
      (err) => {
        debugError('[useCourseQuestions] snapshot error', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [courseId]);

  return { questions, loading, error };
}
