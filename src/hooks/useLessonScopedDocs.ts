import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  onSnapshot,
  query,
  where,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../stores/useAuthStore';
import { debugError } from '../lib/debug';

/**
 * Общая подписка для «документов занятия, видимых студенту»:
 * документы его групп (visibility='group') плюс его собственные.
 * Используется вопросами и расшаренными конспектами. Только
 * equality-фильтры — composite-индексы не нужны, сортировка на клиенте.
 */
export function useLessonScopedDocs<T extends { id: string; createdAt: Date }>(
  collectionName: string,
  mapRecord: (id: string, data: Record<string, unknown>) => T,
  courseId: string | null,
  periodId: string | null,
  groupIds: string[]
) {
  const user = useAuthStore((s) => s.user);
  const [bySource, setBySource] = useState<Record<string, T[]>>({});
  const [loading, setLoading] = useState(true);
  const groupKey = groupIds.join(',');

  useEffect(() => {
    setBySource({});

    if (!courseId || !periodId || !user) {
      setLoading(false);
      return undefined;
    }

    const sources: Array<{ key: string; constraints: QueryConstraint[] }> = groupIds.map(
      (groupId) => ({
        key: `group:${groupId}`,
        constraints: [
          where('courseId', '==', courseId),
          where('periodId', '==', periodId),
          where('groupId', '==', groupId),
          where('visibility', '==', 'group'),
        ],
      })
    );
    sources.push({
      key: 'own',
      constraints: [
        where('courseId', '==', courseId),
        where('periodId', '==', periodId),
        where('authorUid', '==', user.uid),
      ],
    });

    setLoading(true);
    let pending = sources.length;

    const unsubscribes = sources.map(({ key, constraints }) =>
      onSnapshot(
        query(collection(db, collectionName), ...constraints),
        (snap) => {
          setBySource((current) => ({
            ...current,
            [key]: snap.docs.map((d) => mapRecord(d.id, d.data())),
          }));
          pending = Math.max(0, pending - 1);
          if (pending === 0) {
            setLoading(false);
          }
        },
        (err) => {
          debugError(`[useLessonScopedDocs] ${collectionName} snapshot error`, key, err);
          pending = Math.max(0, pending - 1);
          if (pending === 0) {
            setLoading(false);
          }
        }
      )
    );

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
    // mapRecord — стабильная module-level функция; groupIds свёрнуты в groupKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, courseId, periodId, groupKey, user]);

  const docs = useMemo(() => {
    const seen = new Set<string>();
    const merged: T[] = [];
    for (const list of Object.values(bySource)) {
      for (const item of list) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          merged.push(item);
        }
      }
    }
    return merged.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [bySource]);

  return { docs, loading };
}
