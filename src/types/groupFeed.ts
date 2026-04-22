import type { Timestamp } from 'firebase/firestore';

/**
 * Объявление внутри группы. Хранится в `groups/{groupId}/announcements/{id}`.
 */
export interface GroupAnnouncement {
  id: string;
  groupId: string;
  text: string;
  createdAt: Timestamp | null;
  createdBy: string;
  createdByName?: string;
}

/**
 * Событие внутри группы. Хранится в `groups/{groupId}/events/{id}`.
 */
export interface GroupEvent {
  id: string;
  groupId: string;
  text: string;
  dateLabel: string;
  zoomLink?: string;
  createdAt: Timestamp | null;
  createdBy: string;
  createdByName?: string;
}

export type GroupFeedItemKind = 'announcement' | 'event';

export interface GroupFeedItem {
  id: string;
  groupId: string;
  groupName: string;
  kind: GroupFeedItemKind;
  text: string;
  dateLabel?: string;
  zoomLink?: string;
  createdAt: Timestamp | null;
  createdByName?: string;
}

export function normalizeGroupAnnouncement(
  groupId: string,
  id: string,
  raw: unknown
): GroupAnnouncement | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  const text = typeof data.text === 'string' ? data.text.trim() : '';
  const createdBy = typeof data.createdBy === 'string' ? data.createdBy : '';
  if (!text || !createdBy) return null;
  return {
    id,
    groupId,
    text,
    createdAt: (data.createdAt as Timestamp | null) ?? null,
    createdBy,
    createdByName:
      typeof data.createdByName === 'string' ? data.createdByName : undefined,
  };
}

export function normalizeGroupEvent(
  groupId: string,
  id: string,
  raw: unknown
): GroupEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  const text = typeof data.text === 'string' ? data.text.trim() : '';
  const dateLabel = typeof data.dateLabel === 'string' ? data.dateLabel.trim() : '';
  const createdBy = typeof data.createdBy === 'string' ? data.createdBy : '';
  if (!text || !dateLabel || !createdBy) return null;
  return {
    id,
    groupId,
    text,
    dateLabel,
    zoomLink: typeof data.zoomLink === 'string' && data.zoomLink.trim() ? data.zoomLink.trim() : undefined,
    createdAt: (data.createdAt as Timestamp | null) ?? null,
    createdBy,
    createdByName:
      typeof data.createdByName === 'string' ? data.createdByName : undefined,
  };
}
