import { describe, it, expect, vi, beforeEach } from "vitest";

// Мок firebase-admin/firestore (по образцу exams.test.ts).
const { mockDoc, docMap, docUpdates } = vi.hoisted(() => {
  const docMap = new Map<string, { exists: boolean; data?: Record<string, unknown> }>();
  const docUpdates: Array<{ path: string; payload: unknown }> = [];

  const buildRef = (path: string) => ({
    path,
    get: vi.fn(async () => {
      const snap = docMap.get(path) ?? { exists: false };
      return { exists: snap.exists, data: () => snap.data };
    }),
    update: vi.fn(async (payload: unknown) => {
      docUpdates.push({ path, payload });
    }),
  });
  const mockDoc = vi.fn((path: string) => buildRef(path));
  return { mockDoc, docMap, docUpdates };
});

vi.mock("firebase-admin/firestore", () => {
  class Timestamp {
    constructor(public _ms: number) {}
    static now() {
      return new Timestamp(Date.UTC(2026, 4, 10, 12, 0, 0));
    }
    static fromMillis(ms: number) {
      return new Timestamp(ms);
    }
    toMillis() {
      return this._ms;
    }
  }
  return {
    getFirestore: () => ({ doc: mockDoc }),
    FieldValue: { serverTimestamp: () => "__TS__" },
    Timestamp,
  };
});

vi.mock("firebase-admin/app", () => ({
  getApps: () => [{}],
  initializeApp: vi.fn(),
  applicationDefault: vi.fn(),
}));

vi.mock("firebase-functions/v2/firestore", () => ({
  onDocumentWritten: (_opts: unknown, fn: Function) => fn,
}));

const { insertEventMock, patchEventMock } = vi.hoisted(() => ({
  insertEventMock: vi.fn(async () => ({ id: "gcal-evt-1", updated: "2026-05-10T12:00:00Z" })),
  patchEventMock: vi.fn(async () => ({ id: "gcal-evt-1", updated: "2026-05-10T12:00:00Z" })),
}));

vi.mock("./lib/gcalClient.js", () => ({
  insertEvent: insertEventMock,
  patchEvent: patchEventMock,
  deleteEvent: vi.fn(),
}));

const { sendTelegramMock } = vi.hoisted(() => ({
  sendTelegramMock: vi.fn(async () => ({ ok: true })),
}));

vi.mock("./lib/telegram.js", () => ({
  sendTelegramMessage: sendTelegramMock,
}));

vi.mock("./lib/secrets.js", () => ({
  tryReadLatestSecretValue: vi.fn(async () => "calendar-id-personal@example.com"),
  readLatestSecretValue: vi.fn(),
}));

vi.mock("./lib/debug.js", () => ({
  debugLog: vi.fn(),
  debugError: vi.fn(),
}));

import {
  countOccupied,
  occupiedGroupIds,
  detectTransition,
  buildEventDescription,
  buildGCalPayload,
  buildTgMessage,
  onExamSlotWrite,
  resetPersonalCalendarIdCache,
} from "./examNotifications";
import { Timestamp } from "firebase-admin/firestore";

const ts = (ms: number) => Timestamp.fromMillis(ms);
const t1 = ts(Date.UTC(2026, 5, 12, 11, 0, 0)); // 12.06 15:00 Tbilisi (UTC+4)
const t2 = ts(Date.UTC(2026, 5, 12, 11, 40, 0));

beforeEach(() => {
  docMap.clear();
  docUpdates.length = 0;
  vi.clearAllMocks();
  resetPersonalCalendarIdCache();
});

describe("countOccupied", () => {
  it("0 для пустого/отсутствующего", () => {
    expect(countOccupied(undefined)).toBe(0);
    expect(countOccupied(null)).toBe(0);
    expect(countOccupied({})).toBe(0);
    expect(countOccupied({ a: null, b: null })).toBe(0);
  });
  it("считает только не-null гнёзда", () => {
    expect(countOccupied({ a: { bookedAt: ts(1) }, b: null })).toBe(1);
    expect(countOccupied({ a: { bookedAt: ts(1) }, b: { bookedAt: ts(2) } })).toBe(2);
  });
});

describe("occupiedGroupIds", () => {
  it("возвращает ключи занятых гнёзд", () => {
    expect(
      occupiedGroupIds({ a: { bookedAt: ts(1) }, b: null, c: { bookedAt: ts(2) } })
    ).toEqual(["a", "c"]);
  });
});

describe("detectTransition", () => {
  const empty = { bookings: { a: null, b: null }, startAt: t1, endAt: t2 };
  const oneA = { bookings: { a: { bookedAt: ts(1) }, b: null }, startAt: t1, endAt: t2 };
  const both = {
    bookings: { a: { bookedAt: ts(1) }, b: { bookedAt: ts(2) } },
    startAt: t1,
    endAt: t2,
  };

  it("0→0 — skip", () => {
    expect(detectTransition(empty, empty).kind).toBe("skip");
  });
  it("null before, 0 after — skip (создание пустого слота)", () => {
    expect(detectTransition(null, empty).kind).toBe("skip");
  });
  it("0→1 — first-booking", () => {
    expect(detectTransition(empty, oneA).kind).toBe("first-booking");
  });
  it("null before, 1 after — first-booking", () => {
    expect(detectTransition(null, oneA).kind).toBe("first-booking");
  });
  it("1→2 — added", () => {
    const tr = detectTransition(oneA, both);
    expect(tr.kind).toBe("added");
    if (tr.kind === "added") expect(tr.delta).toBe(1);
  });
  it("2→1 — removed", () => {
    const tr = detectTransition(both, oneA);
    expect(tr.kind).toBe("removed");
    if (tr.kind === "removed") expect(tr.delta).toBe(1);
  });
  it("1→0 — all-cancelled", () => {
    expect(detectTransition(oneA, empty).kind).toBe("all-cancelled");
  });
  it("delete — deleted", () => {
    expect(detectTransition(oneA, null).kind).toBe("deleted");
    expect(detectTransition({ ...oneA, personalGcalEventId: "x" }, null)).toEqual({
      kind: "deleted",
      hadEvent: true,
    });
  });
  it("одинаковые bookings + одинаковый startAt + eventId есть — skip (anti-echo)", () => {
    const withId = { ...oneA, personalGcalEventId: "gcal-evt-1" };
    expect(detectTransition(withId, withId).kind).toBe("skip");
  });
  it("одинаковые bookings, но eventId отсутствует — self-heal (backfill)", () => {
    expect(detectTransition(oneA, oneA).kind).toBe("self-heal");
  });
  it("self-heal не нужен если eventId уже создан (cnt>0, eventId есть)", () => {
    const withId = { ...oneA, personalGcalEventId: "gcal-evt-1" };
    // переход 1→1, eventId есть, time same — skip
    expect(detectTransition(withId, withId).kind).toBe("skip");
  });
  it("одинаковые bookings + изменённый startAt — time-shift", () => {
    const moved = { ...oneA, startAt: ts(t1.toMillis() + 60 * 60 * 1000) };
    expect(detectTransition(oneA, moved).kind).toBe("time-shift");
  });
  it("симметричный обмен (одна ушла, другая пришла) — added (delta=0)", () => {
    const aOnly = { bookings: { a: { bookedAt: ts(1) }, b: null }, startAt: t1, endAt: t2 };
    const bOnly = { bookings: { a: null, b: { bookedAt: ts(2) } }, startAt: t1, endAt: t2 };
    const tr = detectTransition(aOnly, bOnly);
    expect(tr.kind).toBe("added");
  });
});

describe("buildEventDescription", () => {
  it("формат списка студентов", () => {
    const desc = buildEventDescription(
      [
        { groupId: "g1", groupName: "Поток 1", userName: "Иван", userEmail: "i@x.com" },
        { groupId: "g2", groupName: "Поток 2", userName: "Пётр", userEmail: "p@x.com" },
      ],
      2
    );
    expect(desc).toContain("Занято: 2/2");
    expect(desc).toContain("Иван <i@x.com> — Поток 1");
    expect(desc).toContain("Пётр <p@x.com> — Поток 2");
  });
  it("пустой список — текст «Все брони отменены»", () => {
    expect(buildEventDescription([], 2)).toMatch(/Все брони отменены/);
  });
});

describe("buildGCalPayload", () => {
  it("обычный — summary без префикса", () => {
    const p = buildGCalPayload({
      examTitle: "Зачёт по психоанализу",
      startAt: t1,
      endAt: t2,
      people: [{ groupId: "g1", groupName: "Поток 1", userName: "И", userEmail: "i@x" }],
      totalSlots: 2,
      cancelled: false,
    });
    expect(p.summary).toMatch(/Зачёт по психоанализу — \d{2}:\d{2}/);
    expect(p.transparency).toBeUndefined();
  });
  it("cancelled — префикс ❌ + transparency=transparent", () => {
    const p = buildGCalPayload({
      examTitle: "Зачёт",
      startAt: t1,
      endAt: t2,
      people: [],
      totalSlots: 2,
      cancelled: true,
    });
    expect(String(p.summary)).toMatch(/^❌ ОТМЕНЕНО — Зачёт/);
    expect(p.transparency).toBe("transparent");
  });
});

describe("buildTgMessage", () => {
  const people = [
    { groupId: "g1", groupName: "Поток 1", userName: "Иван", userEmail: "i@x.com" },
  ];
  it("first-booking — 🟢", () => {
    const msg = buildTgMessage({
      transition: { kind: "first-booking" },
      examTitle: "Зачёт",
      startAt: t1,
      endAt: t2,
      people,
      totalSlots: 2,
    });
    expect(msg).toMatch(/🟢/);
    expect(msg).toContain("Зачёт");
    expect(msg).toContain("Иван");
  });
  it("all-cancelled — 🔴", () => {
    const msg = buildTgMessage({
      transition: { kind: "all-cancelled" },
      examTitle: "Зачёт",
      startAt: t1,
      endAt: t2,
      people: [],
      totalSlots: 2,
    });
    expect(msg).toMatch(/🔴/);
  });
  it("time-shift — 📅", () => {
    const msg = buildTgMessage({
      transition: { kind: "time-shift" },
      examTitle: "Зачёт",
      startAt: t1,
      endAt: t2,
      people,
      totalSlots: 2,
    });
    expect(msg).toMatch(/📅/);
  });
  it("skip/deleted/self-heal — null", () => {
    for (const kind of ["skip", "self-heal"] as const) {
      expect(
        buildTgMessage({
          transition: { kind },
          examTitle: "x",
          startAt: t1,
          endAt: t2,
          people: [],
          totalSlots: 2,
        })
      ).toBeNull();
    }
  });
});

describe("onExamSlotWrite (integration с моками)", () => {
  function snap(data: Record<string, unknown> | null) {
    return {
      exists: data !== null,
      data: () => data ?? undefined,
    };
  }
  function change(beforeData: Record<string, unknown> | null, afterData: Record<string, unknown> | null) {
    // v2-event: params + data.before/after
    return {
      params: { examId: "exam-1", slotId: "slot-1" },
      data: { before: snap(beforeData), after: snap(afterData) },
    };
  }

  function seedExam() {
    docMap.set("exams/exam-1", { exists: true, data: { title: "Зачёт", status: "active" } });
    docMap.set("groups/g1", { exists: true, data: { name: "Поток 1" } });
    docMap.set("groups/g2", { exists: true, data: { name: "Поток 2" } });
  }

  it("0→1: insertEvent + sendTelegramMessage + slot.update с personalGcalEventId", async () => {
    seedExam();
    docMap.set("exams/exam-1/bookingDetails/slot-1__g1", {
      exists: true,
      data: { userName: "Иван Иванов", userEmail: "i@x.com", groupId: "g1" },
    });

    await (onExamSlotWrite as Function)(
      change(
        { bookings: { g1: null, g2: null }, startAt: t1, endAt: t2 },
        { bookings: { g1: { bookedAt: ts(1) }, g2: null }, startAt: t1, endAt: t2 }
      )
    );

    expect(insertEventMock).toHaveBeenCalledTimes(1);
    expect(insertEventMock.mock.calls[0][0]).toBe("calendar-id-personal@example.com");
    const payload = insertEventMock.mock.calls[0][1] as Record<string, unknown>;
    expect(String(payload.summary)).toContain("Зачёт");
    expect(String(payload.description)).toContain("Иван Иванов");

    expect(sendTelegramMock).toHaveBeenCalledTimes(1);
    expect(sendTelegramMock.mock.calls[0][0]).toMatch(/🟢/);

    const idUpdate = docUpdates.find(
      (u) =>
        u.path === "exams/exam-1/slots/slot-1" &&
        (u.payload as Record<string, unknown>).personalGcalEventId === "gcal-evt-1"
    );
    expect(idUpdate).toBeDefined();
  });

  it("1→0: patchEvent с cancelled=true + tg 🔴", async () => {
    seedExam();
    await (onExamSlotWrite as Function)(
      change(
        {
          bookings: { g1: { bookedAt: ts(1) }, g2: null },
          startAt: t1,
          endAt: t2,
          personalGcalEventId: "gcal-evt-1",
        },
        {
          bookings: { g1: null, g2: null },
          startAt: t1,
          endAt: t2,
          personalGcalEventId: "gcal-evt-1",
        }
      )
    );
    expect(patchEventMock).toHaveBeenCalledTimes(1);
    const payload = patchEventMock.mock.calls[0][2] as Record<string, unknown>;
    expect(String(payload.summary)).toMatch(/^❌ ОТМЕНЕНО/);
    expect(payload.transparency).toBe("transparent");
    expect(insertEventMock).not.toHaveBeenCalled();
    expect(sendTelegramMock.mock.calls[0][0]).toMatch(/🔴/);
  });

  it("self-heal (backfill): cnt>0, eventId отсутствует → insertEvent БЕЗ TG", async () => {
    seedExam();
    docMap.set("exams/exam-1/bookingDetails/slot-1__g1", {
      exists: true,
      data: { userName: "Иван", userEmail: "i@x.com", groupId: "g1" },
    });
    const occupied = { bookings: { g1: { bookedAt: ts(1) }, g2: null }, startAt: t1, endAt: t2 };
    // touch — добавили marker, before и after одинаковы по bookings/time, eventId == null
    await (onExamSlotWrite as Function)(change(occupied, { ...occupied, personalGcalBackfillTouched: 1 }));

    expect(insertEventMock).toHaveBeenCalledTimes(1);
    expect(sendTelegramMock).not.toHaveBeenCalled();
    const idUpdate = docUpdates.find(
      (u) => (u.payload as Record<string, unknown>).personalGcalEventId === "gcal-evt-1"
    );
    expect(idUpdate).toBeDefined();
  });

  it("time-shift: изменился startAt → patchEvent с новым временем + 📅 TG", async () => {
    seedExam();
    docMap.set("exams/exam-1/bookingDetails/slot-1__g1", {
      exists: true,
      data: { userName: "Иван", userEmail: "i@x.com", groupId: "g1" },
    });
    const before = {
      bookings: { g1: { bookedAt: ts(1) }, g2: null },
      startAt: t1,
      endAt: t2,
      personalGcalEventId: "gcal-evt-1",
    };
    const after = {
      ...before,
      startAt: ts(t1.toMillis() + 60 * 60 * 1000),
      endAt: ts(t2.toMillis() + 60 * 60 * 1000),
    };
    await (onExamSlotWrite as Function)(change(before, after));

    expect(patchEventMock).toHaveBeenCalledTimes(1);
    expect(patchEventMock.mock.calls[0][1]).toBe("gcal-evt-1");
    const payload = patchEventMock.mock.calls[0][2] as Record<string, unknown>;
    expect((payload.start as { dateTime: string }).dateTime).toBe(
      new Date(after.startAt.toMillis()).toISOString()
    );
    expect(insertEventMock).not.toHaveBeenCalled();
    expect(sendTelegramMock.mock.calls[0][0]).toMatch(/📅/);
  });

  it("deleted с hadEvent: patchEvent с [удалён] + 🗑 TG", async () => {
    seedExam();
    const before = {
      bookings: { g1: { bookedAt: ts(1) }, g2: null },
      startAt: t1,
      endAt: t2,
      personalGcalEventId: "gcal-evt-1",
    };
    await (onExamSlotWrite as Function)(change(before, null));

    expect(patchEventMock).toHaveBeenCalledTimes(1);
    const payload = patchEventMock.mock.calls[0][2] as Record<string, unknown>;
    expect(String(payload.summary)).toMatch(/\[удалён\]/);
    expect(payload.transparency).toBe("transparent");
    expect(sendTelegramMock.mock.calls[0][0]).toMatch(/🗑/);
  });

  it("error path: insertEvent падает → personalGcalSyncError записан, eventId не обновлён", async () => {
    seedExam();
    docMap.set("exams/exam-1/bookingDetails/slot-1__g1", {
      exists: true,
      data: { userName: "Иван", userEmail: "i@x.com", groupId: "g1" },
    });
    insertEventMock.mockRejectedValueOnce(new Error("GCal 503: backend error"));

    await (onExamSlotWrite as Function)(
      change(
        { bookings: { g1: null, g2: null }, startAt: t1, endAt: t2 },
        { bookings: { g1: { bookedAt: ts(1) }, g2: null }, startAt: t1, endAt: t2 }
      )
    );

    expect(insertEventMock).toHaveBeenCalledTimes(1);
    const errUpdate = docUpdates.find(
      (u) =>
        typeof (u.payload as Record<string, unknown>).personalGcalSyncError === "string"
    );
    expect(errUpdate).toBeDefined();
    expect(
      String((errUpdate!.payload as Record<string, unknown>).personalGcalSyncError)
    ).toMatch(/GCal 503/);
    const idUpdate = docUpdates.find(
      (u) => (u.payload as Record<string, unknown>).personalGcalEventId !== undefined
    );
    expect(idUpdate).toBeUndefined();
    // TG всё равно отправляется — пользователь должен узнать о брони, даже если календарь лёг
    expect(sendTelegramMock).toHaveBeenCalledTimes(1);
  });

  it("anti-echo: одинаковый slot — никаких вызовов", async () => {
    seedExam();
    const same = {
      bookings: { g1: { bookedAt: ts(1) }, g2: null },
      startAt: t1,
      endAt: t2,
      personalGcalEventId: "gcal-evt-1",
    };
    await (onExamSlotWrite as Function)(change(same, same));
    expect(insertEventMock).not.toHaveBeenCalled();
    expect(patchEventMock).not.toHaveBeenCalled();
    expect(sendTelegramMock).not.toHaveBeenCalled();
  });
});
