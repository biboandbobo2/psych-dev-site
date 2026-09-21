import { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  query,
  where,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { debugError } from '../lib/debug';
import { useAuthStore } from '../stores/useAuthStore';
import {
  sortAccessRequests,
  type AccessRequest,
  type AccessRequestStatus,
} from '../types/accessRequests';

export const ACCESS_REQUESTS_COLLECTION = 'accessRequests';

const STATUSES: AccessRequestStatus[] = ['new', 'approved', 'declined'];

/** Документ Firestore → заявка. Неизвестный статус считаем «новым». */
export function normalizeAccessRequest(id: string, data: DocumentData): AccessRequest {
  const status = data.status as AccessRequestStatus;
  return {
    id,
    uid: typeof data.uid === 'string' ? data.uid : '',
    email: typeof data.email === 'string' ? data.email : null,
    displayName: typeof data.displayName === 'string' ? data.displayName : null,
    courseId: typeof data.courseId === 'string' ? data.courseId : null,
    message: typeof data.message === 'string' ? data.message : '',
    status: STATUSES.includes(status) ? status : 'new',
    createdAt: data.createdAt ?? null,
    resolvedAt: data.resolvedAt ?? null,
    resolvedBy: typeof data.resolvedBy === 'string' ? data.resolvedBy : null,
  };
}

/**
 * Подписка на `accessRequests` с готовой сортировкой. Ошибка снапшота
 * (обычно — отказ rules) гасит список: панель просто не рисуется.
 */
function subscribeAccessRequests(
  constraints: QueryConstraint[],
  context: string,
  apply: (requests: AccessRequest[]) => void
) {
  return onSnapshot(
    query(collection(db, ACCESS_REQUESTS_COLLECTION), ...constraints),
    (snapshot) => {
      apply(
        sortAccessRequests(
          snapshot.docs.map((docSnap) => normalizeAccessRequest(docSnap.id, docSnap.data()))
        )
      );
    },
    (error) => {
      debugError(`${context}: snapshot error`, error);
      apply([]);
    }
  );
}

interface UseAccessRequestsOptions {
  /**
   * Курс страницы. С ним запрос сужается до заявок по этому курсу — так его
   * видит администратор курса, которому rules чужие заявки не отдают.
   * Без него отдаются все новые заявки (супер-админ и со-админ).
   */
  courseId?: string | null;
}

/** Новые заявки на доступ — для панели в админке. */
export function useAccessRequests({ courseId }: UseAccessRequestsOptions = {}) {
  const user = useAuthStore((state) => state.user);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRequests([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const constraints: QueryConstraint[] = [where('status', '==', 'new')];
    if (courseId) constraints.push(where('courseId', '==', courseId));
    const unsubscribe = subscribeAccessRequests(constraints, 'useAccessRequests', (next) => {
      setRequests(next);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user, courseId]);

  return { requests, loading };
}

/** Заявки текущего пользователя: статус на гостевом `/home`. */
export function useMyAccessRequests() {
  const user = useAuthStore((state) => state.user);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRequests([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeAccessRequests(
      [where('uid', '==', user.uid)],
      'useMyAccessRequests',
      (next) => {
        setRequests(next);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [user]);

  return { requests, loading };
}
