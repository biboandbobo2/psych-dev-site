import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { useAuthStore } from '../../stores/useAuthStore';
import type { CartItem, BookingFormData, DurationOption } from './types';
import { formatDisplayDate, parseDisplayName } from './utils';
import { useBookingContext } from './BookingContext';
import { debugError } from '../../lib/debug';

interface BookingConfirmationProps {
  cart: CartItem[];
  duration: DurationOption;
  onSubmit: (data: BookingFormData) => void;
  onBack: () => void;
  submitting?: boolean;
}

export function BookingConfirmation({ cart, duration, onSubmit, onBack, submitting }: BookingConfirmationProps) {
  const user = useAuthStore((state) => state.user);
  const { userPhone } = useBookingContext();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [form, setForm] = useState<Omit<BookingFormData, 'name'>>({
    phone: '',
    email: '',
    comment: '',
  });
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
  }>({});

  // Pre-fill from Firebase user and shared phone context
  useEffect(() => {
    if (!user) return;
    const parsed = parseDisplayName(user.displayName);
    setFirstName((prev) => prev || parsed.firstName);
    setLastName((prev) => prev || parsed.lastName);
    setForm((prev) => ({
      ...prev,
      email: prev.email || user.email || '',
    }));
  }, [user]);

  useEffect(() => {
    if (userPhone) {
      setForm((prev) => ({ ...prev, phone: prev.phone || userPhone }));
    }
  }, [userPhone]);

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (firstName.trim().length < 2) newErrors.firstName = 'Укажите имя';
    if (lastName.trim().length < 2) newErrors.lastName = 'Укажите фамилию';
    if (!form.phone.trim()) {
      newErrors.phone = 'Укажите телефон';
    } else {
      const digits = form.phone.trim().replace(/[\s\-()]/g, '');
      const withPlus = digits.startsWith('+') ? digits : '+' + digits;
      if (!/^\+\d{10,15}$/.test(withPlus)) {
        newErrors.phone = 'Укажите номер в формате +995 511 17-92-41';
      }
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = 'Некорректный email';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    // Source of truth — Firebase Auth (см. useAuthSync.ts), Firestore-копию обновляем
    // тут же, чтобы ProfileCompletionBanner и серверные читатели users/{uid}.displayName
    // сразу увидели фамилию. Падение записи не блокирует букинг.
    if (user && fullName !== (user.displayName || '').trim()) {
      try {
        if (auth.currentUser) await updateProfile(auth.currentUser, { displayName: fullName });
        await updateDoc(doc(db, 'users', user.uid), { displayName: fullName });
      } catch (err) {
        debugError('[BookingConfirmation] displayName update failed', err);
      }
    }
    onSubmit({ ...form, name: fullName });
  };

  const inputClass = (field: keyof typeof errors) => `
    w-full px-4 py-3 rounded-xl border text-base
    transition-colors duration-150
    focus:outline-none focus:ring-2 focus:ring-dom-green/30 focus:border-dom-green
    ${errors[field] ? 'border-dom-red bg-red-50/50' : 'border-dom-gray-200 bg-white'}
  `;

  return (
    <div className="py-12 md:py-16">
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-bold text-dom-gray-900 leading-tight">
          Подтверждение
        </h2>
        <p className="mt-3 text-dom-gray-500 text-lg">
          Проверьте бронирование и оставьте контакты
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="bg-dom-cream rounded-2xl p-6 mb-8">
          <h3 className="font-semibold text-dom-gray-900 mb-4">Ваши бронирования</h3>
          <div className="space-y-3">
            {cart.map((item, index) => (
              <div
                key={`${item.room.id}-${item.date}-${item.slot.time}`}
                className="flex items-center gap-3 bg-white rounded-xl p-3"
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.room.color }}
                />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-dom-gray-900">{item.room.name}</span>
                  <span className="text-dom-gray-500 mx-2">&middot;</span>
                  <span className="text-dom-gray-700">{formatDisplayDate(item.date)}</span>
                  <span className="text-dom-gray-500 mx-2">&middot;</span>
                  <span className="text-dom-gray-700">{item.slot.time}</span>
                </div>
                <span className="text-sm text-dom-gray-500">
                  {duration.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dom-gray-700 mb-1.5">
                Имя <span className="text-dom-red">*</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Имя"
                autoComplete="given-name"
                className={inputClass('firstName')}
              />
              {errors.firstName && <p className="text-dom-red text-sm mt-1">{errors.firstName}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-dom-gray-700 mb-1.5">
                Фамилия <span className="text-dom-red">*</span>
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Фамилия"
                autoComplete="family-name"
                className={inputClass('lastName')}
              />
              {errors.lastName && <p className="text-dom-red text-sm mt-1">{errors.lastName}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-dom-gray-700 mb-1.5">
              Телефон <span className="text-dom-red">*</span>
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+7 (999) 123-45-67"
              className={inputClass('phone')}
            />
            {errors.phone && <p className="text-dom-red text-sm mt-1">{errors.phone}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-dom-gray-700 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="email@example.com"
              className={inputClass('email')}
            />
            {errors.email && <p className="text-dom-red text-sm mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-dom-gray-700 mb-1.5">
              Комментарий
            </label>
            <textarea
              value={form.comment}
              onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
              placeholder="Пожелания или дополнительная информация"
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-dom-gray-200 bg-white text-base resize-none transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-dom-green/30 focus:border-dom-green"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={onBack}
              className="
                flex-1 sm:flex-none px-6 py-3 rounded-xl border border-dom-gray-200
                text-dom-gray-700 font-medium
                hover:border-dom-gray-300 hover:bg-dom-cream
                transition-all duration-150
              "
            >
              Назад
            </button>
            <motion.button
              type="submit"
              disabled={submitting}
              whileHover={submitting ? undefined : { y: -1 }}
              whileTap={submitting ? undefined : { scale: 0.98 }}
              className={`
                flex-1 px-8 py-3 rounded-xl font-medium text-white
                transition-all duration-150
                ${submitting
                  ? 'bg-dom-green/60 cursor-not-allowed'
                  : 'bg-dom-red hover:bg-dom-red-hover shadow-md hover:shadow-lg'
                }
              `}
            >
              {submitting ? 'Отправка...' : 'Подтвердить бронирование'}
            </motion.button>
          </div>
        </form>
      </div>
    </div>
  );
}
