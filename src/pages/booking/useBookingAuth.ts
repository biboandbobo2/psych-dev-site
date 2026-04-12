import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { buildAuthorizedHeaders } from '../../lib/apiAuth';
import { debugLog, debugError } from '../../lib/debug';

interface BookingAuthData {
  altegClientIds: number[];
  phone: string | null;
  loading: boolean;
}

export function useBookingAuth(): BookingAuthData {
  const user = useAuthStore((state) => state.user);
  const [altegClientIds, setAltegClientIds] = useState<number[]>([]);
  const [phone, setPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setAltegClientIds([]);
      setPhone(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const headers = await buildAuthorizedHeaders({ 'Content-Type': 'application/json' });
        const response = await fetch('/api/booking', {
          method: 'POST',
          headers,
          body: JSON.stringify({ action: 'resolveMyClientIds' }),
        });
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Не удалось связать профиль бронирования');
        }

        if (cancelled) {
          return;
        }

        const nextPhone = typeof result.data?.phone === 'string' ? result.data.phone : null;
        const nextIds = Array.isArray(result.data?.altegClientIds) ? result.data.altegClientIds : [];
        setPhone(nextPhone);
        setAltegClientIds(nextIds);
        debugLog('[BookingAuth] Resolved altegClientIds:', nextIds);
      } catch (err) {
        debugError('[BookingAuth] Error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user]);

  return { altegClientIds, phone, loading };
}
