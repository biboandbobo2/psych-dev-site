import { motion } from 'framer-motion';
import { DURATION_OPTIONS } from './types';
import type { DurationOption } from './types';

interface DurationPickerProps {
  selected: DurationOption | null;
  onSelect: (d: DurationOption) => void;
}

export function DurationPicker({ selected, onSelect }: DurationPickerProps) {
  return (
    <div className="py-12 md:py-16">
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-bold text-dom-gray-900 leading-tight">
          На сколько нужен кабинет?
        </h2>
        <p className="mt-3 text-dom-gray-500 text-lg">
          Выберите длительность аренды
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-4 max-w-lg mx-auto">
        {DURATION_OPTIONS.map((opt) => {
          const isSelected = selected?.minutes === opt.minutes;
          return (
            <motion.button
              key={opt.minutes}
              onClick={() => onSelect(opt)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
              className={`
                px-8 py-4 rounded-xl text-lg font-medium transition-all duration-150
                border-2 cursor-pointer
                ${isSelected
                  ? 'bg-dom-green text-white border-dom-green shadow-md'
                  : 'bg-white text-dom-gray-900 border-dom-gray-200 hover:border-dom-green/40'
                }
              `}
            >
              {opt.label}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
