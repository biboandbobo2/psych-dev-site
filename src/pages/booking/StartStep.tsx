import { motion } from 'framer-motion';
import type { BookingFlow } from './types';

interface StartStepProps {
  onSelect: (flow: BookingFlow) => void;
}

export function StartStep({ onSelect }: StartStepProps) {
  return (
    <div className="py-12 md:py-16">
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-bold text-dom-gray-900 leading-tight">
          Забронировать кабинет
        </h2>
        <p className="mt-3 text-dom-gray-500 text-lg">
          Как вам удобнее начать?
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
        <motion.button
          onClick={() => onSelect('room-first')}
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.98 }}
          className="rounded-2xl p-8 text-left border-2 border-dom-gray-200 hover:border-dom-green/40 shadow-brand cursor-pointer transition-all duration-150 bg-white"
        >
          <div className="w-14 h-14 rounded-xl bg-dom-green/10 mb-5 flex items-center justify-center">
            <svg className="w-7 h-7 text-dom-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-dom-gray-900 mb-2">
            Выбрать кабинет
          </h3>
          <p className="text-dom-gray-500 text-sm leading-relaxed">
            Сначала выберите кабинет, затем подберите удобную дату и время
          </p>
        </motion.button>

        <motion.button
          onClick={() => onSelect('date-first')}
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.98 }}
          className="rounded-2xl p-8 text-left border-2 border-dom-gray-200 hover:border-dom-green/40 shadow-brand cursor-pointer transition-all duration-150 bg-white"
        >
          <div className="w-14 h-14 rounded-xl bg-dom-red/10 mb-5 flex items-center justify-center">
            <svg className="w-7 h-7 text-dom-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-dom-gray-900 mb-2">
            Выбрать дату
          </h3>
          <p className="text-dom-gray-500 text-sm leading-relaxed">
            Сначала выберите дату, затем посмотрите какие кабинеты свободны
          </p>
        </motion.button>
      </div>
    </div>
  );
}
