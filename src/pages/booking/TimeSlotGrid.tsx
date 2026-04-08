import { motion } from 'framer-motion';
import type { TimeSlot, Room, CartItem } from './types';

interface TimeSlotGridProps {
  slots: TimeSlot[];
  room: Room;
  date: string;
  cart: CartItem[];
  onToggleSlot: (slot: TimeSlot) => void;
  loading?: boolean;
}

export function TimeSlotGrid({ slots, room, date, cart, onToggleSlot, loading }: TimeSlotGridProps) {
  const isInCart = (slot: TimeSlot) =>
    cart.some((item) => item.room.id === room.id && item.date === date && item.slot.time === slot.time);

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

  if (!slots.length) {
    return (
      <div className="py-12 md:py-16 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-dom-gray-900 leading-tight mb-4">
          Выберите время
        </h2>
        <p className="text-dom-gray-500 text-lg">
          На выбранную дату нет свободных слотов
        </p>
      </div>
    );
  }

  return (
    <div className="py-12 md:py-16">
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-bold text-dom-gray-900 leading-tight">
          Выберите время
        </h2>
        <p className="mt-3 text-dom-gray-500 text-lg">
          Можно выбрать несколько слотов
        </p>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 max-w-3xl mx-auto">
        {slots.map((slot) => {
          const selected = isInCart(slot);
          return (
            <motion.button
              key={slot.time}
              onClick={() => slot.available && onToggleSlot(slot)}
              whileHover={slot.available ? { y: -2 } : undefined}
              whileTap={slot.available ? { scale: 0.95 } : undefined}
              disabled={!slot.available}
              className={`
                h-14 rounded-xl text-base font-medium transition-all duration-150
                border cursor-pointer
                ${!slot.available
                  ? 'bg-dom-gray-200/50 text-dom-gray-500/50 border-transparent cursor-not-allowed line-through'
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
    </div>
  );
}
