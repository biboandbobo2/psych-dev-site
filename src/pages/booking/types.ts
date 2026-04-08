export interface Room {
  id: string;
  name: string;
  color: string;
  colorAccent: string;
  description: string;
}

export interface TimeSlot {
  time: string;
  datetime: number;
  seanceLength: number;
  available: boolean;
}

export interface CartItem {
  room: Room;
  date: string;
  slot: TimeSlot;
}

export interface BookingFormData {
  name: string;
  phone: string;
  email: string;
  comment: string;
}

export interface BookingResult {
  id: number;
  record_id: number;
  record_hash: string;
}

export type BookingStep = 'start' | 'room' | 'date' | 'duration' | 'time' | 'allrooms' | 'confirm';
export type BookingFlow = 'room-first' | 'date-first' | 'time-first';

export const DURATION_OPTIONS = [
  { label: '1 час', minutes: 60, seconds: 3600 },
  { label: '1.5 часа', minutes: 90, seconds: 5400 },
  { label: '2 часа', minutes: 120, seconds: 7200 },
] as const;

export type DurationOption = (typeof DURATION_OPTIONS)[number];

// Fallback room data — overridden by API response (alteg.io staff)
export const ROOMS: Room[] = [
  {
    id: '3012185',
    name: 'Лазурный кабинет',
    color: '#4A90D9',
    colorAccent: '#E8F0FE',
    description: 'Кабинет для индивидуальных консультаций',
  },
  {
    id: '3012126',
    name: 'Изумрудный кабинет',
    color: '#2E8B57',
    colorAccent: '#E6F5ED',
    description: 'Кабинет для групповой работы и тренингов',
  },
  {
    id: '2769648',
    name: 'Бордовый кабинет',
    color: '#8B2252',
    colorAccent: '#F5E6EE',
    description: 'Просторный зал для мероприятий и мастер-классов',
  },
];
