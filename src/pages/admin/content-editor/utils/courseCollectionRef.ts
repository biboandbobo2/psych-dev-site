import { isCoreCourse, CORE_COURSE_META } from '../../../../constants/courses';

/**
 * Returns the top-level Firestore collection name for a given course,
 * or null for dynamic (non-core) courses that use sub-collections.
 *
 * Core courses:
 *   - development → "periods"
 *   - clinical    → "clinical-topics"
 *   - general     → "general-topics"
 *
 * Dynamic courses use courses/{courseId}/lessons and return null here.
 */
export function getCourseCollectionName(courseId: string): string | null {
  if (isCoreCourse(courseId)) {
    return CORE_COURSE_META[courseId].collection;
  }
  return null;
}
