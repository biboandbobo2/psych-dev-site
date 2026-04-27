import {
  getCoreCourseRoutes,
  getLessonRouteOrderMap,
  sortCourseLessonItems,
} from '../../../lib/courseLessons';
import type { AdminPeriod } from './types';

const FALLBACK_PLACEHOLDER_TEXT = 'Контент для этого возраста пока не создан.';
const INTRO_IDS = new Set(['intro', 'clinical-intro']);

/**
 * Для core-курсов: к загруженным периодам добавляет «placeholder»-карточки
 * для всех периодов из ROUTE_CONFIG/CLINICAL_ROUTE_CONFIG/GENERAL_ROUTE_CONFIG,
 * которые ещё не созданы в Firestore. Intro-карточки исключаются.
 *
 * Для НЕ-core курсов возвращает входной массив без изменений (только сортировка).
 *
 * Сортировка идёт через sortCourseLessonItems с draftsLast: true.
 */
export function mergeCoreCoursePlaceholders(
  courseId: string,
  realPeriods: readonly AdminPeriod[],
  options: { isCore: boolean },
): AdminPeriod[] {
  if (!options.isCore) {
    return sortCourseLessonItems(courseId, [...realPeriods], { draftsLast: true }) as AdminPeriod[];
  }

  const coreRoutes = getCoreCourseRoutes(courseId);
  const routeOrderMap = getLessonRouteOrderMap(courseId);
  const existingIds = new Set(realPeriods.map((p) => p.period));

  const placeholders: AdminPeriod[] = coreRoutes
    .filter((c) => c.periodId && !existingIds.has(c.periodId) && !INTRO_IDS.has(c.periodId))
    .map((c) => ({
      period: c.periodId!,
      title: c.navLabel,
      subtitle: c.placeholderText || c.meta?.description || FALLBACK_PLACEHOLDER_TEXT,
      published: false,
      order: routeOrderMap[c.periodId!] ?? Number.MAX_SAFE_INTEGER,
      accent: '',
      isPlaceholder: true,
    }));

  return sortCourseLessonItems(courseId, [...realPeriods, ...placeholders], {
    draftsLast: true,
  }) as AdminPeriod[];
}
