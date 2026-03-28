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
  writeBatch,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../auth/AuthProvider';
import { debugError } from '../../../lib/debug';
import {
  buildDisorderTableDocId,
  isDisorderTableCourse,
  isValidDisorderTableEntryInput,
  normalizeEntryInput,
  normalizeEntryTrack,
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
  const { user, isAdmin } = useAuth();
  const [entries, setEntries] = useState<DisorderTableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetOwnerUid, setTargetOwnerUid] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setTargetOwnerUid(null);
      return;
    }
    setTargetOwnerUid(user.uid);
  }, [user]);

  const effectiveOwnerUid = useMemo(() => {
    if (!user) return null;
    if (!targetOwnerUid) return user.uid;
    if (targetOwnerUid === user.uid) return user.uid;
    return isAdmin ? targetOwnerUid : user.uid;
  }, [user, targetOwnerUid, isAdmin]);

  const docId = useMemo(() => {
    if (!effectiveOwnerUid) return null;
    return buildDisorderTableDocId(effectiveOwnerUid, courseId);
  }, [effectiveOwnerUid, courseId]);

  const canEdit = Boolean(user && effectiveOwnerUid && user.uid === effectiveOwnerUid);

  useEffect(() => {
    if (!user || !effectiveOwnerUid || !docId || !isDisorderTableCourse(courseId)) {
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
          const legacySafeColumnIds = Array.isArray(data.columnIds)
            ? Array.from(new Set((data.columnIds as string[]).flatMap((columnId) => (
              columnId === 'depression-bipolar' ? ['depression', 'mania-bipolar'] : [columnId]
            ))))
            : [];
          return {
            id: docSnap.id,
            rowIds: Array.isArray(data.rowIds) ? (data.rowIds as string[]) : [],
            columnIds: legacySafeColumnIds,
            text: typeof data.text === 'string' ? data.text : '',
            track: normalizeEntryTrack(data.track as any),
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
  }, [user, effectiveOwnerUid, docId, courseId]);

  const touchRootDoc = useCallback(async () => {
    if (!user || !docId || !effectiveOwnerUid) return;

    await setDoc(
      doc(db, 'disorderTables', docId),
      {
        userId: effectiveOwnerUid,
        courseId,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }, [user, docId, effectiveOwnerUid, courseId]);

  const createEntry = useCallback(
    async (input: DisorderTableEntryInput) => {
      if (!user || !docId) throw new Error('Требуется авторизация');
      if (!canEdit) throw new Error('Редактирование доступно только владельцу таблицы');

      const normalized = normalizeEntryInput(input);
      if (!isValidDisorderTableEntryInput(normalized)) {
        throw new Error('Выберите одну категорию с одной стороны и минимум одну с другой, затем введите текст от 3 символов');
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
    [user, docId, canEdit, touchRootDoc]
  );

  const createEntriesBatch = useCallback(
    async (inputs: DisorderTableEntryInput[]) => {
      if (!user || !docId) throw new Error('Требуется авторизация');
      if (!canEdit) throw new Error('Редактирование доступно только владельцу таблицы');
      if (inputs.length === 0) return;

      const normalizedInputs = inputs.map((input) => normalizeEntryInput(input));
      if (normalizedInputs.some((input) => !isValidDisorderTableEntryInput(input))) {
        throw new Error('Проверьте выбранные пересечения и текст: минимум 3 символа');
      }

      setSaving(true);
      setError(null);
      try {
        await touchRootDoc();
        const entriesCollection = collection(db, 'disorderTables', docId, 'entries');
        const chunkSize = 450;

        for (let index = 0; index < normalizedInputs.length; index += chunkSize) {
          const chunk = normalizedInputs.slice(index, index + chunkSize);
          const batch = writeBatch(db);

          for (const input of chunk) {
            batch.set(doc(entriesCollection), {
              ...input,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }

          await batch.commit();
        }
      } catch (err) {
        debugError('Failed to create disorder table entries in batch', err);
        setError('Не удалось сохранить выбранные пересечения');
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [user, docId, canEdit, touchRootDoc]
  );

  const updateEntry = useCallback(
    async (entryId: string, input: DisorderTableEntryInput) => {
      if (!user || !docId) throw new Error('Требуется авторизация');
      if (!canEdit) throw new Error('Редактирование доступно только владельцу таблицы');

      const normalized = normalizeEntryInput(input);
      if (!isValidDisorderTableEntryInput(normalized)) {
        throw new Error('Выберите одну категорию с одной стороны и минимум одну с другой, затем введите текст от 3 символов');
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
    [user, docId, canEdit, touchRootDoc]
  );

  const removeEntry = useCallback(
    async (entryId: string) => {
      if (!user || !docId) throw new Error('Требуется авторизация');
      if (!canEdit) throw new Error('Редактирование доступно только владельцу таблицы');

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
    [user, docId, canEdit, touchRootDoc]
  );

  return {
    entries,
    loading,
    saving,
    error,
    canEdit,
    targetOwnerUid,
    setTargetOwnerUid,
    createEntry,
    createEntriesBatch,
    updateEntry,
    removeEntry,
  };
}
