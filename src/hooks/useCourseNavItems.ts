import { useMemo } from 'react';
import type { Period } from '../types/content';
import { CLINICAL_ROUTE_CONFIG, GENERAL_ROUTE_CONFIG, ROUTE_CONFIG } from '../routes';
import { isCoreCourse } from '../constants/courses';
import { useDynamicCourseLessons } from './useDynamicCourseLessons';

export interface CourseNavItem {
  path: string;
  label: string;
}

export function buildCourseNavItems(
  courseId: string | null,
  topics: Map<string, Period>
): CourseNavItem[] {
  if (!courseId) return [];

  if (courseId === 'development') {
    return ROUTE_CONFIG.map((config) => ({
      path: config.path,
      label: config.navLabel,
    }));
  }
  if (courseId === 'clinical') {
    return CLINICAL_ROUTE_CONFIG.map((config) => ({
      path: config.path,
      label: config.navLabel,
    }));
  }
  if (courseId === 'general') {
    return GENERAL_ROUTE_CONFIG.map((config) => ({
      path: config.path,
      label: config.navLabel,
    }));
  }

  const entries = Array.from(topics.entries())
    .filter(([, topic]) => topic?.published !== false)
    .map(([periodId, topic]) => ({
      path: `/course/${courseId}/${periodId}`,
      label: topic.title || topic.label || periodId,
      order: topic.order ?? 999,
    }))
    .sort((a, b) => a.order - b.order);
  return entries.map(({ path, label }) => ({ path, label }));
}

export function useCourseNavItems(courseId: string | null) {
  const isCore = courseId ? isCoreCourse(courseId) : false;
  const dynamicCourseId = courseId && !isCore ? courseId : null;
  const { topics, loading, error } = useDynamicCourseLessons(dynamicCourseId, true);

  const items = useMemo<CourseNavItem[]>(
    () => buildCourseNavItems(courseId, topics),
    [courseId, topics]
  );

  return { items, loading: isCore ? false : loading, error };
}
