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
 * Тип записи в подколлекции `events` группы.
 * - 'event' — обычное событие с `dateLabel` (обратная совместимость).
 * - 'assignment' — задание с дедлайном (`dueDate` в ISO, YYYY-MM-DD).
 */
export type GroupEventKind = 'event' | 'assignment';

/**
 * Событие или задание внутри группы. Хранится в `groups/{groupId}/events/{id}`.
 * Старые документы без `kind` считаются `event`.
 */
export interface GroupEvent {
  id: string;
  groupId: string;
  kind: GroupEventKind;
  text: string;
  /** Для event — обязательно (человекочитаемая дата типа "10.11"). Для assignment — пустая строка. */
  dateLabel: string;
  /** Для assignment — ISO дата YYYY-MM-DD. Для event — null. */
  dueDate: string | null;
  zoomLink?: string;
  createdAt: Timestamp | null;
  createdBy: string;
  createdByName?: string;
}

export type GroupFeedItemKind = 'announcement' | 'event' | 'assignment';

export interface GroupFeedItem {
  id: string;
  groupId: string;
  groupName: string;
  kind: GroupFeedItemKind;
  text: string;
  dateLabel?: string;
  /** ISO YYYY-MM-DD для kind='assignment'. */
  dueDate?: string | null;
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
  const kind: GroupEventKind = data.kind === 'assignment' ? 'assignment' : 'event';
  const dueDate = typeof data.dueDate === 'string' && data.dueDate.trim()
    ? data.dueDate.trim()
    : null;
  if (!text || !createdBy) return null;
  if (kind === 'event' && !dateLabel) return null;
  if (kind === 'assignment' && !dueDate) return null;
  return {
    id,
    groupId,
    kind,
    text,
    dateLabel,
    dueDate,
    zoomLink: typeof data.zoomLink === 'string' && data.zoomLink.trim() ? data.zoomLink.trim() : undefined,
    createdAt: (data.createdAt as Timestamp | null) ?? null,
    createdBy,
    createdByName:
      typeof data.createdByName === 'string' ? data.createdByName : undefined,
  };
}
