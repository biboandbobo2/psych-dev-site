import { useEffect, useMemo, useState } from 'react';
import { isCourseOpen } from '../lib/courseOpenness';
import {
  COURSE_NAV_INDEX_VERSION,
  fetchCourseNavIndexDoc,
  loadPublishedCourseLessons,
  withTimeout,
} from '../lib/courseNavIndex';
import { isPublicRestAvailable, restGetPublicDoc } from '../lib/firestorePublicRest';
import { debugError } from '../lib/debug';

const LOAD_TIMEOUT_MS = 8000;

/**
 * Множество id «открытых» курсов (в смысле isCourseOpen — все видео во всех
 * опубликованных уроках публичные) для заданного набора курсов.
 *
 * LS-3: флаг courseOpen лежит в nav-индексе (1 маленький doc-read на курс);
 * fallback — как раньше, полная коллекция занятий курса.
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
        // LS-4: индекс REST-запросом без ожидания Firebase Auth (см.
        // firestorePublicRest) — бейджи «Открытый курс» на гостевом /home
        // не ждут auth-инициализацию. Ошибка — молча в SDK-путь ниже.
        if (isPublicRestAvailable()) {
          try {
            const restDoc = await restGetPublicDoc(`courseNavIndex/${courseId}`);
            if (restDoc?.v === COURSE_NAV_INDEX_VERSION && typeof restDoc.courseOpen === 'boolean') {
              return { courseId, isOpen: restDoc.courseOpen };
            }
          } catch {
            // SDK-путь ниже
          }
        }
        try {
          const indexDoc = await withTimeout(
            fetchCourseNavIndexDoc(courseId),
            LOAD_TIMEOUT_MS,
            `navIndex:${courseId}`
          );
          if (typeof indexDoc?.courseOpen === 'boolean') {
            return { courseId, isOpen: indexDoc.courseOpen };
          }
        } catch (error) {
          debugError('[useCoursesOpenness] nav index read failed, falling back', {
            courseId,
            error,
          });
        }
        try {
          const lessons = await withTimeout(
            loadPublishedCourseLessons(courseId),
            LOAD_TIMEOUT_MS,
            `lessons:${courseId}`
          );
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
