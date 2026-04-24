import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { debugError } from '../lib/debug';
import type { Group } from '../types/groups';
import { normalizeGroupDoc } from './useMyGroups';
import { useAuthStore } from '../stores/useAuthStore';

/**
 * Группы, в которых текущий пользователь назначен администратором объявлений.
 * Супер-админ не попадает в announcementAdminIds — для него используйте прямой
 * useAllGroups или проверку role === 'super-admin'.
 */
export function useMyAnnouncementGroups() {
  const user = useAuthStore((s) => s.user);
  const userRole = useAuthStore((s) => s.userRole);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || userRole !== 'admin') {
      setGroups([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, 'groups'),
      where('announcementAdminIds', 'array-contains', user.uid)
    );
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const next = snap.docs
          .map((d) => normalizeGroupDoc(d.id, d.data()))
          .filter((g): g is Group => g !== null);
        setGroups(next);
        setLoading(false);
      },
      (err) => {
        debugError('useMyAnnouncementGroups: snapshot error', err);
        setGroups([]);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [user, userRole]);

  return { groups, loading };
}
