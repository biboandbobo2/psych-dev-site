/**
 * Уведомления преподавателю о бронях экзамена.
 *
 * Firestore-trigger onWrite на `exams/{examId}/slots/{slotId}` синхронизирует
 * один personal GCal-календарь и шлёт сообщения в Telegram. Чем эта функция
 * отличается от gcalSync: тот синхронизирует групповые календари студентов
 * (двусторонний sync с syncToken), а здесь — однонаправленный экспорт
 * экзаменационных слотов в один календарь конкретного преподавателя.
 *
 * Логика по числу занятых гнёзд (count) переходит между before и after слота:
 *   0 → ≥1: insertEvent (или patch-«реактивация», если осталось `personalGcalEventId`)
 *   ≥1 → ≥1: patchEvent (обновляем description со списком студентов)
 *   ≥1 → 0: patchEvent — помечаем «❌ ОТМЕНЕНО», transparency=transparent (не удаляем)
 *   0 → 0: skip
 * Изменение startAt/endAt при count > 0: patchEvent со временем.
 *
 * Конфиг:
 *   - personal-gcal-id (Secret Manager) или env PERSONAL_GCAL_ID — calendar ID.
 *   - Если не выставлен — функция логирует и пропускает GCal-часть. TG продолжает работать.
 *   - Telegram chat ID берётся из существующего telegram-chat-id (sendTelegramMessage).
 */

import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { insertEvent, patchEvent } from "./lib/gcalClient.js";
import { sendTelegramMessage } from "./lib/telegram.js";
import { tryReadLatestSecretValue } from "./lib/secrets.js";
import { FUNCTIONS_SERVICE_ACCOUNT } from "./lib/shared.js";
import {
  debugError as functionsDebugError,
  debugLog as functionsDebugLog,
} from "./lib/debug.js";

const TIME_ZONE = "Asia/Tbilisi";
const PERSONAL_GCAL_SECRET =
  process.env.PERSONAL_GCAL_SECRET_NAME || "personal-gcal-id";

interface SlotBookings {
  [groupId: string]: { bookedAt: Timestamp } | null;
}

interface SlotDocData {
  startAt?: Timestamp;
  endAt?: Timestamp;
  bookings?: SlotBookings;
  personalGcalEventId?: string | null;
}

interface ExamDocData {
  title?: string;
  status?: "active" | "archived";
  timezone?: string;
}

interface BookingDetailsData {
  userName?: string;
  userEmail?: string;
  groupId?: string;
}

interface GroupDocData {
  name?: string;
}

let cachedCalendarIdPromise: Promise<string | null> | null = null;

async function getPersonalCalendarId(): Promise<string | null> {
  if (cachedCalendarIdPromise) return cachedCalendarIdPromise;
  cachedCalendarIdPromise = (async () => {
    const fromEnv = process.env.PERSONAL_GCAL_ID?.trim();
    if (fromEnv) return fromEnv;
    const fromSecret = await tryReadLatestSecretValue(PERSONAL_GCAL_SECRET);
    return fromSecret?.trim() || null;
  })().catch((err) => {
    cachedCalendarIdPromise = null;
    throw err;
  });
  return cachedCalendarIdPromise;
}

export function resetPersonalCalendarIdCache() {
  cachedCalendarIdPromise = null;
}

export function countOccupied(bookings: SlotBookings | null | undefined): number {
  if (!bookings) return 0;
  let n = 0;
  for (const v of Object.values(bookings)) {
    if (v != null) n += 1;
  }
  return n;
}

export function occupiedGroupIds(
  bookings: SlotBookings | null | undefined
): string[] {
  if (!bookings) return [];
  return Object.entries(bookings)
    .filter(([, v]) => v != null)
    .map(([k]) => k);
}

export type SlotTransition =
  | { kind: "skip" }
  | { kind: "first-booking" } // 0 → ≥1
  | { kind: "self-heal" } // ≥1 → ≥1 без eventId (backfill / восстановление)
  | { kind: "added"; delta: number } // ≥1 → ≥1, count↑
  | { kind: "removed"; delta: number } // ≥1 → ≥1, count↓
  | { kind: "all-cancelled" } // ≥1 → 0
  | { kind: "time-shift" } // count > 0 не изменилось, но startAt/endAt поменялись
  | { kind: "deleted"; hadEvent: boolean }; // документ слота удалён

export function detectTransition(
  before: SlotDocData | null,
  after: SlotDocData | null
): SlotTransition {
  if (!after) {
    return { kind: "deleted", hadEvent: Boolean(before?.personalGcalEventId) };
  }
  const cBefore = countOccupied(before?.bookings);
  const cAfter = countOccupied(after.bookings);

  // Self-heal: count > 0, eventId ещё не создан, bookings и время не менялись.
  // Срабатывает на «touch» (любое мета-поле дописали в slot) и создаёт event для
  // старых броней, забронированных до деплоя триггера. TG не отправляется,
  // потому что бронь не «новая». Если bookings или время менялись — это
  // нормальный пользовательский переход, обрабатывается ниже.
  if (cAfter > 0 && !after.personalGcalEventId && cBefore === cAfter && cBefore > 0) {
    const beforeKeys = occupiedGroupIds(before?.bookings).sort();
    const afterKeys = occupiedGroupIds(after.bookings).sort();
    const sameBookings =
      beforeKeys.length === afterKeys.length &&
      beforeKeys.every((k, i) => k === afterKeys[i]);
    const sameStart =
      (before?.startAt?.toMillis() ?? null) === (after.startAt?.toMillis() ?? null);
    const sameEnd =
      (before?.endAt?.toMillis() ?? null) === (after.endAt?.toMillis() ?? null);
    if (sameBookings && sameStart && sameEnd) {
      return { kind: "self-heal" };
    }
  }

  if (cBefore === 0 && cAfter === 0) return { kind: "skip" };
  if (cBefore === 0 && cAfter > 0) return { kind: "first-booking" };
  if (cBefore > 0 && cAfter === 0) return { kind: "all-cancelled" };

  if (cAfter > cBefore) return { kind: "added", delta: cAfter - cBefore };
  if (cAfter < cBefore) return { kind: "removed", delta: cBefore - cAfter };

  // count не изменился, но bookings — поэлементно сверяем
  const beforeKeys = occupiedGroupIds(before?.bookings).sort();
  const afterKeys = occupiedGroupIds(after.bookings).sort();
  const bookingsSame =
    beforeKeys.length === afterKeys.length &&
    beforeKeys.every((k, i) => k === afterKeys[i]);

  if (!bookingsSame) {
    // редкий случай: симметричный обмен (одна отменилась, другая забронировала
    // ровно между транзакциями) — обрабатываем как «added» чтобы привлечь внимание
    return { kind: "added", delta: 0 };
  }

  // bookings те же, но мог измениться startAt/endAt (reschedule)
  const startChanged =
    before?.startAt && after.startAt
      ? before.startAt.toMillis() !== after.startAt.toMillis()
      : Boolean(before?.startAt) !== Boolean(after.startAt);
  const endChanged =
    before?.endAt && after.endAt
      ? before.endAt.toMillis() !== after.endAt.toMillis()
      : Boolean(before?.endAt) !== Boolean(after.endAt);

  if (startChanged || endChanged) return { kind: "time-shift" };
  return { kind: "skip" };
}

interface BookingPerson {
  groupId: string;
  groupName: string;
  userName: string;
  userEmail: string;
}

function formatTime(ts: Timestamp | undefined): string {
  if (!ts) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TIME_ZONE,
  }).format(new Date(ts.toMillis()));
}

function formatHHmm(ts: Timestamp | undefined): string {
  if (!ts) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TIME_ZONE,
  }).format(new Date(ts.toMillis()));
}

export function buildEventDescription(
  people: BookingPerson[],
  total: number
): string {
  if (people.length === 0) {
    return `Все брони отменены — ${formatTime(Timestamp.now())}.`;
  }
  const lines = people.map(
    (p) => `• ${p.userName} <${p.userEmail}> — ${p.groupName}`
  );
  return `Занято: ${people.length}/${total}\n\n${lines.join("\n")}`;
}

export function buildGCalPayload(args: {
  examTitle: string;
  startAt: Timestamp;
  endAt: Timestamp;
  people: BookingPerson[];
  totalSlots: number;
  cancelled: boolean;
}): Record<string, unknown> {
  const { examTitle, startAt, endAt, people, totalSlots, cancelled } = args;
  const time = formatHHmm(startAt);
  const baseSummary = `${examTitle} — ${time}`;
  const summary = cancelled ? `❌ ОТМЕНЕНО — ${baseSummary}` : baseSummary;
  const description = cancelled
    ? `Все брони отменены ${formatTime(Timestamp.now())}.`
    : buildEventDescription(people, totalSlots);

  const payload: Record<string, unknown> = {
    summary,
    description,
    start: { dateTime: new Date(startAt.toMillis()).toISOString(), timeZone: TIME_ZONE },
    end: { dateTime: new Date(endAt.toMillis()).toISOString(), timeZone: TIME_ZONE },
  };
  if (cancelled) payload.transparency = "transparent";
  return payload;
}

function tgEscape(text: string): string {
  // Markdown v1: экранируем '*', '_', '`', '['
  return text.replace(/([*_`\[])/g, "\\$1");
}

export function buildTgMessage(args: {
  transition: SlotTransition;
  examTitle: string;
  startAt: Timestamp;
  endAt: Timestamp;
  people: BookingPerson[];
  totalSlots: number;
  added?: BookingPerson[];
  removed?: BookingPerson[];
}): string | null {
  const { transition, examTitle, startAt, people, totalSlots, added, removed } = args;
  const head = (emoji: string, label: string) =>
    `${emoji} *${label}*\n${tgEscape(examTitle)}\n🗓 ${formatTime(startAt)}\n👥 ${people.length}/${totalSlots}`;

  const list = (xs: BookingPerson[] | undefined) =>
    xs && xs.length
      ? xs
          .map((p) => `• ${tgEscape(p.userName)} <${tgEscape(p.userEmail)}> — ${tgEscape(p.groupName)}`)
          .join("\n")
      : "";

  switch (transition.kind) {
    case "first-booking": {
      return [head("🟢", "Новая бронь экзамена"), list(people)].filter(Boolean).join("\n\n");
    }
    case "added": {
      const items = added && added.length ? list(added) : list(people);
      return [head("🟢", "Доп. бронь экзамена"), items].filter(Boolean).join("\n\n");
    }
    case "removed": {
      const items = removed && removed.length ? list(removed) : "";
      return [head("🔵", "Отмена брони (слот ещё активен)"), items, list(people)].filter(Boolean).join("\n\n");
    }
    case "all-cancelled": {
      return head("🔴", "Все брони отменены");
    }
    case "time-shift": {
      return [head("📅", "Перенос слота"), list(people)].filter(Boolean).join("\n\n");
    }
    case "self-heal":
    case "deleted":
    case "skip":
      return null;
  }
}

async function loadExam(db: FirebaseFirestore.Firestore, examId: string): Promise<ExamDocData | null> {
  const snap = await db.doc(`exams/${examId}`).get();
  return snap.exists ? (snap.data() as ExamDocData) : null;
}

async function loadGroupName(
  db: FirebaseFirestore.Firestore,
  groupId: string
): Promise<string> {
  const snap = await db.doc(`groups/${groupId}`).get();
  const data = snap.data() as GroupDocData | undefined;
  return data?.name?.trim() || groupId;
}

async function loadPeople(
  db: FirebaseFirestore.Firestore,
  examId: string,
  slotId: string,
  occupied: string[]
): Promise<BookingPerson[]> {
  const items = await Promise.all(
    occupied.map(async (groupId) => {
      const detailsId = `${slotId}__${groupId}`;
      const [detailsSnap, groupName] = await Promise.all([
        db.doc(`exams/${examId}/bookingDetails/${detailsId}`).get(),
        loadGroupName(db, groupId),
      ]);
      const data = detailsSnap.data() as BookingDetailsData | undefined;
      return {
        groupId,
        groupName,
        userName: data?.userName?.trim() || "(без имени)",
        userEmail: data?.userEmail?.trim() || "(без email)",
      } satisfies BookingPerson;
    })
  );
  return items;
}

async function syncGCal(args: {
  calendarId: string | null;
  slotRef: FirebaseFirestore.DocumentReference;
  existingEventId: string | null;
  payload: Record<string, unknown>;
}): Promise<string | null> {
  const { calendarId, slotRef, existingEventId, payload } = args;
  if (!calendarId) {
    functionsDebugLog("⏭  personal calendar id not set, skip GCal");
    return existingEventId;
  }

  try {
    if (existingEventId) {
      await patchEvent(calendarId, existingEventId, payload);
      await slotRef.update({ personalGcalSyncedAt: FieldValue.serverTimestamp() });
      functionsDebugLog(`🔼 personal gcal patch ${existingEventId}`);
      return existingEventId;
    }
    const result = await insertEvent(calendarId, payload);
    await slotRef.update({
      personalGcalEventId: result.id,
      personalGcalSyncedAt: FieldValue.serverTimestamp(),
    });
    functionsDebugLog(`⬆️ personal gcal insert ${result.id}`);
    return result.id;
  } catch (err) {
    functionsDebugError("❌ personal gcal export failed", err);
    await slotRef
      .update({ personalGcalSyncError: String((err as Error)?.message ?? err) })
      .catch(() => undefined);
    return existingEventId;
  }
}

// cpu/memory явно: у gen2 другие дефолты, не выкручиваем ресурсы.
export const onExamSlotWrite = onDocumentWritten(
  {
    document: "exams/{examId}/slots/{slotId}",
    region: "us-central1",
    cpu: 1,
    memory: "256MiB",
    // секреты (personal-gcal-id, telegram) и календарь расшарены на appspot SA
    serviceAccount: FUNCTIONS_SERVICE_ACCOUNT,
  },
  async (event) => {
    const examId = event.params.examId;
    const slotId = event.params.slotId;
    const beforeSnap = event.data?.before;
    const afterSnap = event.data?.after;
    const before = beforeSnap?.exists
      ? (beforeSnap.data() as SlotDocData)
      : null;
    const after = afterSnap?.exists ? (afterSnap.data() as SlotDocData) : null;

    const transition = detectTransition(before, after);
    // detectTransition возвращает 'skip' для нашего собственного after-write
    // (одинаковые bookings и одинаковые startAt/endAt) — anti-echo встроен.
    if (transition.kind === "skip") return;

    const db = getFirestore();
    const slotRef = db.doc(`exams/${examId}/slots/${slotId}`);

    if (transition.kind === "deleted") {
      // Слот удалён админкой. Если оставался GCal-event — пометим title.
      // Удалять calendar event не будем: сохранится исторический след.
      if (!transition.hadEvent || !before) return;
      const calendarId = await getPersonalCalendarId();
      if (!calendarId || !before.personalGcalEventId) return;
      const exam = await loadExam(db, examId);
      const examTitle = exam?.title?.trim() || "Экзамен";
      const startAt = before.startAt ?? Timestamp.now();
      const endAt = before.endAt ?? startAt;
      const payload = buildGCalPayload({
        examTitle: `[удалён] ${examTitle}`,
        startAt,
        endAt,
        people: [],
        totalSlots: 0,
        cancelled: true,
      });
      try {
        await patchEvent(calendarId, before.personalGcalEventId, payload);
      } catch (err) {
        functionsDebugError("❌ patch on slot delete failed", err);
      }
      try {
        await sendTelegramMessage(
          `🗑 *Слот удалён*\n${tgEscape(examTitle)}\n🗓 ${formatTime(startAt)}`
        );
      } catch (err) {
        functionsDebugError("❌ telegram on slot delete failed", err);
      }
      return;
    }

    if (!after || !after.startAt || !after.endAt) {
      functionsDebugLog(`⏭ slot ${slotId} has no startAt/endAt — skip`);
      return;
    }

    const exam = await loadExam(db, examId);
    if (!exam) {
      functionsDebugLog(`⏭ exam ${examId} not found — skip`);
      return;
    }
    const examTitle = exam.title?.trim() || "Экзамен";

    const occupiedAfter = occupiedGroupIds(after.bookings);
    const occupiedBefore = occupiedGroupIds(before?.bookings);
    const totalSlots = Object.keys(after.bookings ?? {}).length;

    const peopleAfter = await loadPeople(db, examId, slotId, occupiedAfter);
    const addedGroupIds = occupiedAfter.filter((g) => !occupiedBefore.includes(g));
    const removedGroupIds = occupiedBefore.filter((g) => !occupiedAfter.includes(g));
    const added = peopleAfter.filter((p) => addedGroupIds.includes(p.groupId));

    // Для removed нужно подтянуть детали — но bookingDetails уже удалены
    // транзакцией cancelExamBooking. Имя берём из before (если было).
    const removed: BookingPerson[] = [];
    for (const groupId of removedGroupIds) {
      // bookingDetails удалён вместе с отменой — имя восстановить нельзя.
      removed.push({
        groupId,
        groupName: await loadGroupName(db, groupId),
        userName: "(отменено)",
        userEmail: "",
      });
    }

    const calendarId = await getPersonalCalendarId();
    const cancelled = transition.kind === "all-cancelled";
    const payload = buildGCalPayload({
      examTitle,
      startAt: after.startAt,
      endAt: after.endAt,
      people: peopleAfter,
      totalSlots,
      cancelled,
    });

    await syncGCal({
      calendarId,
      slotRef,
      existingEventId: after.personalGcalEventId ?? null,
      payload,
    });

    const tgText = buildTgMessage({
      transition,
      examTitle,
      startAt: after.startAt,
      endAt: after.endAt,
      people: peopleAfter,
      totalSlots,
      added,
      removed,
    });
    if (tgText) {
      try {
        await sendTelegramMessage(tgText);
      } catch (err) {
        functionsDebugError("❌ telegram exam notification failed", err);
      }
    }
  });
