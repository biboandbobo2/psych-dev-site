import type { GeneralTopic } from '../types/content';
import { useCourseTopics } from './useCourseTopics';

/**
 * Хук для загрузки тем общей психологии из Firestore
 * Wrapper над generic хуком useCourseTopics
 */
export function useGeneralTopics() {
  return useCourseTopics<GeneralTopic>('general-topics', 'General topics');
}
