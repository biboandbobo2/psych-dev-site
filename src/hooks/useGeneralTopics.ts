import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { GeneralTopic } from '../types/content';
import { debugLog, debugError } from '../lib/debug';

/**
 * Хук для загрузки тем общей психологии из Firestore
 */
export function useGeneralTopics() {
  const [topics, setTopics] = useState<Map<string, GeneralTopic>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadTopics();
  }, []);

  async function loadTopics() {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'general-topics'),
        where('published', '==', true),
        orderBy('order', 'asc')
      );

      const snapshot = await getDocs(q);
      const topicsMap = new Map<string, GeneralTopic>();

      snapshot.forEach((doc) => {
        const data = doc.data() as GeneralTopic;
        topicsMap.set(data.period, data);
      });

      debugLog('General psychology topics loaded', topicsMap.size);
      setTopics(topicsMap);
    } catch (err) {
      debugError('Error loading general psychology topics', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }

  return { topics, loading, error, reload: loadTopics };
}

/**
 * Хук для загрузки одной темы общей психологии
 */
export function useGeneralTopic(periodId: string) {
  const [topic, setTopic] = useState<GeneralTopic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadTopic();
  }, [periodId]);

  async function loadTopic() {
    try {
      setLoading(true);
      const docRef = doc(db, 'general-topics', periodId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setTopic(docSnap.data() as GeneralTopic);
      } else {
        setTopic(null);
      }
    } catch (err) {
      debugError('Error loading general psychology topic', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }

  return { topic, loading, error, reload: loadTopic };
}
