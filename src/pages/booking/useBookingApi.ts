import { useState, useEffect, useCallback } from 'react';
import { debugLog, debugError } from '../../lib/debug';
import type { Room, TimeSlot, BookingResult } from './types';
import { ROOMS, DURATION_OPTIONS } from './types';

const DEFAULT_SERVICE_ID = DURATION_OPTIONS[0].serviceId;

async function apiFetch<T>(action: string, params?: Record<string, string>): Promise<T> {
  const query = new URLSearchParams({ action, ...params });
  const res = await fetch(`/api/booking?${query}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'API error');
  return json.data;
}

interface AltegStaff {
  id: number;
  name: string;
  avatar: string;
  specialization: string;
}

interface AltegSlot {
  time: string;
  datetime: number;
  seance_length: number;
}

export function useRooms() {
  const [rooms, setRooms] = useState<Room[]>(ROOMS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiFetch<AltegStaff[]>('rooms')
      .then((data) => {
        if (cancelled) return;
        const mapped: Room[] = data.map((staff) => {
          const local = ROOMS.find((r) => r.name === staff.name);
          return {
            id: String(staff.id),
            name: staff.name,
            color: local?.color || '#6d8134',
            colorAccent: local?.colorAccent || '#f5f1eb',
            description: staff.specialization || local?.description || '',
          };
        });
        if (mapped.length > 0) setRooms(mapped);
        debugLog('[Booking] Loaded rooms:', mapped.length);
      })
      .catch((err) => {
        debugError('[Booking] Failed to load rooms, using defaults:', err);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { rooms, loading };
}

export function useTimeSlots(roomId: string | null, date: string | null, serviceId?: string, durationSeconds?: number) {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const svcId = serviceId || DEFAULT_SERVICE_ID;
  const durSec = durationSeconds || 3600;

  useEffect(() => {
    if (!roomId || !date) return;
    let cancelled = false;
    setLoading(true);

    Promise.all([
      apiFetch<AltegSlot[]>('slots', { staffId: roomId, date, serviceId: svcId }).catch(() => [] as AltegSlot[]),
      apiFetch<BusyInterval[]>('busy', { staffId: roomId, date }).catch(() => [] as BusyInterval[]),
    ]).then(([slotsData, busyData]) => {
      if (cancelled) return;
      const mapped: TimeSlot[] = slotsData
        .filter((s) => {
          const [h, m] = s.time.split(':').map(Number);
          const startMin = h * 60 + m;
          const endMin = startMin + durSec / 60;
          return startMin >= 9 * 60 && endMin <= 22 * 60 && !slotOverlapsBusy(s.time, durSec, date, busyData);
        })
        .sort((a, b) => {
          const [ah, am] = a.time.split(':').map(Number);
          const [bh, bm] = b.time.split(':').map(Number);
          return (ah * 60 + am) - (bh * 60 + bm);
        })
        .map((s) => ({
          time: s.time,
          datetime: s.datetime,
          seanceLength: s.seance_length,
          available: true,
        }));
      setSlots(mapped);
      debugLog('[Booking] Slots for', date, ':', mapped.length);
    }).catch((err) => {
      debugError('[Booking] Failed to load slots:', err);
      setSlots([]);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [roomId, date, svcId, durSec]);

  return { slots, loading };
}

export function useRoomAvailability(rooms: Room[], date: string | null) {
  const [availability, setAvailability] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(false);
  const serviceId = DEFAULT_SERVICE_ID;

  useEffect(() => {
    if (!date || rooms.length === 0) return;
    let cancelled = false;
    setLoading(true);
    Promise.all(
      rooms.map((room) =>
        apiFetch<AltegSlot[]>('slots', { staffId: room.id, date, serviceId })
          .then((data) => ({ roomId: room.id, count: data.length }))
          .catch(() => ({ roomId: room.id, count: 0 }))
      )
    ).then((results) => {
      if (cancelled) return;
      const map = new Map<string, number>();
      for (const r of results) map.set(r.roomId, r.count);
      setAvailability(map);
      debugLog('[Booking] Room availability for', date, ':', Object.fromEntries(map));
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [rooms, date, serviceId]);

  return { availability, loading };
}

interface BusyInterval { start: string; lengthSeconds: number }

function padTime(t: string): string {
  const [h, m] = t.split(':');
  return `${h.padStart(2, '0')}:${m}`;
}

function slotOverlapsBusy(slotTime: string, seanceLength: number, date: string, busyIntervals: BusyInterval[]): boolean {
  const slotStart = new Date(`${date}T${padTime(slotTime)}:00+04:00`).getTime();
  const slotEnd = slotStart + seanceLength * 1000;
  for (const b of busyIntervals) {
    const busyStart = new Date(b.start).getTime();
    const busyEnd = busyStart + b.lengthSeconds * 1000;
    if (slotStart < busyEnd && slotEnd > busyStart) return true;
  }
  return false;
}

export function useAllRoomsSlots(rooms: Room[], date: string | null, serviceId?: string, durationSeconds?: number) {
  const [slotsByRoom, setSlotsByRoom] = useState<Map<string, TimeSlot[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const svcId = serviceId || DEFAULT_SERVICE_ID;
  const durSec = durationSeconds || 3600;

  useEffect(() => {
    if (!date || rooms.length === 0) return;
    let cancelled = false;
    setLoading(true);

    Promise.all(
      rooms.map(async (room) => {
        const [slotsData, busyData] = await Promise.all([
          apiFetch<AltegSlot[]>('slots', { staffId: room.id, date, serviceId: svcId }).catch(() => [] as AltegSlot[]),
          apiFetch<BusyInterval[]>('busy', { staffId: room.id, date }).catch(() => [] as BusyInterval[]),
        ]);
        const filtered = slotsData
          .filter((s) => {
            const [h, m] = s.time.split(':').map(Number);
            const startMin = h * 60 + m;
            const endMin = startMin + durSec / 60;
            return startMin >= 9 * 60 && endMin <= 22 * 60 && !slotOverlapsBusy(s.time, durSec, date, busyData);
          })
          .sort((a, b) => {
          const [ah, am] = a.time.split(':').map(Number);
          const [bh, bm] = b.time.split(':').map(Number);
          return (ah * 60 + am) - (bh * 60 + bm);
        })
          .map((s): TimeSlot => ({
            time: s.time,
            datetime: s.datetime,
            seanceLength: s.seance_length,
            available: true,
          }));
        return { roomId: room.id, slots: filtered };
      })
    ).then((results) => {
      if (cancelled) return;
      const map = new Map<string, TimeSlot[]>();
      for (const r of results) map.set(r.roomId, r.slots);
      setSlotsByRoom(map);
      debugLog('[Booking] AllRooms slots loaded, filtered by busy intervals');
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [rooms, date, svcId, durSec]);

  return { slotsByRoom, loading };
}

export function useBooking() {
  const [submitting, setSubmitting] = useState(false);

  const book = useCallback(async (
    cart: { roomId: string; datetime: string; serviceId?: string }[],
    contact: { name: string; phone: string; email?: string; comment?: string },
  ): Promise<BookingResult[]> => {
    setSubmitting(true);
    try {
      // Validate first
      const appointments = cart.map((item, i) => ({
        id: i + 1,
        staffId: Number(item.roomId),
        serviceId: Number(item.serviceId || DEFAULT_SERVICE_ID),
        datetime: item.datetime,
      }));

      const checkResult = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check', appointments }),
      }).then((r) => r.json());

      if (!checkResult.success) {
        throw new Error(checkResult.error || 'Выбранное время уже занято');
      }

      // Book
      const result = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'book',
          appointments: appointments.map(({ id, ...rest }) => rest),
          name: contact.name,
          phone: contact.phone,
          email: contact.email || '',
          comment: contact.comment || '',
        }),
      }).then((r) => r.json());

      if (!result.success) throw new Error(result.error || 'Ошибка бронирования');
      debugLog('[Booking] Booked:', result.data);
      return result.data as BookingResult[];
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { book, submitting };
}
