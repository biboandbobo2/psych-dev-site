import { CLINICAL_ROUTE_CONFIG, GENERAL_ROUTE_CONFIG, ROUTE_CONFIG } from '../routes';
import type { RouteConfig } from '../routes/types';
import type { Period } from '../types/content';

export interface CourseNavItem {
  path: string;
  label: string;
  order?: number;
}

interface BuildCourseNavItemsOptions {
  includeMissingStaticRoutes?: boolean;
}

const FALLBACK_ORDER = Number.MAX_SAFE_INTEGER;

function getCourseRoutes(courseId: string): RouteConfig[] {
  if (courseId === 'development') return ROUTE_CONFIG;
  if (courseId === 'clinical') return CLINICAL_ROUTE_CONFIG;
  if (courseId === 'general') return GENERAL_ROUTE_CONFIG;
  return [];
}

function getCourseLessonBasePath(courseId: string): string {
  if (courseId === 'development') return '/';
  if (courseId === 'clinical') return '/clinical/';
  if (courseId === 'general') return '/general/';
  return `/course/${courseId}/`;
}

function sortNavItemsWithRouteFallback<T extends CourseNavItem>(
  routes: Array<{ path: string }>,
  items: T[]
): T[] {
  const routeOrderMap = new Map(routes.map((route, index) => [route.path, index]));

  return [...items].sort((a, b) => {
    const orderA = typeof a.order === 'number' ? a.order : FALLBACK_ORDER;
    const orderB = typeof b.order === 'number' ? b.order : FALLBACK_ORDER;
    if (orderA !== orderB) {
      return orderA - orderB;
    }

    const routeOrderA = routeOrderMap.get(a.path) ?? FALLBACK_ORDER;
    const routeOrderB = routeOrderMap.get(b.path) ?? FALLBACK_ORDER;
    if (routeOrderA !== routeOrderB) {
      return routeOrderA - routeOrderB;
    }

    return String(a.label || a.path).localeCompare(String(b.label || b.path), 'ru');
  });
}

export function buildCourseNavItems(
  courseId: string | null,
  topics: Map<string, Period>,
  options: BuildCourseNavItemsOptions = {}
): CourseNavItem[] {
  if (!courseId) return [];

  const { includeMissingStaticRoutes = true } = options;
  const routes = getCourseRoutes(courseId);
  const staticIds = new Set(routes.map((route) => route.periodId).filter(Boolean));

  const items: CourseNavItem[] = routes
    .filter((config) => {
      if (!config.periodId) return true;
      const data = topics.get(config.periodId);
      if (!data) return includeMissingStaticRoutes;
      return data.published !== false;
    })
    .map((config, routeIndex) => {
      const data = config.periodId ? topics.get(config.periodId) : null;
      return {
        path: config.path,
        label: data?.label || data?.title || config.navLabel,
        order: data?.order ?? routeIndex,
      };
    });

  topics.forEach((topic, periodId) => {
    if (staticIds.has(periodId) || topic.published === false) return;
    items.push({
      path: `${getCourseLessonBasePath(courseId)}${periodId}`,
      label: topic.title || topic.label || periodId,
      order: topic.order,
    });
  });

  return sortNavItemsWithRouteFallback(routes, items).map(({ path, label }) => ({ path, label }));
}
