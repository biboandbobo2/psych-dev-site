import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../stores/useAuthStore';

interface UserPhoneState {
  phone: string | null;
  loading: boolean;
  refresh: () => void;
}

export function useUserPhone(): UserPhoneState {
  const user = useAuthStore((state) => state.user);
  const [phone, setPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((n) => n + 1), []);

  useEffect(() => {
    if (!user) {
      setPhone(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getDoc(doc(db, 'users', user.uid)).then((snap) => {
      if (!cancelled) {
        setPhone(snap.data()?.phone || null);
      }
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user, refreshKey]);

  return { phone, loading, refresh };
}
