import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { debugError } from '../lib/debug';
import {
  normalizeGroupAnnouncement,
  normalizeGroupEvent,
  type GroupAnnouncement,
  type GroupEvent,
} from '../types/groupFeed';

export interface GroupAnnouncementInput {
  text: string;
  createdByName?: string;
}

export interface GroupEventInput {
  text: string;
  dateLabel: string;
  zoomLink?: string;
  createdByName?: string;
}

/**
 * Подписка на объявления и события одной группы (последние сверху).
 */
export function useGroupFeed(groupId: string | null) {
  const [announcements, setAnnouncements] = useState<GroupAnnouncement[]>([]);
  const [events, setEvents] = useState<GroupEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) {
      setAnnouncements([]);
      setEvents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribes: Unsubscribe[] = [];
    let annLoaded = false;
    let evLoaded = false;

    unsubscribes.push(
      onSnapshot(
        query(
          collection(db, 'groups', groupId, 'announcements'),
          orderBy('createdAt', 'desc')
        ),
        (snap) => {
          const next = snap.docs
            .map((d) => normalizeGroupAnnouncement(groupId, d.id, d.data()))
            .filter((a): a is GroupAnnouncement => a !== null);
          setAnnouncements(next);
          annLoaded = true;
          if (annLoaded && evLoaded) setLoading(false);
        },
        (err) => {
          debugError('useGroupFeed announcements error', err);
          annLoaded = true;
          if (annLoaded && evLoaded) setLoading(false);
        }
      )
    );

    unsubscribes.push(
      onSnapshot(
        query(
          collection(db, 'groups', groupId, 'events'),
          orderBy('createdAt', 'desc')
        ),
        (snap) => {
          const next = snap.docs
            .map((d) => normalizeGroupEvent(groupId, d.id, d.data()))
            .filter((e): e is GroupEvent => e !== null);
          setEvents(next);
          evLoaded = true;
          if (annLoaded && evLoaded) setLoading(false);
        },
        (err) => {
          debugError('useGroupFeed events error', err);
          evLoaded = true;
          if (annLoaded && evLoaded) setLoading(false);
        }
      )
    );

    return () => {
      unsubscribes.forEach((u) => u());
    };
  }, [groupId]);

  return { announcements, events, loading };
}

export async function createGroupAnnouncement(
  groupId: string,
  input: GroupAnnouncementInput,
  userId: string
): Promise<void> {
  const text = input.text.trim();
  if (text.length < 3) {
    throw new Error('Текст объявления должен содержать минимум 3 символа');
  }
  await addDoc(collection(db, 'groups', groupId, 'announcements'), {
    text,
    createdAt: serverTimestamp(),
    createdBy: userId,
    ...(input.createdByName ? { createdByName: input.createdByName } : {}),
  });
}

export async function createGroupEvent(
  groupId: string,
  input: GroupEventInput,
  userId: string
): Promise<void> {
  const text = input.text.trim();
  const dateLabel = input.dateLabel.trim();
  if (text.length < 3) {
    throw new Error('Описание события должно содержать минимум 3 символа');
  }
  if (dateLabel.length < 2) {
    throw new Error('Укажите дату или период события');
  }
  const zoomLink = input.zoomLink?.trim();
  await addDoc(collection(db, 'groups', groupId, 'events'), {
    text,
    dateLabel,
    createdAt: serverTimestamp(),
    createdBy: userId,
    ...(zoomLink ? { zoomLink } : {}),
    ...(input.createdByName ? { createdByName: input.createdByName } : {}),
  });
}

export async function updateGroupAnnouncement(
  groupId: string,
  itemId: string,
  text: string
): Promise<void> {
  const trimmed = text.trim();
  if (trimmed.length < 3) {
    throw new Error('Текст объявления должен содержать минимум 3 символа');
  }
  await updateDoc(doc(db, 'groups', groupId, 'announcements', itemId), { text: trimmed });
}

export async function updateGroupEvent(
  groupId: string,
  itemId: string,
  patch: Partial<Pick<GroupEvent, 'text' | 'dateLabel' | 'zoomLink'>>
): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (typeof patch.text === 'string') {
    const trimmed = patch.text.trim();
    if (trimmed.length < 3) {
      throw new Error('Описание события должно содержать минимум 3 символа');
    }
    updates.text = trimmed;
  }
  if (typeof patch.dateLabel === 'string') {
    const trimmed = patch.dateLabel.trim();
    if (trimmed.length < 2) {
      throw new Error('Укажите дату или период события');
    }
    updates.dateLabel = trimmed;
  }
  if (typeof patch.zoomLink === 'string') {
    updates.zoomLink = patch.zoomLink.trim() || null;
  }
  await updateDoc(doc(db, 'groups', groupId, 'events', itemId), updates);
}

export async function deleteGroupAnnouncement(groupId: string, itemId: string) {
  await deleteDoc(doc(db, 'groups', groupId, 'announcements', itemId));
}

export async function deleteGroupEvent(groupId: string, itemId: string) {
  await deleteDoc(doc(db, 'groups', groupId, 'events', itemId));
}
