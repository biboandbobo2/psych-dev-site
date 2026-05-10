import { useEffect, useState } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { useAuthStore } from '../../stores/useAuthStore';
import { hasFullName, parseDisplayName } from './utils';
import { debugError } from '../../lib/debug';

/**
 * Показывается на /booking/account, если у пользователя в профиле нет фамилии.
 * Inline-форма даёт указать имя/фамилию без модалки и без перехода на /booking.
 * Hard gate всё равно сработает в BookingConfirmation, банner — только soft prompt.
 */
export function ProfileCompletionBanner() {
  const user = useAuthStore((s) => s.user);
  const [firestoreDisplayName, setFirestoreDisplayName] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoaded(false);
      setFirestoreDisplayName(null);
      return;
    }
    const unsub = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        const data = snap.data() as { displayName?: string | null } | undefined;
        setFirestoreDisplayName(data?.displayName ?? null);
        setLoaded(true);
      },
      (err) => {
        debugError('[ProfileCompletionBanner] snapshot error', err);
        setLoaded(true);
      },
    );
    return () => unsub();
  }, [user]);

  // Эффективное имя: Firestore (если синкнулось) > Firebase Auth.
  const effectiveDisplayName = firestoreDisplayName ?? user?.displayName ?? null;

  useEffect(() => {
    if (!open) return;
    const parsed = parseDisplayName(effectiveDisplayName);
    setFirstName((prev) => prev || parsed.firstName);
    setLastName((prev) => prev || parsed.lastName);
  }, [open, effectiveDisplayName]);

  if (!user || !loaded) return null;
  if (hasFullName(effectiveDisplayName)) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const fn = firstName.trim();
    const ln = lastName.trim();
    if (fn.length < 2 || ln.length < 2) {
      setError('Заполните имя и фамилию (минимум 2 символа)');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const fullName = `${fn} ${ln}`;
      if (auth.currentUser) await updateProfile(auth.currentUser, { displayName: fullName });
      await updateDoc(doc(db, 'users', user.uid), { displayName: fullName });
      setOpen(false);
    } catch (err) {
      debugError('[ProfileCompletionBanner] save error', err);
      setError('Не удалось сохранить. Попробуйте ещё раз.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2 rounded-lg border border-dom-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-dom-green/30 focus:border-dom-green';

  return (
    <section className="bg-dom-cream border border-dom-green/20 rounded-xl p-4 mb-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-dom-gray-900">Укажите фамилию</p>
          <p className="text-sm text-dom-gray-500 mt-1">
            Фамилия нужна, чтобы администратор центра видел вас в списке записей.
            Обязательна для бронирования.
          </p>
        </div>
        {!open && (
          <button
            onClick={() => setOpen(true)}
            className="flex-shrink-0 px-4 py-2 rounded-lg bg-dom-green hover:bg-dom-green-hover text-white text-sm font-medium transition-all"
          >
            Указать
          </button>
        )}
      </div>

      {open && (
        <form onSubmit={handleSave} className="mt-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Имя"
              autoComplete="given-name"
              className={inputClass}
            />
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Фамилия"
              autoComplete="family-name"
              className={inputClass}
            />
          </div>
          {error && <p className="text-dom-red text-sm">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={saving}
              className="px-4 py-2 rounded-lg border border-dom-gray-200 text-sm text-dom-gray-700 hover:bg-white transition-all"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-dom-green hover:bg-dom-green-hover text-white text-sm font-medium transition-all disabled:opacity-50"
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
