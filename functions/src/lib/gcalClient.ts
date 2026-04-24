/**
 * Лёгкая fetch-обёртка поверх Google Calendar REST API v3.
 *
 * Используем google-auth-library (уже есть в зависимостях) вместо googleapis —
 * чтобы не раздувать bundle Cloud Functions. Авторизация происходит через
 * Application Default Credentials (default compute SA), которому владелец
 * календаря выдал права «Make changes to events».
 */

import { GoogleAuth } from "google-auth-library";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const API_BASE = "https://www.googleapis.com/calendar/v3";

let cachedAuth: GoogleAuth | null = null;
function getAuth(): GoogleAuth {
  if (!cachedAuth) {
    cachedAuth = new GoogleAuth({ scopes: [CALENDAR_SCOPE] });
  }
  return cachedAuth;
}

async function authFetch(
  url: string,
  init: RequestInit & { method?: string; body?: string } = {}
): Promise<Response> {
  const client = await getAuth().getClient();
  const token = await client.getAccessToken();
  if (!token.token) {
    throw new Error("Failed to acquire Google access token for Calendar API");
  }
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token.token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

export interface GCalEvent {
  id?: string;
  status?: "confirmed" | "tentative" | "cancelled";
  summary?: string;
  description?: string;
  location?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  updated?: string;
  extendedProperties?: { private?: Record<string, string>; shared?: Record<string, string> };
}

export interface ListEventsResult {
  events: GCalEvent[];
  nextSyncToken?: string;
  /** Если true — Google вернул 410 Gone, надо делать full-sync без syncToken. */
  syncTokenInvalid: boolean;
}

/**
 * Incremental list: singleEvents=true разворачивает recurring, showDeleted=true
 * возвращает cancelled, чтобы мы могли удалить их в Firestore.
 * Автоматически листает pageToken; syncToken появляется только на последней странице.
 */
export async function listEvents(
  calendarId: string,
  syncToken?: string
): Promise<ListEventsResult> {
  const events: GCalEvent[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | undefined;
  let isFirstPage = true;

  while (true) {
    const params = new URLSearchParams();
    if (syncToken && isFirstPage) {
      params.set("syncToken", syncToken);
    } else if (!syncToken && isFirstPage) {
      // Full-sync — ограничиваемся недавним окном, чтобы не тянуть всю историю.
      const from = new Date();
      from.setMonth(from.getMonth() - 1);
      params.set("timeMin", from.toISOString());
    }
    if (pageToken) params.set("pageToken", pageToken);
    params.set("singleEvents", "true");
    params.set("showDeleted", "true");
    params.set("maxResults", "2500");

    const url = `${API_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`;
    const resp = await authFetch(url);
    if (resp.status === 410) {
      return { events: [], syncTokenInvalid: true };
    }
    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`GCal list failed ${resp.status}: ${body}`);
    }
    const json = (await resp.json()) as {
      items?: GCalEvent[];
      nextPageToken?: string;
      nextSyncToken?: string;
    };
    if (json.items) events.push(...json.items);
    pageToken = json.nextPageToken;
    if (!pageToken) {
      nextSyncToken = json.nextSyncToken;
      break;
    }
    isFirstPage = false;
  }

  return { events, nextSyncToken, syncTokenInvalid: false };
}

export interface InsertEventResult {
  id: string;
  updated: string;
}

export async function insertEvent(
  calendarId: string,
  payload: Record<string, unknown>
): Promise<InsertEventResult> {
  const url = `${API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`;
  const resp = await authFetch(url, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`GCal insert failed ${resp.status}: ${body}`);
  }
  const json = (await resp.json()) as InsertEventResult;
  return json;
}

export async function patchEvent(
  calendarId: string,
  eventId: string,
  payload: Record<string, unknown>
): Promise<InsertEventResult> {
  const url = `${API_BASE}/calendars/${encodeURIComponent(
    calendarId
  )}/events/${encodeURIComponent(eventId)}`;
  const resp = await authFetch(url, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`GCal patch failed ${resp.status}: ${body}`);
  }
  const json = (await resp.json()) as InsertEventResult;
  return json;
}

export async function deleteEvent(
  calendarId: string,
  eventId: string
): Promise<void> {
  const url = `${API_BASE}/calendars/${encodeURIComponent(
    calendarId
  )}/events/${encodeURIComponent(eventId)}`;
  const resp = await authFetch(url, { method: "DELETE" });
  // 410/404 означает «уже удалено» — это ок.
  if (!resp.ok && resp.status !== 410 && resp.status !== 404) {
    const body = await resp.text();
    throw new Error(`GCal delete failed ${resp.status}: ${body}`);
  }
}
