import { useMemo } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { canEditCourse } from '../types/user';
import { useCourses, type CourseOption } from './useCourses';

/**
 * Курсы, доступные текущему админу для редактирования («кабинет автора»).
 *
 * super-admin получает весь список, admin — только курсы из своего
 * `adminEditableCourses`. Обёртка над `useCourses({ includeUnpublished: true })`:
 * сам `useCourses` остаётся нетронутым — он обслуживает студенческий UI.
 */
export function filterEditableCourses(
  courses: CourseOption[],
  role: Parameters<typeof canEditCourse>[0],
  adminEditableCourses: string[] | null | undefined
): CourseOption[] {
  return courses.filter((course) => canEditCourse(role, adminEditableCourses, course.id));
}

export function useEditableCourses() {
  const { courses, loading, error, reload } = useCourses({ includeUnpublished: true });
  const userRole = useAuthStore((state) => state.userRole);
  const adminEditableCourses = useAuthStore((state) => state.adminEditableCourses);

  const editableCourses = useMemo(
    () => filterEditableCourses(courses, userRole, adminEditableCourses),
    [courses, userRole, adminEditableCourses]
  );

  const courseMap = useMemo(() => {
    const map = new Map<string, CourseOption>();
    editableCourses.forEach((course) => map.set(course.id, course));
    return map;
  }, [editableCourses]);

  return { courses: editableCourses, courseMap, loading, error, reload };
}
