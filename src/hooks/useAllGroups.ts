import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { debugError } from '../lib/debug';
import type { Group } from '../types/groups';
import { normalizeGroupDoc } from './useMyGroups';
import { useAuthStore } from '../stores/useAuthStore';

/**
 * Полный список групп. Доступно админам и со-админам — они ведут потоки
 * на /admin/users?tab=streams (см. canReadGroup в firestore.rules).
 */
export function useAllGroups() {
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const isCoAdmin = useAuthStore((s) => s.isCoAdmin);
  const canRead = isAdmin || isCoAdmin;
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canRead) {
      setGroups([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(collection(db, 'groups'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const next = snap.docs
          .map((d) => normalizeGroupDoc(d.id, d.data()))
          .filter((g): g is Group => g !== null);
        setGroups(next);
        setLoading(false);
        setError(null);
      },
      (err) => {
        debugError('useAllGroups: snapshot error', err);
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [canRead]);

  return { groups, loading, error };
}
