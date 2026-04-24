/**
 * Двусторонняя синхронизация событий `groups/{groupId}/events` с Google Calendar.
 *
 * Архитектура:
 * 1. Import (scheduled pub/sub, 10 мин): читает GCal с incremental syncToken,
 *    upsert-ит в Firestore с lastWriteSource='gcal'.
 * 2. Export (firestore onWrite): если source === 'firestore' — экспортируем
 *    изменения в GCal. Anti-echo:
 *    - после import source === 'gcal' → skip;
 *    - наш же after-export update затрагивает ТОЛЬКО sync-meta поля
 *      (gcalEventId, lastSyncedAt) → skip.
 *
 * Assignments (kind='assignment') в GCal не экспортируются.
 */

import * as functions from "firebase-functions";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import {
  debugError as functionsDebugError,
  debugLog as functionsDebugLog,
} from "./lib/debug.js";
import {
  listEvents,
  insertEvent,
  patchEvent,
  deleteEvent,
  type GCalEvent,
} from "./lib/gcalClient.js";
import {
  gcalEventToFirestore,
  firestoreEventToGCal,
  type FirestoreEventForExport,
} from "../../shared/gcalMapping.js";

const TIME_ZONE = "Asia/Tbilisi";

/** Поля в документе event, изменение которых указывает на «настоящий» пользовательский write. */
const USER_FIELDS = [
  "text",
  "dateLabel",
  "dueDate",
  "zoomLink",
  "startAt",
  "endAt",
  "isAllDay",
  "kind",
];

interface GroupDocData {
  gcalId?: string | null;
  gcalSyncState?: { syncToken?: string; lastSyncedAt?: Timestamp; lastError?: string };
  name?: string;
}

interface EventDocData {
  kind?: "event" | "assignment";
  text?: string;
  dateLabel?: string;
  dueDate?: string | null;
  zoomLink?: string | null;
  startAt?: Timestamp | null;
  endAt?: Timestamp | null;
  isAllDay?: boolean;
  gcalEventId?: string | null;
  lastWriteSource?: "firestore" | "gcal";
  lastSyncedAt?: Timestamp | null;
  createdAt?: Timestamp | null;
  createdBy?: string;
  createdByName?: string;
}

/**
 * Scheduled function: каждые 10 минут импортирует изменения из GCal в Firestore
 * для всех групп, у которых проставлен gcalId.
 */
export const syncGroupCalendars = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("every 10 minutes")
  .timeZone(TIME_ZONE)
  .onRun(async () => {
    const db = getFirestore();
    const groupsSnap = await db.collection("groups").get();
    const groups = groupsSnap.docs
      .map((d) => ({ id: d.id, data: d.data() as GroupDocData }))
      .filter((g) => typeof g.data.gcalId === "string" && g.data.gcalId);

    functionsDebugLog(`🔄 syncGroupCalendars: ${groups.length} group(s) with gcalId`);

    for (const group of groups) {
      try {
        await syncSingleGroup(group.id, group.data);
      } catch (err) {
        functionsDebugError(`❌ sync failed for group ${group.id}`, err);
        await db.collection("groups").doc(group.id).update({
          "gcalSyncState.lastError": String((err as Error)?.message ?? err),
          "gcalSyncState.lastSyncedAt": FieldValue.serverTimestamp(),
        });
      }
    }
  });

async function syncSingleGroup(groupId: string, group: GroupDocData): Promise<void> {
  const calendarId = group.gcalId!;
  const prevSyncToken = group.gcalSyncState?.syncToken;

  let { events, nextSyncToken, syncTokenInvalid } = await listEvents(
    calendarId,
    prevSyncToken
  );

  if (syncTokenInvalid) {
    functionsDebugLog(`⚠️  syncToken invalid for ${groupId}, retrying full-sync`);
    const retry = await listEvents(calendarId);
    events = retry.events;
    nextSyncToken = retry.nextSyncToken;
  }

  const db = getFirestore();
  const eventsRef = db.collection("groups").doc(groupId).collection("events");

  let applied = 0;
  let deleted = 0;

  for (const ev of events) {
    if (!ev.id) continue;

    if (ev.status === "cancelled") {
      const existing = await eventsRef.where("gcalEventId", "==", ev.id).get();
      for (const doc of existing.docs) {
        await doc.ref.delete();
        deleted += 1;
      }
      continue;
    }

    const mapped = gcalEventToFirestore(ev, TIME_ZONE);
    if (!mapped) continue;

    const existing = await eventsRef.where("gcalEventId", "==", ev.id).limit(1).get();
    const payload = {
      kind: "event" as const,
      text: mapped.text,
      dateLabel: mapped.dateLabel,
      dueDate: null,
      ...(mapped.zoomLink ? { zoomLink: mapped.zoomLink } : {}),
      startAt: Timestamp.fromMillis(mapped.startAtMs),
      endAt: Timestamp.fromMillis(mapped.endAtMs),
      isAllDay: mapped.isAllDay,
      gcalEventId: mapped.gcalEventId,
      lastWriteSource: "gcal" as const,
      lastSyncedAt: FieldValue.serverTimestamp(),
    };

    if (existing.empty) {
      await eventsRef.add({
        ...payload,
        createdAt: FieldValue.serverTimestamp(),
        createdBy: "gcal-sync",
      });
    } else {
      await existing.docs[0].ref.set(payload, { merge: true });
    }
    applied += 1;
  }

  await db.collection("groups").doc(groupId).set(
    {
      gcalSyncState: {
        syncToken: nextSyncToken ?? null,
        lastSyncedAt: FieldValue.serverTimestamp(),
        lastError: FieldValue.delete(),
      },
    },
    { merge: true }
  );

  functionsDebugLog(
    `✅ ${groupId}: applied=${applied}, deleted=${deleted}, nextToken=${nextSyncToken ? "set" : "none"}`
  );
}

/**
 * Firestore trigger: при создании/изменении/удалении события в админке
 * экспортирует изменения в GCal. Не трогает assignments.
 */
export const onGroupEventWrite = functions.firestore
  .document("groups/{groupId}/events/{eventId}")
  .onWrite(async (change, context) => {
    const groupId = context.params.groupId as string;
    const eventId = context.params.eventId as string;
    const before = change.before.exists ? (change.before.data() as EventDocData) : null;
    const after = change.after.exists ? (change.after.data() as EventDocData) : null;

    // Удаление документа → delete в GCal (если был привязан).
    if (!after) {
      if (!before?.gcalEventId) return;
      const group = await loadGroupForSync(groupId);
      if (!group?.gcalId) return;
      await deleteEvent(group.gcalId, before.gcalEventId);
      functionsDebugLog(`🗑 gcal delete ${before.gcalEventId} (${groupId})`);
      return;
    }

    // Assignments не синхронизируем.
    if (after.kind === "assignment") return;

    // Запись, пришедшая от import → ничего не делаем.
    if (after.lastWriteSource === "gcal") return;

    // Skip echo: наш же after-export update затронул только sync-meta поля.
    if (before && onlyMetaFieldsChanged(before, after)) return;

    const group = await loadGroupForSync(groupId);
    if (!group?.gcalId) return;

    // Для корректного экспорта нужны startAt/endAt. Если их нет (старое событие
    // или админ ввёл только dateLabel) — skip, фича включится после того как
    // форма админки начнёт их писать.
    if (!after.startAt || !after.endAt) {
      functionsDebugLog(`⏭  event ${eventId} has no startAt/endAt — skip export`);
      return;
    }

    const exportDoc: FirestoreEventForExport = {
      id: eventId,
      text: after.text ?? "",
      startAtMs: after.startAt.toMillis(),
      endAtMs: after.endAt.toMillis(),
      isAllDay: Boolean(after.isAllDay),
      zoomLink: after.zoomLink ?? undefined,
    };
    const payload = firestoreEventToGCal(exportDoc, TIME_ZONE);

    const db = getFirestore();
    const docRef = db.collection("groups").doc(groupId).collection("events").doc(eventId);

    try {
      if (after.gcalEventId) {
        await patchEvent(group.gcalId, after.gcalEventId, payload as unknown as Record<string, unknown>);
        await docRef.update({ lastSyncedAt: FieldValue.serverTimestamp() });
        functionsDebugLog(`🔼 gcal patch ${after.gcalEventId} (${groupId})`);
      } else {
        const result = await insertEvent(group.gcalId, payload as unknown as Record<string, unknown>);
        await docRef.update({
          gcalEventId: result.id,
          lastSyncedAt: FieldValue.serverTimestamp(),
        });
        functionsDebugLog(`⬆️ gcal insert ${result.id} (${groupId})`);
      }
    } catch (err) {
      functionsDebugError(`❌ gcal export failed for ${groupId}/${eventId}`, err);
      // Мы специально не кидаем дальше — иначе Firestore зациклит retry
      // триггера. Ошибку зафиксируем в документе, чтобы админ мог увидеть.
      await docRef.update({
        "gcalSyncError": String((err as Error)?.message ?? err),
        "lastSyncedAt": FieldValue.serverTimestamp(),
      }).catch(() => undefined);
    }
  });

async function loadGroupForSync(groupId: string): Promise<GroupDocData | null> {
  const snap = await getFirestore().collection("groups").doc(groupId).get();
  if (!snap.exists) return null;
  return snap.data() as GroupDocData;
}

/**
 * Проверяет, что в after по сравнению с before изменились ТОЛЬКО поля
 * gcalEventId / lastSyncedAt (наш собственный after-export update).
 */
function onlyMetaFieldsChanged(before: EventDocData, after: EventDocData): boolean {
  const changed: string[] = [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    const a = (before as Record<string, unknown>)[key];
    const b = (after as Record<string, unknown>)[key];
    if (!deepEqual(a, b)) changed.push(key);
  }
  if (changed.length === 0) return true;
  if (changed.some((k) => USER_FIELDS.includes(k))) return false;
  return changed.every((k) => k === "gcalEventId" || k === "lastSyncedAt" || k === "gcalSyncError");
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a instanceof Timestamp && b instanceof Timestamp) return a.isEqual(b);
  if (
    a &&
    b &&
    typeof a === "object" &&
    typeof b === "object"
  ) {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}
