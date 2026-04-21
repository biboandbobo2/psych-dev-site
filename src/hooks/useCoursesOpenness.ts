import { useEffect, useMemo, useState } from 'react';
import { getDocs, orderBy, query } from 'firebase/firestore';
import { getCourseLessonsCollectionRef, mapCanonicalCourseLessons } from '../lib/courseLessons';
import { isCourseOpen } from '../lib/courseOpenness';
import { debugError } from '../lib/debug';

/**
 * Для заданного набора курсов параллельно подгружает все их занятия из
 * Firestore и возвращает множество id «открытых» курсов (в смысле
 * isCourseOpen — все видео во всех опубликованных уроках публичные).
 *
 * Используется гостевым и guest-registered-лендингом: индикатор
 * 🔓 «Открытый курс» и фильтрация списка «вам уже открыто».
 */
export function useCoursesOpenness(courseIds: string[]): {
  openCourseIds: Set<string>;
  loading: boolean;
} {
  const key = useMemo(() => courseIds.slice().sort().join('|'), [courseIds]);
  const [openCourseIds, setOpenCourseIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(courseIds.length > 0);

  useEffect(() => {
    if (!key) {
      setOpenCourseIds(new Set());
      setLoading(false);
      return;
    }

    const ids = key.split('|');
    let cancelled = false;
    setLoading(true);

    Promise.all(
      ids.map(async (courseId) => {
        try {
          const lessonsRef = getCourseLessonsCollectionRef(courseId);
          const snapshot = await getDocs(query(lessonsRef, orderBy('order', 'asc')));
          const lessons = mapCanonicalCourseLessons(courseId, snapshot.docs);
          return { courseId, isOpen: isCourseOpen(lessons) };
        } catch (error) {
          debugError('[useCoursesOpenness] failed to load lessons', { courseId, error });
          return { courseId, isOpen: false };
        }
      })
    )
      .then((results) => {
        if (cancelled) return;
        const open = new Set(results.filter((r) => r.isOpen).map((r) => r.courseId));
        setOpenCourseIds(open);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [key]);

  return { openCourseIds, loading };
}
