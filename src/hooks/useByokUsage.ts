import { useEffect, useState } from 'react';
import { doc, onSnapshot, type Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../stores/useAuthStore';
import { debugError } from '../lib/debug';

export interface ByokUsageDailySummary {
  day: string;
  tokens: number;
  requests: number;
  byAction: Record<string, { tokens: number; requests: number }>;
  updatedAt: Timestamp | null;
}

function todayKey(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Подписка на aiUsageDaily/{uid}_{day} — потраченные токены через свой ключ
 * за сегодня (UTC). Возвращает null если документа ещё нет.
 *
 * Документ пишется server-side в /api/books при successful BYOK-вызове
 * (recordByokUsage). Read разрешён только владельцу через firestore.rules.
 */
export function useByokUsage(): {
  summary: ByokUsageDailySummary | null;
  loading: boolean;
} {
  const uid = useAuthStore((s) => s.user?.uid ?? null);
  const [summary, setSummary] = useState<ByokUsageDailySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setSummary(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const day = todayKey();
    const docId = `${uid}_${day}`;
    const unsub = onSnapshot(
      doc(db, 'aiUsageDaily', docId),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<ByokUsageDailySummary>;
          setSummary({
            day: data.day ?? day,
            tokens: typeof data.tokens === 'number' ? data.tokens : 0,
            requests: typeof data.requests === 'number' ? data.requests : 0,
            byAction:
              data.byAction && typeof data.byAction === 'object'
                ? (data.byAction as ByokUsageDailySummary['byAction'])
                : {},
            updatedAt: (data.updatedAt as Timestamp | undefined) ?? null,
          });
        } else {
          setSummary(null);
        }
        setLoading(false);
      },
      (err) => {
        debugError('useByokUsage onSnapshot error', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [uid]);

  return { summary, loading };
}
