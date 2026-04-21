import { useState, useEffect, useMemo } from 'react';
import { buildAuthorizedHeaders } from '../../lib/apiAuth';
import { debugLog, debugError, debugWarn } from '../../lib/debug';
import { useAuthStore } from '../../stores/useAuthStore';
import type { Room } from './types';

export interface BusyBlock {
  start: string;
  lengthSeconds: number;
  clientName?: string;
}

function getWeekDates(weekOffset: number): string[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = (today.getDay() + 6) % 7; // Mon=0
  const monday = new Date(today);
  monday.setDate(today.getDate() - dayOfWeek + weekOffset * 7);

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${day}`);
  }
  return dates;
}

export function useWeekSchedule(rooms: Room[], weekOffset: number, refreshKey?: number) {
  const user = useAuthStore((state) => state.user);
  const [busy, setBusy] = useState<Map<string, BusyBlock[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);

  useEffect(() => {
    if (rooms.length === 0) return;
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const baseHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
        if (user) {
          try {
            const authHeaders = await buildAuthorizedHeaders();
            Object.assign(baseHeaders, authHeaders);
          } catch (authErr) {
            debugWarn('[WeekSchedule] Falling back to anonymous busy fetch:', authErr);
          }
        }

        const pairs = rooms.flatMap((room) =>
          weekDates.map((date) => ({ staffId: room.id, date }))
        );

        const res = await fetch('/api/booking', {
          method: 'POST',
          headers: baseHeaders,
          body: JSON.stringify({ action: 'batchBusy', pairs }),
        });
        const json = await res.json();

        if (cancelled) return;

        if (!json.success) {
          throw new Error(json.error || 'batchBusy failed');
        }

        const map = new Map<string, BusyBlock[]>();
        const data = json.data as Record<string, BusyBlock[]>;
        for (const [key, blocks] of Object.entries(data)) {
          map.set(key, blocks);
        }
        setBusy(map);
        debugLog('[WeekSchedule] Loaded busy data for', map.size, 'room-days, offset', weekOffset);
      } catch (err) {
        debugError('[WeekSchedule] Failed:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [rooms, weekDates, weekOffset, refreshKey, user]);

  return { busy, loading, weekDates };
}
