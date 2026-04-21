import { motion } from 'framer-motion';
import type { Room } from './types';

interface RoomSelectorProps {
  rooms: Room[];
  selectedRoom: Room | null;
  onSelect: (room: Room) => void;
  availability?: Map<string, number>;
  availabilityLoading?: boolean;
  subtitle?: string;
}

export function RoomSelector({ rooms, selectedRoom, onSelect, availability, availabilityLoading, subtitle }: RoomSelectorProps) {
  return (
    <div className="py-12 md:py-16">
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-bold text-dom-gray-900 leading-tight">
          Выберите кабинет
        </h2>
        <p className="mt-3 text-dom-gray-500 text-lg">
          {subtitle || 'Три уникальных пространства для вашей работы'}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {rooms.map((room) => {
          const isSelected = selectedRoom?.id === room.id;
          const slotCount = availability?.get(room.id);
          const hasAvailability = availability !== undefined;
          const isUnavailable = hasAvailability && !availabilityLoading && slotCount === 0;
          return (
            <motion.button
              key={room.id}
              onClick={() => !isUnavailable && onSelect(room)}
              whileHover={isUnavailable ? undefined : { y: -4 }}
              whileTap={isUnavailable ? undefined : { scale: 0.98 }}
              disabled={isUnavailable}
              className={`
                relative rounded-2xl p-6 text-left transition-all duration-150
                border-2
                ${isUnavailable
                  ? 'border-dom-gray-200 opacity-50 cursor-not-allowed'
                  : isSelected
                    ? 'border-dom-green shadow-lg ring-2 ring-dom-green/20 cursor-pointer'
                    : 'border-dom-gray-200 hover:border-dom-gray-300 shadow-brand cursor-pointer'
                }
              `}
              style={{ backgroundColor: isUnavailable ? '#f3f4f6' : room.colorAccent }}
            >
              <div
                className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center"
                style={{ backgroundColor: isUnavailable ? '#9ca3af' : room.color }}
              >
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-dom-gray-900 mb-2">
                {room.name}
              </h3>
              <p className="text-dom-gray-500 text-sm leading-relaxed">
                {room.description}
              </p>
              {hasAvailability && (
                <div className="mt-3">
                  {availabilityLoading ? (
                    <span className="inline-block h-5 w-24 bg-dom-gray-200 animate-pulse rounded" />
                  ) : isUnavailable ? (
                    <span className="text-sm font-medium text-dom-gray-500">Нет свободных слотов</span>
                  ) : (
                    <span className="text-sm font-medium text-dom-green">
                      {slotCount} {slotCount === 1 ? 'слот' : slotCount && slotCount < 5 ? 'слота' : 'слотов'} свободно
                    </span>
                  )}
                </div>
              )}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-dom-green flex items-center justify-center"
                >
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
