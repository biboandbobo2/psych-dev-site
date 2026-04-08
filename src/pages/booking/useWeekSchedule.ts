import { useState, useEffect, useMemo } from 'react';
import { debugLog, debugError } from '../../lib/debug';
import type { Room } from './types';

export interface BusyBlock {
  start: string;
  lengthSeconds: number;
}

export interface WeekData {
  /** Map<"roomId:date", BusyBlock[]> */
  busy: Map<string, BusyBlock[]>;
  loading: boolean;
}

function getWeekDates(): string[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = (today.getDay() + 6) % 7; // Mon=0
  const monday = new Date(today);
  monday.setDate(today.getDate() - dayOfWeek);

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

export function useWeekSchedule(rooms: Room[]) {
  const [busy, setBusy] = useState<Map<string, BusyBlock[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const weekDates = useMemo(() => getWeekDates(), []);

  useEffect(() => {
    if (rooms.length === 0) return;
    let cancelled = false;
    setLoading(true);

    const requests = rooms.flatMap((room) =>
      weekDates.map((date) =>
        fetch(`/api/booking?action=busy&staffId=${room.id}&date=${date}`)
          .then((r) => r.json())
          .then((json) => ({
            key: `${room.id}:${date}`,
            blocks: (json.success ? json.data : []) as BusyBlock[],
          }))
          .catch(() => ({ key: `${room.id}:${date}`, blocks: [] as BusyBlock[] }))
      )
    );

    Promise.all(requests).then((results) => {
      if (cancelled) return;
      const map = new Map<string, BusyBlock[]>();
      for (const r of results) map.set(r.key, r.blocks);
      setBusy(map);
      debugLog('[WeekSchedule] Loaded busy data for', results.length, 'room-days');
    }).catch((err) => {
      debugError('[WeekSchedule] Failed:', err);
    }).finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [rooms, weekDates]);

  return { busy, loading, weekDates };
}
