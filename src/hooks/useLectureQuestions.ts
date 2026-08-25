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
        sourceSegmentId: input.sourceSegmentId ?? null,
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
 * плюс его собственные (включая «только лектору»).
 */
export function useLessonQuestions(
  courseId: string | null,
  periodId: string | null,
  groupIds: string[]
) {
  const { docs, loading } = useLessonScopedDocs(
    'lectureQuestions',
    mapLectureQuestionRecord,
    courseId,
    periodId,
    groupIds
  );

  return { questions: docs, loading };
}

/**
 * Свои вопросы занятия (любой видимости) — для отметок «?» на абзацах
 * конспекта. Отдельный листенер: equality-фильтры по authorUid не входят
 * в контур useLessonScopedDocs (см. LP-17 — подписки не плодить без нужды).
 */
export function useMyLectureQuestions(courseId: string | null, periodId: string | null) {
  const user = useAuthStore((s) => s.user);
  const [questions, setQuestions] = useState<LectureQuestion[]>([]);

  useEffect(() => {
    if (!courseId || !periodId || !user) {
      setQuestions([]);
      return undefined;
    }

    const unsubscribe = onSnapshot(
      query(
        collection(db, 'lectureQuestions'),
        where('authorUid', '==', user.uid),
        where('courseId', '==', courseId),
        where('periodId', '==', periodId)
      ),
      (snap) => {
        setQuestions(snap.docs.map((d) => mapLectureQuestionRecord(d.id, d.data())));
      },
      (err) => {
        debugError('[useMyLectureQuestions] snapshot error', err);
      }
    );

    return () => unsubscribe();
  }, [courseId, periodId, user]);

  return questions;
}

/**
 * Все вопросы занятия (всех групп) — лекторский режим чата в оверлее.
 * Правила требуют canEditCourse: хук включать только для лектора курса.
 */
export function useLessonAllQuestions(courseId: string | null, periodId: string | null) {
  const [questions, setQuestions] = useState<LectureQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!courseId || !periodId) {
      setQuestions([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      query(
        collection(db, 'lectureQuestions'),
        where('courseId', '==', courseId),
        where('periodId', '==', periodId)
      ),
      (snap) => {
        setQuestions(snap.docs.map((d) => mapLectureQuestionRecord(d.id, d.data())));
        setLoading(false);
      },
      (err) => {
        debugError('[useLessonAllQuestions] snapshot error', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [courseId, periodId]);

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
