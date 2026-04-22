import { useMemo } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { useCourses } from './useCourses';
import { hasCourseAccess, type CourseAccessMap, type UserRole } from '../types/user';

export type GuestStatus = 'unauthorized' | 'registered-guest' | 'student';

export interface GuestStatusInfo {
  status: GuestStatus;
  accessibleCount: number;
  loading: boolean;
}

/**
 * Чистая функция для расчёта статуса гостя/студента. Тестируется отдельно,
 * хук-обёртка просто подставляет реальные значения из стора и списка курсов.
 */
export function computeGuestStatus(params: {
  isAuthenticated: boolean;
  userRole: UserRole | null;
  courseAccess: CourseAccessMap | null;
  courseIds: string[];
  groupGrantedCourses?: Record<string, boolean>;
}): Omit<GuestStatusInfo, 'loading'> {
  const { isAuthenticated, userRole, courseAccess, courseIds, groupGrantedCourses } = params;
  if (!isAuthenticated) {
    return { status: 'unauthorized', accessibleCount: 0 };
  }

  const accessibleCount = courseIds.reduce((count, courseId) => {
    if (hasCourseAccess(userRole, courseAccess, courseId)) return count + 1;
    if (groupGrantedCourses?.[courseId] === true) return count + 1;
    return count;
  }, 0);

  const status: GuestStatus = accessibleCount === 0 ? 'registered-guest' : 'student';
  return { status, accessibleCount };
}

/**
 * Определяет, какой из трёх сценариев /home показывать пользователю:
 * - unauthorized: не залогинен
 * - registered-guest: залогинен, но нет доступа ни к одному из существующих
 *   курсов (включая динамические). Роль в Firestore может быть «guest» или
 *   любой другой — сейчас смотрим исключительно на реальный набор доступов.
 * - student: хотя бы один курс открыт (либо статус admin/super-admin).
 */
export function useGuestStatus(): GuestStatusInfo {
  const user = useAuthStore((state) => state.user);
  const userRole = useAuthStore((state) => state.userRole);
  const courseAccess = useAuthStore((state) => state.courseAccess);
  const groupGrantedCourses = useAuthStore((state) => state.groupGrantedCourses);
  const { courses, loading } = useCourses();

  const { status, accessibleCount } = useMemo(
    () =>
      computeGuestStatus({
        isAuthenticated: Boolean(user),
        userRole,
        courseAccess,
        courseIds: courses.map((course) => course.id),
        groupGrantedCourses,
      }),
    [user, userRole, courseAccess, groupGrantedCourses, courses]
  );

  return { status, accessibleCount, loading };
}
