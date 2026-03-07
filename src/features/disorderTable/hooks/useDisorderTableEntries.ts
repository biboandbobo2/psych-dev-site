import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../auth/AuthProvider';
import { debugError } from '../../../lib/debug';
import {
  buildDisorderTableDocId,
  isDisorderTableCourse,
  isValidDisorderTableEntryInput,
  normalizeEntryInput,
} from '../model';
import type { DisorderTableEntry, DisorderTableEntryInput } from '../types';

function toDateSafe(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in (value as any)) {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date(0);
}

export function useDisorderTableEntries(courseId: string) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<DisorderTableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const docId = useMemo(() => {
    if (!user) return null;
    return buildDisorderTableDocId(user.uid, courseId);
  }, [user, courseId]);

  useEffect(() => {
    if (!user || !docId || !isDisorderTableCourse(courseId)) {
      setEntries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const entriesQuery = query(
      collection(db, 'disorderTables', docId, 'entries'),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      entriesQuery,
      (snapshot) => {
        const nextEntries: DisorderTableEntry[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as Record<string, unknown>;
          return {
            id: docSnap.id,
            rowIds: Array.isArray(data.rowIds) ? (data.rowIds as string[]) : [],
            columnIds: Array.isArray(data.columnIds) ? (data.columnIds as string[]) : [],
            text: typeof data.text === 'string' ? data.text : '',
            createdAt: toDateSafe(data.createdAt),
            updatedAt: toDateSafe(data.updatedAt),
          };
        });

        setEntries(nextEntries);
        setLoading(false);
      },
      (err) => {
        debugError('Failed to load disorder table entries', err);
        setError('Не удалось загрузить записи');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user, docId, courseId]);

  const touchRootDoc = useCallback(async () => {
    if (!user || !docId) return;

    await setDoc(
      doc(db, 'disorderTables', docId),
      {
        userId: user.uid,
        courseId,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }, [user, docId, courseId]);

  const createEntry = useCallback(
    async (input: DisorderTableEntryInput) => {
      if (!user || !docId) throw new Error('Требуется авторизация');

      const normalized = normalizeEntryInput(input);
      if (!isValidDisorderTableEntryInput(normalized)) {
        throw new Error('Выберите минимум одну строку, один столбец и введите сообщение от 3 символов');
      }

      setSaving(true);
      setError(null);
      try {
        await touchRootDoc();
        await addDoc(collection(db, 'disorderTables', docId, 'entries'), {
          ...normalized,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        debugError('Failed to create disorder table entry', err);
        setError('Не удалось создать запись');
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [user, docId, touchRootDoc]
  );

  const updateEntry = useCallback(
    async (entryId: string, input: DisorderTableEntryInput) => {
      if (!user || !docId) throw new Error('Требуется авторизация');

      const normalized = normalizeEntryInput(input);
      if (!isValidDisorderTableEntryInput(normalized)) {
        throw new Error('Выберите минимум одну строку, один столбец и введите сообщение от 3 символов');
      }

      setSaving(true);
      setError(null);
      try {
        await touchRootDoc();
        await setDoc(
          doc(db, 'disorderTables', docId, 'entries', entryId),
          {
            ...normalized,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (err) {
        debugError('Failed to update disorder table entry', err);
        setError('Не удалось обновить запись');
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [user, docId, touchRootDoc]
  );

  const removeEntry = useCallback(
    async (entryId: string) => {
      if (!user || !docId) throw new Error('Требуется авторизация');

      setSaving(true);
      setError(null);
      try {
        await touchRootDoc();
        await deleteDoc(doc(db, 'disorderTables', docId, 'entries', entryId));
      } catch (err) {
        debugError('Failed to remove disorder table entry', err);
        setError('Не удалось удалить запись');
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [user, docId, touchRootDoc]
  );

  return {
    entries,
    loading,
    saving,
    error,
    createEntry,
    updateEntry,
    removeEntry,
  };
}

