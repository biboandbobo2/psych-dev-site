import { useCallback, useEffect, useMemo, useState } from 'react';
import { getDocs, orderBy, query } from 'firebase/firestore';
import type { Period } from '../types/content';
import { debugError } from '../lib/debug';
import { getCourseLessonsCollectionRef, mapCanonicalCourseLessons } from '../lib/courseLessons';
import { buildCourseNavItems, type CourseNavItem } from '../lib/courseNavItems';

export { buildCourseNavItems };

const LESSON_CACHE = new Map<string, Map<string, Period>>();
const LESSON_REQUESTS = new Map<string, Promise<Map<string, Period>>>();

function cloneLessonMap(topics: Map<string, Period>): Map<string, Period> {
  return new Map(topics);
}

async function loadCourseLessonMap(courseId: string): Promise<Map<string, Period>> {
  const cached = LESSON_CACHE.get(courseId);
  if (cached) return cloneLessonMap(cached);

  const inFlight = LESSON_REQUESTS.get(courseId);
  if (inFlight) return inFlight.then(cloneLessonMap);

  const request = getDocs(query(getCourseLessonsCollectionRef(courseId), orderBy('order', 'asc')))
    .then((snapshot) => {
      const lessons = mapCanonicalCourseLessons(courseId, snapshot.docs)
        .filter((lesson) => lesson.published !== false);
      const next = new Map<string, Period>();
      lessons.forEach((lesson) => {
        next.set(lesson.period, lesson as Period);
      });
      LESSON_CACHE.set(courseId, cloneLessonMap(next));
      return next;
    })
    .finally(() => {
      LESSON_REQUESTS.delete(courseId);
    });

  LESSON_REQUESTS.set(courseId, request);
  return request.then(cloneLessonMap);
}

export function resetCourseNavItemsCacheForTests() {
  LESSON_CACHE.clear();
  LESSON_REQUESTS.clear();
}

export function useCourseNavItems(courseId: string | null) {
  const [topics, setTopics] = useState<Map<string, Period>>(new Map());
  const [loading, setLoading] = useState(Boolean(courseId));
  const [error, setError] = useState<Error | null>(null);

  const loadLessons = useCallback(async () => {
    if (!courseId) {
      setTopics(new Map());
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setTopics(await loadCourseLessonMap(courseId));
    } catch (err) {
      debugError('[useCourseNavItems] Failed to load course lessons', { courseId, error: err });
      setTopics(new Map());
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void loadLessons();
  }, [loadLessons]);

  const items = useMemo<CourseNavItem[]>(
    () => buildCourseNavItems(courseId, topics),
    [courseId, topics]
  );

  return { items, loading, error, reload: loadLessons };
}
