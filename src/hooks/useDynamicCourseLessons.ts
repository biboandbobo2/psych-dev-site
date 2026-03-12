import { useCallback, useEffect, useState } from 'react';
import { getDocs, orderBy, query } from 'firebase/firestore';
import type { Period } from '../types/content';
import { debugError } from '../lib/debug';
import { getCourseLessonsCollectionRef } from '../lib/courseLessons';
import { isCoreCourse } from '../constants/courses';

const LESSON_CACHE = new Map<string, Map<string, Period>>();
const LESSON_REQUESTS = new Map<string, Promise<Map<string, Period>>>();

function getCacheKey(courseId: string, publishedOnly: boolean): string {
  return `${courseId}::${publishedOnly ? 'published' : 'all'}`;
}

function cloneLessonMap(topics: Map<string, Period>): Map<string, Period> {
  return new Map(topics);
}

function getCachedLessonMap(courseId: string | null, publishedOnly: boolean): Map<string, Period> | null {
  if (!courseId || isCoreCourse(courseId)) {
    return null;
  }

  const cached = LESSON_CACHE.get(getCacheKey(courseId, publishedOnly));
  return cached ? cloneLessonMap(cached) : null;
}

async function fetchDynamicCourseLessons(courseId: string, publishedOnly: boolean): Promise<Map<string, Period>> {
  const lessonsRef = getCourseLessonsCollectionRef(courseId);
  const snapshot = await getDocs(query(lessonsRef, orderBy('order', 'asc')));
  const map = new Map<string, Period>();

  snapshot.forEach((docSnap) => {
    const data = docSnap.data() as Period;
    const periodId = data.period || docSnap.id;
    if (publishedOnly && data.published === false) return;

    map.set(periodId, {
      ...data,
      period: periodId,
    });
  });

  return map;
}

async function loadDynamicCourseLessons(courseId: string, publishedOnly: boolean): Promise<Map<string, Period>> {
  const cacheKey = getCacheKey(courseId, publishedOnly);
  const cached = LESSON_CACHE.get(cacheKey);
  if (cached) {
    return cloneLessonMap(cached);
  }

  const inFlight = LESSON_REQUESTS.get(cacheKey);
  if (inFlight) {
    return inFlight.then((topics) => cloneLessonMap(topics));
  }

  const request = fetchDynamicCourseLessons(courseId, publishedOnly)
    .then((topics) => {
      LESSON_CACHE.set(cacheKey, cloneLessonMap(topics));
      return topics;
    })
    .finally(() => {
      LESSON_REQUESTS.delete(cacheKey);
    });

  LESSON_REQUESTS.set(cacheKey, request);
  return request.then((topics) => cloneLessonMap(topics));
}

export async function prefetchDynamicCourseLessons(courseIds: string[], publishedOnly: boolean = true) {
  const dynamicCourseIds = [...new Set(courseIds)]
    .filter((courseId) => courseId && !isCoreCourse(courseId));

  await Promise.all(dynamicCourseIds.map((courseId) => loadDynamicCourseLessons(courseId, publishedOnly)));
}

export function resetDynamicCourseLessonsCacheForTests() {
  LESSON_CACHE.clear();
  LESSON_REQUESTS.clear();
}

export function useDynamicCourseLessons(courseId: string | null, publishedOnly: boolean = true) {
  const [topics, setTopics] = useState<Map<string, Period>>(
    () => getCachedLessonMap(courseId, publishedOnly) ?? new Map()
  );
  const [loading, setLoading] = useState(
    () => Boolean(courseId) && !isCoreCourse(courseId) && !getCachedLessonMap(courseId, publishedOnly)
  );
  const [error, setError] = useState<Error | null>(null);

  const loadLessons = useCallback(async () => {
    if (!courseId || isCoreCourse(courseId)) {
      setTopics(new Map());
      setLoading(false);
      setError(null);
      return;
    }

    const cached = getCachedLessonMap(courseId, publishedOnly);
    if (cached) {
      setTopics(cached);
      setLoading(false);
    } else {
      setTopics(new Map());
      setLoading(true);
    }

    try {
      setError(null);
      const nextTopics = await loadDynamicCourseLessons(courseId, publishedOnly);
      setTopics(nextTopics);
    } catch (err) {
      debugError('Error loading dynamic course lessons', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [courseId, publishedOnly]);

  useEffect(() => {
    loadLessons();
  }, [loadLessons]);

  return { topics, loading, error, reload: loadLessons };
}
