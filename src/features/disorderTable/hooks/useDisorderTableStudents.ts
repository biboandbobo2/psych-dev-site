import { useEffect, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { debugError } from '../../../lib/debug';
import type { DisorderTableStudent } from '../types';
import { computeDisplayRole } from '../../../pages/admin/users/utils/roleHelpers';
import { normalizeUserRole } from '../../../types/user';

export function useDisorderTableStudents(enabled: boolean) {
  const [students, setStudents] = useState<DisorderTableStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setStudents([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const usersQuery = query(collection(db, 'users'));

    const unsubscribe = onSnapshot(
      usersQuery,
      (snapshot) => {
        const nextStudents: DisorderTableStudent[] = snapshot.docs
          .filter((docSnap) => {
            const data = docSnap.data() as Record<string, unknown>;
            const role = normalizeUserRole(data.role);
            const courseAccess = data.courseAccess as Record<string, boolean | undefined> | null | undefined;
            return computeDisplayRole(role, courseAccess) === 'student';
          })
          .map((docSnap) => {
            const data = docSnap.data() as Record<string, unknown>;
            const email = typeof data.email === 'string' ? data.email : '';
            const displayName = typeof data.displayName === 'string'
              ? data.displayName
              : (email ? email.split('@')[0] : 'Студент');
            return {
              uid: docSnap.id,
              displayName,
              email,
            };
          })
          .sort((a, b) => a.displayName.localeCompare(b.displayName, 'ru'));

        setStudents(nextStudents);
        setLoading(false);
      },
      (err) => {
        debugError('Failed to load students for disorder table admin mode', err);
        setStudents([]);
        setError('Не удалось загрузить список студентов');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [enabled]);

  return {
    students,
    loading,
    error,
  };
}

