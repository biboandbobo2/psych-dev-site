import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../stores/useAuthStore';
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
        // 1. Get phone from Firestore
        const snap = await getDoc(doc(db, 'users', user.uid));
        const data = snap.data();
        const userPhone = data?.phone || null;
        if (userPhone) setPhone(userPhone);

        // 2. Use cached altegClientIds if available
        if (data?.altegClientIds?.length) {
          setAltegClientIds(data.altegClientIds);
          debugLog('[BookingAuth] Using cached altegClientIds:', data.altegClientIds);
          setLoading(false);
          return;
        }

        // 3. Search alteg.io by email AND phone
        const params = new URLSearchParams();
        if (user.email) params.set('email', user.email);
        if (userPhone) params.set('phone', userPhone);
        params.set('action', 'findClients');

        const searchRes = await fetch(`/api/booking?${params}`).then((r) => r.json());
        if (searchRes.success && Array.isArray(searchRes.data) && searchRes.data.length > 0) {
          const ids = searchRes.data.map((c: { id: number }) => c.id);
          setAltegClientIds(ids);
          await updateDoc(doc(db, 'users', user.uid), { altegClientIds: ids });
          debugLog('[BookingAuth] Found alteg clients:', ids);
        } else if (userPhone && user.email) {
          // 4. No existing client — create one
          const createRes = await fetch('/api/booking', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'createClient',
              name: user.displayName || user.email.split('@')[0],
              phone: userPhone,
              email: user.email,
            }),
          }).then((r) => r.json());
          if (createRes.success && Array.isArray(createRes.data)) {
            const newId = createRes.data[0]?.id;
            if (newId) {
              setAltegClientIds([newId]);
              await updateDoc(doc(db, 'users', user.uid), { altegClientIds: [newId] });
              debugLog('[BookingAuth] Created alteg client:', newId);
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

  return { altegClientIds, phone, loading };
}
