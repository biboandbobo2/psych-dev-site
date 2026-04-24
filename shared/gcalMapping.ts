/**
 * Pure-хелперы маппинга событий Google Calendar ↔ `groups/{id}/events`.
 *
 * Без зависимостей от firebase-admin/firebase-js — работаем с Date/number,
 * вызывающая сторона оборачивает результат в Timestamp. Это позволяет
 * переиспользовать хелперы и в Cloud Functions, и в юнит-тестах.
 */

/**
 * Событие Google Calendar в минимальной форме, которую возвращает
 * `calendar.events.list`. Формально полей больше, но нам достаточно этих.
 */
export interface GCalEventInput {
  id?: string | null;
  status?: string | null;
  summary?: string | null;
  description?: string | null;
  location?: string | null;
  start?: { dateTime?: string | null; date?: string | null; timeZone?: string | null } | null;
  end?: { dateTime?: string | null; date?: string | null; timeZone?: string | null } | null;
  updated?: string | null;
}

export interface MappedFirestoreEvent {
  gcalEventId: string;
  text: string;
  dateLabel: string;
  startAtMs: number;
  endAtMs: number;
  isAllDay: boolean;
  zoomLink?: string;
  /** updated timestamp из GCal (ms) — используется для LWW. */
  remoteUpdatedMs: number;
}

/**
 * Извлекает первую zoom-ссылку из свободного текста. Ищем и короткие, и
 * полные ссылки; возвращаем «чистый» URL без трейлинговой пунктуации.
 */
const ZOOM_LINK_RE = /https?:\/\/(?:[a-z0-9-]+\.)?zoom\.us\/[^\s<>"')]+/i;

export function extractZoomLink(
  ...sources: Array<string | null | undefined>
): string | undefined {
  for (const source of sources) {
    if (!source) continue;
    const match = source.match(ZOOM_LINK_RE);
    if (match) {
      return match[0].replace(/[),.;]+$/, '');
    }
  }
  return undefined;
}

/**
 * Форматирует дату события в короткую человекочитаемую метку «10.11» или
 * «10.11 14:00» (для событий с точным временем). Логика совпадает с тем,
 * что вводят руками в админке.
 */
export function formatDateLabel(
  startMs: number,
  endMs: number,
  isAllDay: boolean,
  timeZone: string
): string {
  const start = new Date(startMs);
  const dayMonth = new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    timeZone,
  }).format(start);

  if (isAllDay) {
    // Для all-day событий GCal хранит end на +1 день. Если событие >1 дня,
    // добавляем конечную дату через дефис.
    const durationDays = Math.round((endMs - startMs) / (24 * 60 * 60 * 1000));
    if (durationDays > 1) {
      // GCal хранит all-day с exclusive end: end=21 для одного дня 20. Чтобы
      // получить «последний включённый день» безопасно для любой TZ,
      // вычитаем целые сутки, а не одну миллисекунду.
      const endDate = new Date(endMs - 24 * 60 * 60 * 1000);
      const endDayMonth = new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        timeZone,
      }).format(endDate);
      return `${dayMonth}–${endDayMonth}`;
    }
    return dayMonth;
  }

  const time = new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  }).format(start);
  return `${dayMonth} ${time}`;
}

/**
 * Маппит GCal событие в форму, пригодную для записи в Firestore.
 * Возвращает null если у события нет id или start (битые данные).
 *
 * timeZone — таймзона для генерации человекочитаемого `dateLabel`;
 * обычно 'Asia/Tbilisi'.
 */
export function gcalEventToFirestore(
  ev: GCalEventInput,
  timeZone: string
): MappedFirestoreEvent | null {
  if (!ev.id || !ev.start) return null;

  const isAllDay = Boolean(ev.start.date && !ev.start.dateTime);
  const startRaw = ev.start.dateTime || ev.start.date;
  const endRaw = ev.end?.dateTime || ev.end?.date || startRaw;
  if (!startRaw) return null;

  const startAtMs = Date.parse(startRaw);
  const endAtMs = endRaw ? Date.parse(endRaw) : startAtMs;
  if (Number.isNaN(startAtMs) || Number.isNaN(endAtMs)) return null;

  const remoteUpdatedMs = ev.updated ? Date.parse(ev.updated) : 0;

  const summary = (ev.summary ?? '').trim() || '(без названия)';
  const dateLabel = formatDateLabel(startAtMs, endAtMs, isAllDay, timeZone);
  const zoomLink = extractZoomLink(ev.location, ev.description);

  return {
    gcalEventId: ev.id,
    text: summary,
    dateLabel,
    startAtMs,
    endAtMs,
    isAllDay,
    zoomLink,
    remoteUpdatedMs: Number.isNaN(remoteUpdatedMs) ? 0 : remoteUpdatedMs,
  };
}

/**
 * Форма payload для `calendar.events.insert` / `patch`. Имитируем минимум
 * нужных полей — всё остальное GCal подставит сам.
 */
export interface GCalEventPayload {
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  extendedProperties?: { private?: Record<string, string> };
}

export interface FirestoreEventForExport {
  id: string;
  text: string;
  startAtMs: number;
  endAtMs: number;
  isAllDay: boolean;
  zoomLink?: string;
}

/**
 * Обратный маппинг: Firestore-документ → payload для GCal.
 * В description кладём zoom-ссылку (если есть) и FS id в extendedProperties —
 * чтобы иметь reverse-link при импорте и уметь матчить «чужие» события,
 * если gcalEventId вдруг потеряется.
 */
export function firestoreEventToGCal(
  doc: FirestoreEventForExport,
  timeZone: string
): GCalEventPayload {
  const startIso = new Date(doc.startAtMs).toISOString();
  const endIso = new Date(doc.endAtMs).toISOString();

  const payload: GCalEventPayload = {
    summary: doc.text,
    start: doc.isAllDay
      ? { date: startIso.slice(0, 10) }
      : { dateTime: startIso, timeZone },
    end: doc.isAllDay
      ? { date: endIso.slice(0, 10) }
      : { dateTime: endIso, timeZone },
    extendedProperties: {
      private: { firestoreEventId: doc.id },
    },
  };

  if (doc.zoomLink) {
    payload.location = doc.zoomLink;
    payload.description = `Zoom: ${doc.zoomLink}`;
  }
  return payload;
}

/**
 * Last-Write-Wins: решает, какая из сторон «выиграла» по таймстампам.
 * Используется когда одновременно приходит правка и из Firestore, и из GCal.
 *
 * Возвращает 'remote' если GCal свежее, 'local' если Firestore свежее,
 * 'same' при равенстве (тогда ничего не пишем).
 */
export function resolveLWW(localUpdatedMs: number, remoteUpdatedMs: number):
  | 'local'
  | 'remote'
  | 'same' {
  if (remoteUpdatedMs > localUpdatedMs) return 'remote';
  if (localUpdatedMs > remoteUpdatedMs) return 'local';
  return 'same';
}
