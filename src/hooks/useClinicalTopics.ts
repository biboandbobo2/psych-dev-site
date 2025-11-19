import type { ClinicalTopic } from '../types/content';
import { useCourseTopics } from './useCourseTopics';

/**
 * Хук для загрузки клинических тем из Firestore
 * Wrapper над generic хуком useCourseTopics
 */
export function useClinicalTopics() {
  return useCourseTopics<ClinicalTopic>('clinical-topics', 'Clinical topics');
}
