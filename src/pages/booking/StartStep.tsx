import { motion } from 'framer-motion';
import type { BookingFlow } from './types';
import { CheckIcon } from './icons';

interface StartStepProps {
  onSelect: (flow: BookingFlow) => void;
}

const INCLUDED = [
  'Меблированные кабинеты',
  'Зона ожидания',
  'Чай, кофе и печенье',
  'Wi-Fi и кондиционер',
  'Онлайн-бронирование',
  'Поддержка администратора',
];

const ENTRIES: { flow: BookingFlow; title: string; desc: string; icon: string; accent: string }[] = [
  {
    flow: 'room-first',
    title: 'Выбрать кабинет',
    desc: 'Знаете какой кабинет нужен — выберите его и найдите свободное время',
    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    accent: 'bg-dom-green/10 text-dom-green',
  },
  {
    flow: 'date-first',
    title: 'Выбрать дату',
    desc: 'Знаете когда нужно — выберите день и посмотрите свободные кабинеты',
    icon: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5',
    accent: 'bg-dom-red/10 text-dom-red',
  },
];

export function StartStep({ onSelect }: StartStepProps) {
  const scrollToSchedule = () => {
    document.getElementById('week-schedule')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="py-12 md:py-16">
      <div className="text-center mb-12 max-w-2xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-dom-gray-900 leading-tight">
          Аренда кабинетов для психологов в центре Тбилиси
        </h1>
        <p className="mt-4 text-dom-gray-500 text-lg">
          Три кабинета для консультаций и зал для мероприятий на Орбелиани 38.
          Выберите время в календаре — бронь занимает пару минут.
        </p>
        <button
          onClick={scrollToSchedule}
          className="mt-6 px-8 py-3.5 rounded-xl bg-dom-green hover:bg-dom-green-hover text-white text-base font-medium transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          Забронировать
        </button>
      </div>

      <p className="text-center text-dom-gray-500 text-lg mb-6">Как вам удобнее начать?</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
        {ENTRIES.map((e) => (
          <motion.button
            key={e.flow}
            onClick={() => onSelect(e.flow)}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            className="rounded-2xl p-8 text-left border-2 border-dom-gray-200 hover:border-dom-green/40 shadow-brand cursor-pointer transition-all duration-150 bg-white"
          >
            <div className={`w-14 h-14 rounded-xl mb-5 flex items-center justify-center ${e.accent}`}>
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={e.icon} />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-dom-gray-900 mb-2">{e.title}</h3>
            <p className="text-dom-gray-500 text-sm leading-relaxed">{e.desc}</p>
          </motion.button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mt-14">
        <div className="rounded-2xl border border-dom-gray-200 p-6">
          <h2 className="text-lg font-semibold text-dom-gray-900 mb-3">Кому подойдёт</h2>
          <p className="text-dom-gray-600 leading-relaxed">
            Психологам и психотерапевтам с частной практикой, семейным и детским специалистам,
            ведущим групп, лекций и мастер-классов. Кабинет можно арендовать на час — для разовой
            встречи или регулярного расписания.
          </p>
        </div>
        <div className="rounded-2xl border border-dom-gray-200 p-6">
          <h2 className="text-lg font-semibold text-dom-gray-900 mb-3">Что входит в аренду</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
            {INCLUDED.map((item) => (
              <li key={item} className="flex items-center gap-2 text-dom-gray-600">
                <CheckIcon className="w-4 h-4 text-dom-green flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
