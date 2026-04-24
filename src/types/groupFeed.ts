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
 * Источник последней записи, используется для anti-echo при двусторонней
 * синхронизации с Google Calendar.
 * - 'firestore' — документ создан/изменён в админке сайта.
 * - 'gcal' — документ импортирован из Google Calendar.
 */
export type GroupEventWriteSource = 'firestore' | 'gcal';

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
  /** Для assignment — опциональный развёрнутый текст, показываемый в модалке «Читать полностью». */
  longText?: string;
  zoomLink?: string;
  /** Точное время начала события (только для kind='event', из Google Calendar). */
  startAt?: Timestamp | null;
  endAt?: Timestamp | null;
  isAllDay?: boolean;
  /** ID события в Google Calendar; null/undefined до первого экспорта. */
  gcalEventId?: string | null;
  /** Источник последней записи — используется для anti-echo петли синхронизации. */
  lastWriteSource?: GroupEventWriteSource;
  lastSyncedAt?: Timestamp | null;
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
  /** Для kind='assignment' — развёрнутый текст в модалке. */
  longText?: string;
  /** Для kind='event' — точное время начала (если известно из формы/GCal). */
  startAt?: Timestamp | null;
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
  const lastWriteSource: GroupEventWriteSource | undefined =
    data.lastWriteSource === 'gcal' || data.lastWriteSource === 'firestore'
      ? data.lastWriteSource
      : undefined;
  return {
    id,
    groupId,
    kind,
    text,
    dateLabel,
    dueDate,
    zoomLink: typeof data.zoomLink === 'string' && data.zoomLink.trim() ? data.zoomLink.trim() : undefined,
    longText: typeof data.longText === 'string' && data.longText.trim() ? data.longText : undefined,
    startAt: (data.startAt as Timestamp | null) ?? null,
    endAt: (data.endAt as Timestamp | null) ?? null,
    isAllDay: typeof data.isAllDay === 'boolean' ? data.isAllDay : undefined,
    gcalEventId: typeof data.gcalEventId === 'string' && data.gcalEventId ? data.gcalEventId : null,
    lastWriteSource,
    lastSyncedAt: (data.lastSyncedAt as Timestamp | null) ?? null,
    createdAt: (data.createdAt as Timestamp | null) ?? null,
    createdBy,
    createdByName:
      typeof data.createdByName === 'string' ? data.createdByName : undefined,
  };
}
