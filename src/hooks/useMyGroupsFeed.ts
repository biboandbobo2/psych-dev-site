import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query, type Unsubscribe } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { debugError } from '../lib/debug';
import { useMyGroups } from './useMyGroups';
import {
  normalizeGroupAnnouncement,
  normalizeGroupEvent,
  type GroupFeedItem,
} from '../types/groupFeed';

/**
 * Объединённая лента объявлений и событий из всех групп, в которых
 * состоит текущий пользователь. Сортировка — по createdAt (desc).
 */
export function useMyGroupsFeed() {
  const { groups, loading: groupsLoading } = useMyGroups();
  const [items, setItems] = useState<GroupFeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (groupsLoading) {
      setLoading(true);
      return;
    }
    if (groups.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribes: Unsubscribe[] = [];
    const perGroup = new Map<string, GroupFeedItem[]>();

    const emit = () => {
      const flat: GroupFeedItem[] = [];
      perGroup.forEach((list) => flat.push(...list));
      flat.sort((a, b) => {
        const aMs = a.createdAt?.toMillis?.() ?? 0;
        const bMs = b.createdAt?.toMillis?.() ?? 0;
        return bMs - aMs;
      });
      setItems(flat);
      setLoading(false);
    };

    groups.forEach((group) => {
      const key = group.id;
      const local: GroupFeedItem[] = [];
      perGroup.set(key, local);

      unsubscribes.push(
        onSnapshot(
          query(
            collection(db, 'groups', group.id, 'announcements'),
            orderBy('createdAt', 'desc')
          ),
          (snap) => {
            const next: GroupFeedItem[] = snap.docs
              .map((d) => {
                const ann = normalizeGroupAnnouncement(group.id, d.id, d.data());
                if (!ann) return null;
                return {
                  id: `a:${ann.id}`,
                  groupId: group.id,
                  groupName: group.name,
                  kind: 'announcement',
                  text: ann.text,
                  createdAt: ann.createdAt,
                  createdByName: ann.createdByName,
                } as GroupFeedItem;
              })
              .filter((x): x is GroupFeedItem => x !== null);
            const withoutAnn = (perGroup.get(key) ?? []).filter((x) => x.kind !== 'announcement');
            perGroup.set(key, [...withoutAnn, ...next]);
            emit();
          },
          (err) => debugError('useMyGroupsFeed announcements', err)
        )
      );

      unsubscribes.push(
        onSnapshot(
          query(
            collection(db, 'groups', group.id, 'events'),
            orderBy('createdAt', 'desc')
          ),
          (snap) => {
            const next: GroupFeedItem[] = snap.docs
              .map((d) => {
                const ev = normalizeGroupEvent(group.id, d.id, d.data());
                if (!ev) return null;
                return {
                  id: `e:${ev.id}`,
                  groupId: group.id,
                  groupName: group.name,
                  kind: 'event',
                  text: ev.text,
                  dateLabel: ev.dateLabel,
                  zoomLink: ev.zoomLink,
                  createdAt: ev.createdAt,
                  createdByName: ev.createdByName,
                } as GroupFeedItem;
              })
              .filter((x): x is GroupFeedItem => x !== null);
            const withoutEv = (perGroup.get(key) ?? []).filter((x) => x.kind !== 'event');
            perGroup.set(key, [...withoutEv, ...next]);
            emit();
          },
          (err) => debugError('useMyGroupsFeed events', err)
        )
      );
    });

    return () => unsubscribes.forEach((u) => u());
    // group ids/names shape the subscriptions; re-subscribe when list changes
  }, [groups, groupsLoading]);

  return { items, loading };
}
