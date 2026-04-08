import { useState, useEffect, useCallback } from 'react';
import { debugLog, debugError } from '../../lib/debug';
import type { Room, TimeSlot } from './types';
import { ROOMS } from './types';

const SERVICE_ID = '12334505';

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

export function useAvailableDates(roomId: string | null) {
  const [dates, setDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;
    setLoading(true);
    apiFetch<{ booking_dates: string[] }>('dates', { staffId: roomId, serviceId: SERVICE_ID })
      .then((data) => {
        if (cancelled) return;
        setDates(data.booking_dates || []);
        debugLog('[Booking] Available dates:', data.booking_dates?.length);
      })
      .catch((err) => {
        debugError('[Booking] Failed to load dates:', err);
        setDates([]);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [roomId]);

  return { dates, loading };
}

export function useTimeSlots(roomId: string | null, date: string | null) {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!roomId || !date) return;
    let cancelled = false;
    setLoading(true);
    apiFetch<AltegSlot[]>('slots', { staffId: roomId, date, serviceId: SERVICE_ID })
      .then((data) => {
        if (cancelled) return;
        const mapped: TimeSlot[] = data.map((s) => ({
          time: s.time,
          datetime: s.datetime,
          seanceLength: s.seance_length,
          available: true,
        }));
        setSlots(mapped);
        debugLog('[Booking] Slots for', date, ':', mapped.length);
      })
      .catch((err) => {
        debugError('[Booking] Failed to load slots:', err);
        setSlots([]);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [roomId, date]);

  return { slots, loading };
}

export function useRoomAvailability(rooms: Room[], date: string | null) {
  const [availability, setAvailability] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!date || rooms.length === 0) return;
    let cancelled = false;
    setLoading(true);
    Promise.all(
      rooms.map((room) =>
        apiFetch<AltegSlot[]>('slots', { staffId: room.id, date, serviceId: SERVICE_ID })
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
  }, [rooms, date]);

  return { availability, loading };
}

export function useBooking() {
  const [submitting, setSubmitting] = useState(false);

  const book = useCallback(async (
    cart: { roomId: string; datetime: string; serviceId?: string }[],
    contact: { name: string; phone: string; email?: string; comment?: string },
  ) => {
    setSubmitting(true);
    try {
      const appointments = cart.map((item) => ({
        staffId: Number(item.roomId),
        serviceId: Number(item.serviceId || SERVICE_ID),
        datetime: item.datetime,
      }));
      const result = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'book',
          appointments,
          name: contact.name,
          phone: contact.phone,
          email: contact.email || '',
          comment: contact.comment || '',
        }),
      }).then((r) => r.json());
      if (!result.success) throw new Error(result.error || 'Booking failed');
      debugLog('[Booking] Booked:', appointments.length, 'slots');
      return result;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { book, submitting };
}
