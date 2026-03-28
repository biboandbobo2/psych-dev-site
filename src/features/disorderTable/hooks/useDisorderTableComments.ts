import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../auth/AuthProvider';
import { debugError } from '../../../lib/debug';
import { buildDisorderTableDocId, normalizeCommentInput } from '../model';
import type { DisorderTableComment, DisorderTableCommentInput } from '../types';

function toDateSafe(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in (value as any)) {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date(0);
}

export function useDisorderTableComments(courseId: string, ownerUid: string | null) {
  const { user, isAdmin } = useAuth();
  const [comments, setComments] = useState<DisorderTableComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const safeOwnerUid = useMemo(() => {
    if (!user) return null;
    if (!ownerUid) return user.uid;
    if (ownerUid === user.uid) return user.uid;
    return isAdmin ? ownerUid : null;
  }, [user, ownerUid, isAdmin]);

  const docId = useMemo(() => {
    if (!safeOwnerUid) return null;
    return buildDisorderTableDocId(safeOwnerUid, courseId);
  }, [safeOwnerUid, courseId]);

  const canComment = Boolean(user && isAdmin && docId);

  useEffect(() => {
    if (!user || !docId) {
      setComments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const commentsQuery = query(
      collection(db, 'disorderTables', docId, 'comments'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      commentsQuery,
      (snapshot) => {
        const nextComments: DisorderTableComment[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as Record<string, unknown>;
          return {
            id: docSnap.id,
            entryId: typeof data.entryId === 'string' ? data.entryId : '',
            text: typeof data.text === 'string' ? data.text : '',
            authorUid: typeof data.authorUid === 'string' ? data.authorUid : '',
            authorName: typeof data.authorName === 'string' ? data.authorName : 'Преподаватель',
            createdAt: toDateSafe(data.createdAt),
          };
        }).filter((item) => item.entryId && item.text);

        setComments(nextComments);
        setLoading(false);
      },
      (err) => {
        debugError('Failed to load disorder table comments', err);
        setError('Не удалось загрузить комментарии преподавателя');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user, docId]);

  const createComment = useCallback(
    async (input: DisorderTableCommentInput) => {
      if (!user || !docId || !safeOwnerUid) throw new Error('Требуется авторизация');
      if (!isAdmin) throw new Error('Добавлять комментарии может только преподаватель');

      const normalized = normalizeCommentInput(input);
      if (!normalized.entryId || normalized.text.length < 2) {
        throw new Error('Комментарий должен содержать минимум 2 символа');
      }

      setSaving(true);
      setError(null);
      try {
        await addDoc(collection(db, 'disorderTables', docId, 'comments'), {
          entryId: normalized.entryId,
          text: normalized.text,
          authorUid: user.uid,
          authorName: user.displayName || user.email || 'Преподаватель',
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        debugError('Failed to create disorder table comment', err);
        setError('Не удалось сохранить комментарий');
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [user, isAdmin, docId, safeOwnerUid]
  );

  return {
    comments,
    loading,
    saving,
    error,
    canComment,
    createComment,
  };
}
