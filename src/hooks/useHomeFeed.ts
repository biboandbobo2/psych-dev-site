import { useCallback, useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { debugError } from '../lib/debug';

export interface HomeAnnouncement {
  id: string;
  text: string;
  createdAt: string;
  createdByName?: string;
}

export interface HomeEventItem {
  id: string;
  dateLabel: string;
  text: string;
  createdAt: string;
  createdByName?: string;
}

interface HomeFeedDoc {
  announcements?: HomeAnnouncement[];
  events?: HomeEventItem[];
}

function buildId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeAnnouncements(value: unknown): HomeAnnouncement[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const data = item as Record<string, unknown>;
      const text = typeof data.text === 'string' ? data.text.trim() : '';
      if (!text) return null;
      return {
        id: typeof data.id === 'string' && data.id ? data.id : buildId(),
        text,
        createdAt: typeof data.createdAt === 'string' ? data.createdAt : '',
        createdByName: typeof data.createdByName === 'string' ? data.createdByName : undefined,
      } satisfies HomeAnnouncement;
    })
    .filter((item): item is HomeAnnouncement => Boolean(item))
    .slice(0, 30);
}

function normalizeEvents(value: unknown): HomeEventItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const data = item as Record<string, unknown>;
      const text = typeof data.text === 'string' ? data.text.trim() : '';
      const dateLabel = typeof data.dateLabel === 'string' ? data.dateLabel.trim() : '';
      if (!text || !dateLabel) return null;
      return {
        id: typeof data.id === 'string' && data.id ? data.id : buildId(),
        text,
        dateLabel,
        createdAt: typeof data.createdAt === 'string' ? data.createdAt : '',
        createdByName: typeof data.createdByName === 'string' ? data.createdByName : undefined,
      } satisfies HomeEventItem;
    })
    .filter((item): item is HomeEventItem => Boolean(item))
    .slice(0, 40);
}

export function useHomeFeed() {
  const [announcements, setAnnouncements] = useState<HomeAnnouncement[]>([]);
  const [events, setEvents] = useState<HomeEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const feedRef = useMemo(() => doc(db, 'homeFeed', 'shared'), []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      feedRef,
      (snapshot) => {
        const data = (snapshot.data() ?? {}) as HomeFeedDoc;
        setAnnouncements(normalizeAnnouncements(data.announcements));
        setEvents(normalizeEvents(data.events));
        setLoading(false);
        setError(null);
      },
      (err) => {
        debugError('Failed to load home feed', err);
        setAnnouncements([]);
        setEvents([]);
        setLoading(false);
        setError('Не удалось загрузить объявления и события');
      }
    );

    return unsubscribe;
  }, [feedRef]);

  const saveFeed = useCallback(
    async (nextAnnouncements: HomeAnnouncement[], nextEvents: HomeEventItem[]) => {
      await setDoc(
        feedRef,
        {
          announcements: nextAnnouncements,
          events: nextEvents,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    },
    [feedRef]
  );

  const addAnnouncement = useCallback(
    async (text: string, authorName?: string) => {
      const normalizedText = text.trim();
      if (normalizedText.length < 3) {
        throw new Error('Объявление должно содержать минимум 3 символа');
      }
      const nextItem: HomeAnnouncement = {
        id: buildId(),
        text: normalizedText,
        createdAt: new Date().toISOString(),
        createdByName: authorName,
      };
      await saveFeed([nextItem, ...announcements].slice(0, 30), events);
    },
    [saveFeed, announcements, events]
  );

  const addEvent = useCallback(
    async (dateLabel: string, text: string, authorName?: string) => {
      const normalizedDate = dateLabel.trim();
      const normalizedText = text.trim();
      if (normalizedDate.length < 2) {
        throw new Error('Укажите дату или период события');
      }
      if (normalizedText.length < 3) {
        throw new Error('Описание события должно содержать минимум 3 символа');
      }

      const nextItem: HomeEventItem = {
        id: buildId(),
        dateLabel: normalizedDate,
        text: normalizedText,
        createdAt: new Date().toISOString(),
        createdByName: authorName,
      };
      await saveFeed(announcements, [nextItem, ...events].slice(0, 40));
    },
    [saveFeed, announcements, events]
  );

  return {
    announcements,
    events,
    loading,
    error,
    addAnnouncement,
    addEvent,
  };
}

