import { useCallback, useEffect, useState } from 'react';
import { getDocs, orderBy, query } from 'firebase/firestore';
import type { Period } from '../types/content';
import { debugError } from '../lib/debug';
import { getCourseLessonsCollectionRef } from '../lib/courseLessons';
import { isCoreCourse } from '../constants/courses';

export function useDynamicCourseLessons(courseId: string | null, publishedOnly: boolean = true) {
  const [topics, setTopics] = useState<Map<string, Period>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadLessons = useCallback(async () => {
    if (!courseId || isCoreCourse(courseId)) {
      setTopics(new Map());
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const lessonsRef = getCourseLessonsCollectionRef(courseId);
      const q = query(lessonsRef, orderBy('order', 'asc'));
      const snapshot = await getDocs(q);
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

      setTopics(map);
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
