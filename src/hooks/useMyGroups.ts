import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { debugError } from '../lib/debug';
import type { Group } from '../types/groups';
import { useAuthStore } from '../stores/useAuthStore';

export function normalizeGroupDoc(id: string, data: unknown): Group | null {
  if (!data || typeof data !== 'object') return null;
  const raw = data as Record<string, unknown>;
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!name) return null;
  const members = Array.isArray(raw.memberIds)
    ? raw.memberIds.filter((x): x is string => typeof x === 'string')
    : [];
  const courses = Array.isArray(raw.grantedCourses)
    ? raw.grantedCourses.filter((x): x is string => typeof x === 'string')
    : [];
  const announcers = Array.isArray(raw.announcementAdminIds)
    ? raw.announcementAdminIds.filter((x): x is string => typeof x === 'string')
    : [];
  const featured = Array.isArray(raw.featuredCourseIds)
    ? raw.featuredCourseIds.filter((x): x is string => typeof x === 'string')
    : undefined;
  return {
    id,
    name,
    description: typeof raw.description === 'string' ? raw.description : undefined,
    memberIds: members,
    grantedCourses: courses,
    announcementAdminIds: announcers,
    featuredCourseIds: featured,
  };
}

/**
 * Подписка на группы, в которых состоит текущий пользователь.
 * Возвращает [] пока не авторизован.
 */
export function useMyGroups() {
  const user = useAuthStore((s) => s.user);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setGroups([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, 'groups'),
      where('memberIds', 'array-contains', user.uid)
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
        debugError('useMyGroups: snapshot error', err);
        setGroups([]);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [user]);

  return { groups, loading };
}
