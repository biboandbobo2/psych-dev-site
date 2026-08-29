import { useEffect, useState } from 'react';
import { Timestamp, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { debugError } from '../../../lib/debug';
import { getCourseLessonsCollectionRef, mapCanonicalCourseLessons } from '../../../lib/courseLessons';
import type { CourseOption } from '../../../hooks/useCourses';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const TELEMETRY_WEEKS = 4;

export interface CourseCabinetStats {
  /** null — метрику не удалось получить (нет прав или индекса) */
  lessonsPublished: number | null;
  lessonsDraft: number | null;
  questionsTotal: number | null;
  questionsLastWeek: number | null;
  events: number | null;
  uniqueStudents: number | null;
}

const EMPTY_STATS: CourseCabinetStats = {
  lessonsPublished: null,
  lessonsDraft: null,
  questionsTotal: null,
  questionsLastWeek: null,
  events: null,
  uniqueStudents: null,
};

async function loadLessonCounts(courseId: string) {
  const snapshot = await getDocs(getCourseLessonsCollectionRef(courseId));
  const lessons = mapCanonicalCourseLessons(courseId, snapshot.docs);
  const published = lessons.filter((lesson) => lesson.published !== false).length;
  return { lessonsPublished: published, lessonsDraft: lessons.length - published };
}

async function loadQuestionCounts(courseId: string) {
  const snapshot = await getDocs(
    query(collection(db, 'lectureQuestions'), where('courseId', '==', courseId))
  );
  const since = Date.now() - WEEK_MS;
  const lastWeek = snapshot.docs.filter((docSnap) => {
    const createdAt = docSnap.data().createdAt;
    return createdAt instanceof Timestamp && createdAt.toDate().getTime() >= since;
  }).length;
  return { questionsTotal: snapshot.size, questionsLastWeek: lastWeek };
}

async function loadTelemetryCounts(courseId: string) {
  const since = new Date(Date.now() - TELEMETRY_WEEKS * WEEK_MS);
  const snapshot = await getDocs(
    query(
      collection(db, 'feature_events'),
      where('courseId', '==', courseId),
      where('createdAt', '>=', Timestamp.fromDate(since))
    )
  );
  const uids = new Set<string>();
  snapshot.forEach((docSnap) => {
    const hashedUid = docSnap.data().hashedUid;
    if (typeof hashedUid === 'string' && hashedUid) uids.add(hashedUid);
  });
  return { events: snapshot.size, uniqueStudents: uids.size };
}

/** Метрика, упавшая на правах или отсутствующем индексе, не роняет карточку. */
async function safely<T extends object>(courseId: string, label: string, load: () => Promise<T>) {
  try {
    return await load();
  } catch (error) {
    debugError(`[AuthorCabinet] ${label} failed for ${courseId}`, error);
    return null;
  }
}

/**
 * Сводка по курсам автора для дашборда `/admin`. Читает существующие
 * коллекции (занятия, вопросы, телеметрия) разовыми запросами — подписок и
 * новых коллекций кабинет не заводит.
 */
export function useAuthorCabinetStats(courses: CourseOption[]) {
  const [stats, setStats] = useState<Record<string, CourseCabinetStats>>({});
  const [loading, setLoading] = useState(true);

  const courseIds = courses.map((course) => course.id).join('|');

  useEffect(() => {
    const ids = courseIds ? courseIds.split('|') : [];
    if (!ids.length) {
      setStats({});
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      const entries = await Promise.all(
        ids.map(async (courseId) => {
          const [lessons, questions, telemetry] = await Promise.all([
            safely(courseId, 'lessons', () => loadLessonCounts(courseId)),
            safely(courseId, 'questions', () => loadQuestionCounts(courseId)),
            safely(courseId, 'telemetry', () => loadTelemetryCounts(courseId)),
          ]);
          return [
            courseId,
            { ...EMPTY_STATS, ...lessons, ...questions, ...telemetry },
          ] as const;
        })
      );

      if (cancelled) return;
      setStats(Object.fromEntries(entries));
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [courseIds]);

  return { stats, loading };
}
