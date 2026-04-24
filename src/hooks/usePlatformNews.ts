import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { debugError } from '../lib/debug';
import {
  normalizeGroupAnnouncement,
  type GroupAnnouncement,
} from '../types/groupFeed';
import { EVERYONE_GROUP_ID } from '../../shared/groups/everyoneGroup';

/**
 * Новости платформы — объявления в системной broadcast-группе «Все».
 * Читаются публично (в `firestore.rules` есть отдельное разрешение для
 * anonymous read на `groups/everyone/announcements`).
 *
 * Возвращает все объявления, даже те, где `newsType` не выставлен (старые
 * или без пометки). В UI рендерятся только те, у кого `newsType` известен.
 */
export function usePlatformNews() {
  const [items, setItems] = useState<GroupAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(
      query(
        collection(db, 'groups', EVERYONE_GROUP_ID, 'announcements'),
        orderBy('createdAt', 'desc')
      ),
      (snap) => {
        const next = snap.docs
          .map((d) =>
            normalizeGroupAnnouncement(EVERYONE_GROUP_ID, d.id, d.data())
          )
          .filter((a): a is GroupAnnouncement => a !== null);
        setItems(next);
        setLoading(false);
      },
      (err) => {
        debugError('usePlatformNews snapshot error', err);
        setItems([]);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  return { items, loading };
}
