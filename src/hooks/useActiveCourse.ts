import { useEffect } from 'react';
import { useCourseStore } from '../stores/useCourseStore';
import type { CourseOption } from './useCourses';
import type { CourseType } from '../types/tests';

/**
 * Shared hook that computes the active course ID and auto-corrects
 * the store when the persisted value is stale (e.g. course deleted or not
 * editable by the current admin).
 *
 * Used by both AdminCourseSidebar and StudentCourseSidebar.
 * Returns '' when the courses list is empty and loading has finished.
 */
export function useActiveCourse(courses: CourseOption[], loading: boolean): string {
  const { currentCourse, setCurrentCourse } = useCourseStore();

  const hasCurrent = courses.some((c) => c.id === currentCourse);

  // Пока список грузится — держим персистентный выбор, иначе на первом кадре
  // мигал бы чужой курс. После загрузки курс, которого нет в списке (удалён
  // или недоступен админу по editableCourses), заменяется первым доступным;
  // пустой список даёт '' — вызывающий код показывает заглушку.
  const activeCourse = hasCurrent || loading ? currentCourse : (courses[0]?.id ?? '');

  useEffect(() => {
    if (loading || !courses.length) return;
    if (!hasCurrent && courses[0]?.id) {
      setCurrentCourse(courses[0].id as CourseType);
    }
  }, [courses, hasCurrent, loading, setCurrentCourse]);

  return activeCourse;
}
