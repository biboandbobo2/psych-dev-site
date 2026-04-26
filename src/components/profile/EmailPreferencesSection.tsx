import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../stores/useAuthStore';
import { updateMyEmailPreferences } from '../../lib/userPreferences';
import { debugError } from '../../lib/debug';

/**
 * Секция профиля для управления email-уведомлениями.
 * Сейчас — только подтверждения броней кабинетов центра DOM (alteg.io).
 */
export function EmailPreferencesSection() {
  const user = useAuthStore((s) => s.user);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const ref = doc(db, 'users', user.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = snap.data() as { prefs?: { emailBookingConfirmations?: boolean } } | undefined;
        const flag = data?.prefs?.emailBookingConfirmations;
        setEnabled(flag !== false);
        setLoading(false);
      },
      (err) => {
        debugError('[EmailPreferencesSection] snapshot error', err);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [user]);

  const handleToggle = async () => {
    if (!user || saving) return;
    const next = !enabled;
    setSaving(true);
    setError(null);
    // Оптимистичное обновление: snapshot подтвердит / откатит
    setEnabled(next);
    try {
      await updateMyEmailPreferences({ emailBookingConfirmations: next });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось сохранить настройку';
      setError(message);
      setEnabled(!next);
      debugError('[EmailPreferencesSection] save error', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
        <span role="img" aria-hidden="true">
          ✉️
        </span>
        Email-уведомления
      </h2>

      <label className="flex items-start gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={enabled}
          onChange={handleToggle}
          disabled={loading || saving}
          className="mt-1 h-5 w-5 rounded border-gray-300 text-accent focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <div className="flex-1">
          <p className="font-medium text-gray-900">
            Получать email-подтверждения о бронировании кабинетов
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Если выключите — мы не будем присылать email на каждое подтверждение брони.
            Сами брони будут работать как обычно.
          </p>
        </div>
      </label>

      {error && (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
