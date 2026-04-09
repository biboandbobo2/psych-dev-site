import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../stores/useAuthStore';
import { debugLog, debugError } from '../../lib/debug';

interface BookingAuthData {
  altegClientId: number | null;
  phone: string | null;
  loading: boolean;
}

export function useBookingAuth(): BookingAuthData {
  const user = useAuthStore((state) => state.user);
  const [altegClientId, setAltegClientId] = useState<number | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setAltegClientId(null);
      setPhone(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        // 1. Check Firestore for cached altegClientId and phone
        const snap = await getDoc(doc(db, 'users', user.uid));
        const data = snap.data();

        if (data?.phone) setPhone(data.phone);

        if (data?.altegClientId) {
          setAltegClientId(data.altegClientId);
          debugLog('[BookingAuth] Using cached altegClientId:', data.altegClientId);
          return;
        }

        // 2. Search alteg.io by email
        if (!user.email) return;
        const searchRes = await fetch(`/api/booking?action=findClient&email=${encodeURIComponent(user.email)}`).then((r) => r.json());

        if (searchRes.success && searchRes.data) {
          const clientId = searchRes.data.id;
          setAltegClientId(clientId);
          await updateDoc(doc(db, 'users', user.uid), { altegClientId: clientId });
          debugLog('[BookingAuth] Found alteg client:', clientId);
          return;
        }

        // 3. Create client in alteg.io (only if we have phone)
        if (data?.phone) {
          const createRes = await fetch('/api/booking', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'createClient',
              name: user.displayName || user.email.split('@')[0],
              phone: data.phone,
              email: user.email,
            }),
          }).then((r) => r.json());

          if (createRes.success && Array.isArray(createRes.data)) {
            const clientId = createRes.data[0]?.id;
            if (clientId) {
              setAltegClientId(clientId);
              await updateDoc(doc(db, 'users', user.uid), { altegClientId: clientId });
              debugLog('[BookingAuth] Created alteg client:', clientId);
            }
          }
        }
      } catch (err) {
        debugError('[BookingAuth] Error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user]);

  return { altegClientId, phone, loading };
}
