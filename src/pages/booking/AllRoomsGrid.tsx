import { motion } from 'framer-motion';
import type { Room, TimeSlot, CartItem, DurationOption } from './types';
import { DURATION_OPTIONS } from './types';

interface AllRoomsGridProps {
  rooms: Room[];
  date: string;
  slotsByRoom: Map<string, TimeSlot[]>;
  duration: DurationOption;
  onDurationChange: (d: DurationOption) => void;
  cart: CartItem[];
  onToggleSlot: (room: Room, slot: TimeSlot) => void;
  loading?: boolean;
}

function getAllTimes(slotsByRoom: Map<string, TimeSlot[]>): string[] {
  const set = new Set<string>();
  for (const slots of slotsByRoom.values()) {
    for (const s of slots) set.add(s.time);
  }
  return Array.from(set).sort((a, b) => {
    const [ah, am] = a.split(':').map(Number);
    const [bh, bm] = b.split(':').map(Number);
    return (ah * 60 + am) - (bh * 60 + bm);
  });
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function AllRoomsGrid({ rooms, date, slotsByRoom, duration, onDurationChange, cart, onToggleSlot, loading }: AllRoomsGridProps) {
  const allTimes = getAllTimes(slotsByRoom);

  const isInCart = (roomId: string, time: string) =>
    cart.some((item) => item.room.id === roomId && item.date === date && item.slot.time === time);

  const overlapsCart = (roomId: string, time: string) => {
    const slotStart = timeToMinutes(time);
    const slotEnd = slotStart + duration.minutes;
    return cart.some((item) => {
      if (item.room.id !== roomId || item.date !== date) return false;
      if (item.slot.time === time) return false;
      const cartStart = timeToMinutes(item.slot.time);
      const cartEnd = cartStart + duration.minutes;
      return slotStart < cartEnd && slotEnd > cartStart;
    });
  };

  if (loading) {
    return (
      <div className="py-12 md:py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-dom-gray-900 leading-tight">Свободные окна</h2>
        </div>
        <div className="space-y-3 max-w-4xl mx-auto">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-dom-gray-200 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const noSlots = allTimes.length === 0;

  return (
    <div className="py-12 md:py-16">
      <div className="text-center mb-6">
        <h2 className="text-3xl md:text-4xl font-bold text-dom-gray-900 leading-tight">
          Свободные окна
        </h2>
        <p className="mt-2 text-dom-gray-500">
          Нажмите на слот чтобы выбрать
        </p>
      </div>

      {/* Duration toggle */}
      <div className="flex justify-center gap-2 mb-8">
        {DURATION_OPTIONS.map((opt) => (
          <button
            key={opt.minutes}
            onClick={() => onDurationChange(opt)}
            className={`
              px-5 py-2 rounded-lg text-sm font-medium transition-all duration-150 border
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

      {noSlots ? (
        <p className="text-center text-dom-gray-500 text-lg">На выбранную дату нет свободных слотов</p>
      ) : (
        <div className="max-w-4xl mx-auto overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Room rows */}
            {rooms.map((room) => {
              const roomSlots = slotsByRoom.get(room.id) || [];
              return (
                <div key={room.id} className="flex items-center gap-1 mb-1.5">
                  <div className="w-36 flex-shrink-0 flex items-center gap-2 pr-2">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: room.color }} />
                    <span className="text-sm font-medium text-dom-gray-900 truncate">
                      {room.name.replace(' кабинет', '')}
                    </span>
                  </div>
                  {allTimes.map((time) => {
                    const slot = roomSlots.find((s) => s.time === time);
                    const fits = Boolean(slot);
                    const selected = isInCart(room.id, time);
                    const blocked = fits && !selected && overlapsCart(room.id, time);
                    const disabled = !fits || blocked;

                    return (
                      <motion.button
                        key={time}
                        onClick={() => !disabled && slot && onToggleSlot(room, slot)}
                        disabled={disabled}
                        whileHover={!disabled ? { scale: 1.05 } : undefined}
                        whileTap={!disabled ? { scale: 0.95 } : undefined}
                        className={`
                          w-14 h-10 flex-shrink-0 rounded-lg text-xs font-medium
                          transition-all duration-100 border
                          ${disabled && !selected
                            ? 'bg-dom-gray-200/40 border-transparent cursor-not-allowed'
                            : selected
                              ? 'bg-dom-green text-white border-dom-green shadow-sm cursor-pointer'
                              : 'bg-white border-dom-gray-200 hover:border-dom-green/50 cursor-pointer text-dom-gray-700'
                          }
                        `}
                        title={fits ? `${room.name} ${time} (${duration.label})` : 'Недоступно'}
                      >
                        {fits ? time : ''}
                      </motion.button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
