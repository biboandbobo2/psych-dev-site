import type { TimeSlot } from './types';

export function generateMockSlots(): TimeSlot[] {
  const slots: TimeSlot[] = [];
  for (let hour = 9; hour <= 20; hour++) {
    for (const minute of [0, 30]) {
      if (hour === 20 && minute === 30) continue;
      const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      slots.push({
        time,
        datetime: Date.now(),
        seanceLength: 3600,
        available: Math.random() > 0.3,
      });
    }
  }
  return slots;
}
