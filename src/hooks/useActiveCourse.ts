import { useEffect } from 'react';
import { useCourseStore } from '../stores/useCourseStore';
import type { CourseOption } from './useCourses';
import type { CourseType } from '../types/tests';

/**
 * Shared hook that computes the active course ID and auto-corrects
 * the store when the persisted value is stale (e.g. course deleted).
 *
 * Used by both AdminCourseSidebar and StudentCourseSidebar.
 */
export function useActiveCourse(courses: CourseOption[], loading: boolean): string {
  const { currentCourse, setCurrentCourse } = useCourseStore();

  const activeCourse =
    courses.find((c) => c.id === currentCourse)?.id ??
    currentCourse ??
    courses[0]?.id ??
    'development';

  useEffect(() => {
    if (loading || !courses.length) return;
    const hasCurrent = courses.some((c) => c.id === currentCourse);
    if (!hasCurrent && courses[0]?.id) {
      setCurrentCourse(courses[0].id as CourseType);
    }
  }, [courses, loading, currentCourse, setCurrentCourse]);

  return activeCourse;
}
