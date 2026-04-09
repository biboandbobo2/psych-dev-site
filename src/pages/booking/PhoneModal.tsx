import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { debugError } from '../../lib/debug';

interface PhoneModalProps {
  uid: string;
  onComplete: (phone: string) => void;
}

export function PhoneModal({ uid, onComplete }: PhoneModalProps) {
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = phone.trim();
    if (!/^[\d\s+\-()]{7,}$/.test(trimmed)) {
      setError('Укажите корректный номер телефона');
      return;
    }
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', uid), { phone: trimmed });
      onComplete(trimmed);
    } catch (err) {
      debugError('[PhoneModal] Save error:', err);
      setError('Не удалось сохранить. Попробуйте ещё раз.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <h2 className="text-xl font-bold text-dom-gray-900 text-center mb-2">Телефон для связи</h2>
        <p className="text-dom-gray-500 text-sm text-center mb-6">
          Укажите номер телефона — он нужен для подтверждения бронирований
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+7 (999) 123-45-67"
            required
            className="w-full px-4 py-3 rounded-xl border border-dom-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-dom-green/30 focus:border-dom-green"
            autoFocus
          />
          {error && <p className="text-dom-red text-sm">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-xl bg-dom-green hover:bg-dom-green-hover text-white font-medium text-sm transition-all disabled:opacity-50"
          >
            {saving ? 'Сохранение...' : 'Продолжить'}
          </button>
        </form>
      </div>
    </div>
  );
}
