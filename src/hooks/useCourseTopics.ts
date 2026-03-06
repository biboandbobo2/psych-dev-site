import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Period } from '../types/content';
import { debugLog, debugError } from '../lib/debug';
import { mapCanonicalCourseLessons } from '../lib/courseLessons';

type CourseCollection = 'periods' | 'clinical-topics' | 'general-topics';

const COURSE_BY_COLLECTION: Record<CourseCollection, string> = {
  periods: 'development',
  'clinical-topics': 'clinical',
  'general-topics': 'general',
};

/**
 * Generic hook для загрузки контента курса из Firestore
 * Используется для всех трёх курсов: развития, клинической и общей психологии
 *
 * @template T - Тип документа курса (Period, ClinicalTopic, GeneralTopic)
 * @param collectionName - Название коллекции в Firestore
 * @param debugLabel - Метка для debug-логирования
 */
export function useCourseTopics<T extends Period>(
  collectionName: CourseCollection,
  debugLabel: string
) {
  const [topics, setTopics] = useState<Map<string, T>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadTopics();
  }, [collectionName]);

  async function loadTopics() {
    try {
      setLoading(true);
      const q = query(
        collection(db, collectionName),
        where('published', '==', true),
        orderBy('order', 'asc')
      );

      const snapshot = await getDocs(q);
      const courseId = COURSE_BY_COLLECTION[collectionName];
      const normalizedLessons = mapCanonicalCourseLessons(courseId, snapshot.docs);

      const normalizedTopics = new Map<string, T>();
      normalizedLessons.forEach((lesson) => {
        const topic = { ...lesson } as T & { sourceDocId?: string };
        delete topic.sourceDocId;
        const lessonId = topic.period;
        normalizedTopics.set(lessonId, topic);
      });

      debugLog(`${debugLabel} loaded`, normalizedTopics.size);
      setTopics(normalizedTopics);
    } catch (err) {
      debugError(`Error loading ${debugLabel}`, err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }

  return { topics, loading, error, reload: loadTopics };
}
