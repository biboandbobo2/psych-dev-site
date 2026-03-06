import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Period } from '../types/content';
import { debugLog, debugError } from '../lib/debug';
import { getCanonicalCourseLessonId } from '../lib/courseLessons';

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
      const topicsMap = new Map<string, { topic: T; sourceDocId: string }>();
      const courseId = COURSE_BY_COLLECTION[collectionName];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as T;
        const lessonId = getCanonicalCourseLessonId(courseId, docSnap.id, data);
        const current = topicsMap.get(lessonId);
        const nextIsCanonicalDoc = docSnap.id === lessonId;
        const currentIsCanonicalDoc = current?.sourceDocId === lessonId;

        if (current && currentIsCanonicalDoc && !nextIsCanonicalDoc) {
          return;
        }

        topicsMap.set(lessonId, {
          topic: {
            ...data,
            period: lessonId,
          },
          sourceDocId: docSnap.id,
        });
      });

      const normalizedTopics = new Map<string, T>();
      topicsMap.forEach(({ topic }, lessonId) => {
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
