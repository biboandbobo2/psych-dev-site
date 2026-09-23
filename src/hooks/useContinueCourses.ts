import { useMemo } from 'react';
import { useAuthStore, useCourseAccessChecker } from '../stores/useAuthStore';
import { useCourseProgressStore } from '../stores/useCourseProgressStore';
import { getRecentlyWatchedCourseIds } from '../lib/lastCourseLesson';
import {
  resolveContinueCourses,
  resolveDefaultFeaturedCourseIds,
  sortCoursesOldestFirst,
} from '../pages/home/homeHelpers';
import type { CourseOption } from './useCourses';
import type { Group } from '../types/groups';
import type { CourseType } from '../types/tests';

/**
 * «Актуальные» курсы пользователя — общий расчёт для continue-cards на /home
 * и секции «Мои актуальные курсы» в профиле, чтобы они не расходились.
 * `courses` и `groups` передаёт вызывающий: у него уже есть свои подписки.
 */
export function useContinueCourses(courses: CourseOption[], groups: Group[]) {
  const featuredCourseIds = useAuthStore((s) => s.featuredCourseIds);
  const unfeaturedCourseIds = useAuthStore((s) => s.unfeaturedCourseIds);
  const courseAccess = useAuthStore((s) => s.courseAccess);
  const hasCourseAccess = useCourseAccessChecker();
  // Bump-тик store'а прогресса: запасной курс (последний просмотренный)
  // пересчитывается после cloud-snapshot или локальной записи.
  const progressVersion = useCourseProgressStore((s) => s.version);

  // От старых к новым: самый старый доступный — запасной «актуальный».
  const accessibleCourseIds = useMemo(
    () =>
      sortCoursesOldestFirst(courses.filter((c) => hasCourseAccess(c.id as CourseType))).map(
        (c) => c.id,
      ),
    [courses, hasCourseAccess],
  );

  // Лично открытые (купленные) курсы в порядке каталога.
  const personalCourseIds = useMemo(
    () => courses.filter((c) => courseAccess?.[c.id as CourseType] === true).map((c) => c.id),
    [courses, courseAccess],
  );

  const defaults = useMemo(
    () => resolveDefaultFeaturedCourseIds({ groups, personalCourseIds }),
    [groups, personalCourseIds],
  );

  const resolution = useMemo(() => {
    void progressVersion;
    return resolveContinueCourses({
      userFeaturedCourseIds: featuredCourseIds,
      userUnfeaturedCourseIds: unfeaturedCourseIds,
      groups,
      personalCourseIds,
      recentlyWatchedCourseIds: getRecentlyWatchedCourseIds(),
      accessibleCourseIds,
    });
  }, [
    featuredCourseIds,
    unfeaturedCourseIds,
    groups,
    personalCourseIds,
    accessibleCourseIds,
    progressVersion,
  ]);

  return { resolution, defaults, accessibleCourseIds };
}
