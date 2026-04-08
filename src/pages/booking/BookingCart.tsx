import { motion, AnimatePresence } from 'framer-motion';
import type { CartItem } from './types';

interface BookingCartProps {
  cart: CartItem[];
  onRemove: (index: number) => void;
  onConfirm: () => void;
}

const MONTH_LABELS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

function formatDisplayDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-').map(Number);
  return `${d} ${MONTH_LABELS[m - 1]}`;
}

export function BookingCart({ cart, onRemove, onConfirm }: BookingCartProps) {
  if (!cart.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-dom-gray-200 shadow-2xl px-4 py-4 md:px-8"
    >
      <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-dom-gray-900 mb-2">
            Корзина ({cart.length} {cart.length === 1 ? 'слот' : cart.length < 5 ? 'слота' : 'слотов'})
          </p>
          <div className="flex flex-wrap gap-2">
            <AnimatePresence>
              {cart.map((item, index) => (
                <motion.div
                  key={`${item.room.id}-${item.date}-${item.slot.time}`}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="inline-flex items-center gap-1.5 bg-dom-cream rounded-lg px-3 py-1.5 text-sm"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.room.color }}
                  />
                  <span className="text-dom-gray-700">
                    {item.room.name.split(' ')[0]} {formatDisplayDate(item.date)} {item.slot.time}
                  </span>
                  <button
                    onClick={() => onRemove(index)}
                    className="ml-1 text-dom-gray-500 hover:text-dom-red transition-colors"
                    aria-label="Удалить"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
        <button
          onClick={onConfirm}
          className="
            flex-shrink-0 bg-dom-red hover:bg-dom-red-hover text-white
            font-medium px-8 py-3 rounded-lg
            transition-all duration-150
            hover:-translate-y-0.5 hover:shadow-lg
            active:translate-y-0 active:shadow-md
          "
        >
          Забронировать
        </button>
      </div>
    </motion.div>
  );
}
