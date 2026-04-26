import { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { debugError } from '../lib/debug';
import {
  normalizeGroupAnnouncement,
  normalizeGroupEvent,
  type GroupAnnouncement,
  type GroupEvent,
} from '../types/groupFeed';

export interface AdminCalendarFeed {
  announcements: GroupAnnouncement[];
  events: GroupEvent[];
  loading: boolean;
}

/**
 * Объединённая лента announcements + events для админ-календаря.
 * Подписывается на каждую переданную группу, агрегирует и сортирует.
 *
 * @param groupIds — пустой массив = пусто, не подписываемся.
 */
export function useAdminCalendarFeed(groupIds: string[]): AdminCalendarFeed {
  const [announcements, setAnnouncements] = useState<GroupAnnouncement[]>([]);
  const [events, setEvents] = useState<GroupEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Стабилизируем сигнал зависимости — порядок ID не должен матиться, важен набор.
  const key = [...groupIds].sort().join(',');

  useEffect(() => {
    if (groupIds.length === 0) {
      setAnnouncements([]);
      setEvents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubs: Unsubscribe[] = [];
    const annPerGroup = new Map<string, GroupAnnouncement[]>();
    const evPerGroup = new Map<string, GroupEvent[]>();
    let pending = groupIds.length * 2;

    const emit = () => {
      const flatAnn: GroupAnnouncement[] = [];
      annPerGroup.forEach((list) => flatAnn.push(...list));
      flatAnn.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
      const flatEv: GroupEvent[] = [];
      evPerGroup.forEach((list) => flatEv.push(...list));
      flatEv.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
      setAnnouncements(flatAnn);
      setEvents(flatEv);
    };

    groupIds.forEach((groupId) => {
      unsubs.push(
        onSnapshot(
          query(
            collection(db, 'groups', groupId, 'announcements'),
            orderBy('createdAt', 'desc')
          ),
          (snap) => {
            const next = snap.docs
              .map((d) => normalizeGroupAnnouncement(groupId, d.id, d.data()))
              .filter((a): a is GroupAnnouncement => a !== null);
            annPerGroup.set(groupId, next);
            emit();
            if (pending > 0) {
              pending -= 1;
              if (pending === 0) setLoading(false);
            }
          },
          (err) => {
            debugError('useAdminCalendarFeed announcements', err);
            if (pending > 0) {
              pending -= 1;
              if (pending === 0) setLoading(false);
            }
          }
        )
      );
      unsubs.push(
        onSnapshot(
          query(
            collection(db, 'groups', groupId, 'events'),
            orderBy('createdAt', 'desc')
          ),
          (snap) => {
            const next = snap.docs
              .map((d) => normalizeGroupEvent(groupId, d.id, d.data()))
              .filter((e): e is GroupEvent => e !== null);
            evPerGroup.set(groupId, next);
            emit();
            if (pending > 0) {
              pending -= 1;
              if (pending === 0) setLoading(false);
            }
          },
          (err) => {
            debugError('useAdminCalendarFeed events', err);
            if (pending > 0) {
              pending -= 1;
              if (pending === 0) setLoading(false);
            }
          }
        )
      );
    });

    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { announcements, events, loading };
}
