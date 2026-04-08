import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface DatePickerProps {
  selectedDate: string | null;
  onSelect: (date: string) => void;
  daysAhead?: number;
}

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTH_LABELS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getWeekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function DatePicker({ selectedDate, onSelect, daysAhead = 14 }: DatePickerProps) {
  const dates = useMemo(() => {
    const result: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < daysAhead; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      result.push(d);
    }
    return result;
  }, [daysAhead]);

  const todayStr = formatDateKey(new Date());

  return (
    <div className="py-12 md:py-16">
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-bold text-dom-gray-900 leading-tight">
          Выберите дату
        </h2>
        <p className="mt-3 text-dom-gray-500 text-lg">
          Ближайшие {daysAhead} дней
        </p>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-3 max-w-2xl mx-auto">
        {dates.map((date) => {
          const key = formatDateKey(date);
          const isSelected = selectedDate === key;
          const isToday = key === todayStr;
          const weekday = getWeekdayIndex(date);
          const isWeekend = weekday >= 5;

          return (
            <motion.button
              key={key}
              onClick={() => onSelect(key)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
              className={`
                flex flex-col items-center py-3 px-2 rounded-xl transition-all duration-150
                border cursor-pointer
                ${isSelected
                  ? 'bg-dom-green text-white border-dom-green shadow-md'
                  : isToday
                    ? 'bg-dom-cream border-dom-green/30 text-dom-gray-900'
                    : 'bg-white border-dom-gray-200 hover:border-dom-gray-300 text-dom-gray-900'
                }
              `}
            >
              <span className={`text-xs font-medium ${isSelected ? 'text-white/80' : isWeekend ? 'text-dom-red' : 'text-dom-gray-500'}`}>
                {WEEKDAY_LABELS[weekday]}
              </span>
              <span className="text-2xl font-bold mt-1">
                {date.getDate()}
              </span>
              <span className={`text-xs mt-0.5 ${isSelected ? 'text-white/70' : 'text-dom-gray-500'}`}>
                {MONTH_LABELS[date.getMonth()].slice(0, 3)}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
