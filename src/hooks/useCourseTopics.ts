import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Period } from '../types/content';
import { debugLog, debugError } from '../lib/debug';
import { mapCanonicalCourseLessons } from '../lib/courseLessons';
import {
  readCourseContentCache,
  writeCourseContentCache,
  subscribeCourseContentInvalidation,
} from '../lib/courseContentCache';

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
function buildTopicsMap<T extends Period>(topicsList: T[]): Map<string, T> {
  return new Map(topicsList.map((topic) => [topic.period, topic]));
}

interface TopicsState<T> {
  topics: Map<string, T>;
  loading: boolean;
  error: Error | null;
}

export function useCourseTopics<T extends Period>(
  collectionName: CourseCollection,
  debugLabel: string
) {
  // SWR: первый рендер — из localStorage-кэша (если он валиден), затем фоновое
  // обновление из Firestore. Кэш хранит массив тем, Map собирается при чтении.
  const [state, setState] = useState<TopicsState<T>>(() => {
    const cached = readCourseContentCache<T[]>(collectionName);
    return {
      topics: cached ? buildTopicsMap(cached) : new Map<string, T>(),
      loading: !cached,
      error: null,
    };
  });

  const loadTopics = useCallback(async () => {
    try {
      const q = query(
        collection(db, collectionName),
        where('published', '==', true),
        orderBy('order', 'asc')
      );

      const snapshot = await getDocs(q);
      const courseId = COURSE_BY_COLLECTION[collectionName];
      const normalizedLessons = mapCanonicalCourseLessons(courseId, snapshot.docs);

      const topicsList = normalizedLessons.map((lesson) => {
        const topic = { ...lesson } as T & { sourceDocId?: string };
        delete topic.sourceDocId;
        return topic as T;
      });

      writeCourseContentCache(collectionName, topicsList);
      debugLog(`${debugLabel} loaded`, topicsList.length);
      setState({ topics: buildTopicsMap(topicsList), loading: false, error: null });
    } catch (err) {
      debugError(`Error loading ${debugLabel}`, err);
      // Ошибка фоновой ревалидации не перекрывает уже показанные данные
      setState((prev) => ({
        topics: prev.topics,
        loading: false,
        error: prev.topics.size ? null : (err as Error),
      }));
    }
  }, [collectionName, debugLabel]);

  useEffect(() => {
    loadTopics();
    return subscribeCourseContentInvalidation(collectionName, loadTopics);
  }, [collectionName, loadTopics]);

  return { topics: state.topics, loading: state.loading, error: state.error, reload: loadTopics };
}
