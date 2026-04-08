import { motion } from 'framer-motion';
import type { Room, TimeSlot, CartItem, DurationOption } from './types';

interface AllRoomsGridProps {
  rooms: Room[];
  date: string;
  slotsByRoom: Map<string, TimeSlot[]>;
  duration: DurationOption;
  cart: CartItem[];
  onToggleSlot: (room: Room, slot: TimeSlot) => void;
  loading?: boolean;
}

function fitsConsecutive(slots: TimeSlot[], startTime: string, durationMinutes: number): boolean {
  const needed = durationMinutes / 30;
  const startIdx = slots.findIndex((s) => s.time === startTime);
  if (startIdx < 0) return false;
  if (startIdx + needed > slots.length) return false;
  for (let i = 0; i < needed; i++) {
    if (!slots[startIdx + i].available) return false;
  }
  return true;
}

function getAllTimes(slotsByRoom: Map<string, TimeSlot[]>): string[] {
  const set = new Set<string>();
  for (const slots of slotsByRoom.values()) {
    for (const s of slots) set.add(s.time);
  }
  return Array.from(set).sort();
}

export function AllRoomsGrid({ rooms, date, slotsByRoom, duration, cart, onToggleSlot, loading }: AllRoomsGridProps) {
  const allTimes = getAllTimes(slotsByRoom);

  const isInCart = (roomId: string, time: string) =>
    cart.some((item) => item.room.id === roomId && item.date === date && item.slot.time === time);

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

  return (
    <div className="py-12 md:py-16">
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-bold text-dom-gray-900 leading-tight">
          Свободные окна
        </h2>
        <p className="mt-3 text-dom-gray-500 text-lg">
          {duration.label} — нажмите на слот чтобы выбрать
        </p>
      </div>

      <div className="max-w-4xl mx-auto overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Header row — times */}
          <div className="flex gap-1 mb-2 pl-36">
            {allTimes.map((time) => (
              <div key={time} className="w-14 flex-shrink-0 text-center text-xs text-dom-gray-500 font-medium">
                {time}
              </div>
            ))}
          </div>

          {/* Room rows */}
          {rooms.map((room) => {
            const roomSlots = slotsByRoom.get(room.id) || [];
            return (
              <div key={room.id} className="flex items-center gap-1 mb-1.5">
                <div className="w-36 flex-shrink-0 flex items-center gap-2 pr-2">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: room.color }}
                  />
                  <span className="text-sm font-medium text-dom-gray-900 truncate">
                    {room.name.replace(' кабинет', '')}
                  </span>
                </div>
                {allTimes.map((time) => {
                  const fits = fitsConsecutive(roomSlots, time, duration.minutes);
                  const selected = isInCart(room.id, time);
                  const slot = roomSlots.find((s) => s.time === time);

                  return (
                    <motion.button
                      key={time}
                      onClick={() => fits && slot && onToggleSlot(room, slot)}
                      disabled={!fits}
                      whileHover={fits ? { scale: 1.15 } : undefined}
                      whileTap={fits ? { scale: 0.9 } : undefined}
                      className={`
                        w-14 h-10 flex-shrink-0 rounded-lg text-xs font-medium
                        transition-all duration-100 border
                        ${!fits
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
    </div>
  );
}
