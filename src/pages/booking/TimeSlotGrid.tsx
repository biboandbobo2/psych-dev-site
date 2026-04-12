import { motion } from 'framer-motion';
import type { TimeSlot, Room, CartItem, DurationOption } from './types';
import { DURATION_OPTIONS } from './types';
import { timeToMinutes } from './utils';

interface TimeSlotGridProps {
  slots: TimeSlot[];
  room: Room;
  date: string;
  cart: CartItem[];
  duration: DurationOption;
  onDurationChange: (d: DurationOption) => void;
  onToggleSlot: (slot: TimeSlot) => void;
  loading?: boolean;
}

export function TimeSlotGrid({ slots, room, date, cart, duration, onDurationChange, onToggleSlot, loading }: TimeSlotGridProps) {
  const isInCart = (slot: TimeSlot) =>
    cart.some((item) => item.room.id === room.id && item.date === date && item.slot.time === slot.time);

  const overlapsCart = (slot: TimeSlot) => {
    const slotStart = timeToMinutes(slot.time);
    const slotEnd = slotStart + duration.minutes;
    return cart.some((item) => {
      if (item.room.id !== room.id || item.date !== date) return false;
      if (item.slot.time === slot.time) return false; // exact match = in cart, not overlap
      const cartStart = timeToMinutes(item.slot.time);
      const cartEnd = cartStart + duration.minutes;
      return slotStart < cartEnd && slotEnd > cartStart;
    });
  };

  if (loading) {
    return (
      <div className="py-12 md:py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-dom-gray-900 leading-tight">
            Выберите время
          </h2>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 max-w-3xl mx-auto">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-dom-gray-200 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 md:py-16">
      <div className="text-center mb-6">
        <h2 className="text-3xl md:text-4xl font-bold text-dom-gray-900 leading-tight">
          Выберите время
        </h2>
        <p className="mt-2 text-dom-gray-500">
          Можно выбрать несколько слотов
        </p>
      </div>

      {/* Duration toggle */}
      <div className="flex justify-center gap-2 mb-8">
        {DURATION_OPTIONS.map((opt) => (
          <button
            key={opt.minutes}
            onClick={() => onDurationChange(opt)}
            className={`
              px-5 py-2 rounded-lg text-sm font-medium transition-all border
              ${duration.minutes === opt.minutes
                ? 'bg-dom-green text-white border-dom-green'
                : 'bg-white text-dom-gray-700 border-dom-gray-200 hover:border-dom-green/40'
              }
            `}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {!slots.length ? (
        <p className="text-center text-dom-gray-500 text-lg">
          На выбранную дату нет свободных слотов
        </p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 max-w-3xl mx-auto">
          {slots.map((slot) => {
            const selected = isInCart(slot);
            const blocked = !selected && overlapsCart(slot);
            const disabled = !slot.available || blocked;
            return (
              <motion.button
                key={slot.time}
                onClick={() => !disabled && onToggleSlot(slot)}
                whileHover={!disabled ? { y: -2 } : undefined}
                whileTap={!disabled ? { scale: 0.95 } : undefined}
                disabled={disabled}
                className={`
                  h-14 rounded-xl text-base font-medium transition-all duration-150
                  border cursor-pointer
                  ${disabled && !selected
                    ? 'bg-dom-gray-200/50 text-dom-gray-500/50 border-transparent cursor-not-allowed'
                    : selected
                      ? 'bg-dom-green text-white border-dom-green shadow-md'
                      : 'bg-white text-dom-gray-900 border-dom-gray-200 hover:border-dom-green/40'
                  }
                `}
              >
                {slot.time}
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
