import { useEffect, useState } from 'react';
import { Timestamp, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../stores/useAuthStore';
import { debugError } from '../lib/debug';

export interface MyExamBooking {
  examId: string;
  slotId: string;
  groupId: string;
  bookedAt: Timestamp;
}

interface UseMyExamBookingResult {
  booking: MyExamBooking | null;
  loading: boolean;
}

/**
 * Подписка на userIndex текущего пользователя по конкретному экзамену. Один
 * документ — одна бронь. Если пусто — пользователь не записан.
 */
export function useMyExamBooking(examId: string | null): UseMyExamBookingResult {
  const user = useAuthStore((s) => s.user);
  const [booking, setBooking] = useState<MyExamBooking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !examId) {
      setBooking(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ref = doc(db, 'exams', examId, 'userIndex', user.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setBooking(null);
        } else {
          const data = snap.data() as Record<string, unknown>;
          const slotId = typeof data.slotId === 'string' ? data.slotId : '';
          const groupId = typeof data.groupId === 'string' ? data.groupId : '';
          const bookedAt = data.bookedAt as Timestamp | undefined;
          if (slotId && groupId && bookedAt) {
            setBooking({ examId, slotId, groupId, bookedAt });
          } else {
            setBooking(null);
          }
        }
        setLoading(false);
      },
      (err) => {
        debugError('useMyExamBooking: snapshot error', err);
        setBooking(null);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user, examId]);

  return { booking, loading };
}
