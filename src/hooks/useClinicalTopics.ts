import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { ClinicalTopic } from '../types/content';
import { debugLog, debugError } from '../lib/debug';

/**
 * Хук для загрузки клинических тем из Firestore
 * Упрощённая версия - загружает данные без сложной обработки
 */
export function useClinicalTopics() {
  const [topics, setTopics] = useState<Map<string, ClinicalTopic>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadTopics();
  }, []);

  async function loadTopics() {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'clinical-topics'),
        where('published', '==', true),
        orderBy('order', 'asc')
      );

      const snapshot = await getDocs(q);
      const topicsMap = new Map<string, ClinicalTopic>();

      snapshot.forEach((doc) => {
        const data = doc.data() as ClinicalTopic;
        topicsMap.set(data.period, data);
      });

      debugLog('Clinical topics loaded', topicsMap.size);
      setTopics(topicsMap);
    } catch (err) {
      debugError('Error loading clinical topics', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }

  return { topics, loading, error, reload: loadTopics };
}

/**
 * Хук для загрузки одной клинической темы
 */
export function useClinicalTopic(periodId: string) {
  const [topic, setTopic] = useState<ClinicalTopic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadTopic();
  }, [periodId]);

  async function loadTopic() {
    try {
      setLoading(true);
      const docRef = doc(db, 'clinical-topics', periodId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setTopic(docSnap.data() as ClinicalTopic);
      } else {
        setTopic(null);
      }
    } catch (err) {
      debugError('Error loading clinical topic', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }

  return { topic, loading, error, reload: loadTopic };
}
