import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class HttpsError extends Error {
    constructor(public code: string, message: string) {
      super(message);
      this.name = "HttpsError";
    }
  }
  return {
    HttpsError,
    group: {
      memberIds: ["student-1"],
      announcementAdminIds: ["group-admin"],
    } as { memberIds: string[]; announcementAdminIds: string[] },
    session: {
      accountKey: "account-a",
      meetingId: "987654321",
      eventStartMs: 1_000,
      eventEndMs: 61_000,
      status: "ready",
      activeSnapshot: "snapshot-1",
    } as Record<string, unknown>,
    config: { accountKey: "account-a", minPercent: 50, updatedAtMs: 1 },
    rows: [] as Array<Record<string, unknown>>,
    writes: [] as Array<{ ref: { kind: string; path: string }; data: Record<string, unknown> }>,
    groupRead: vi.fn(),
    sessionRead: vi.fn(),
    configRead: vi.fn(),
    eventsRead: vi.fn(),
    rowsRead: vi.fn(),
    transaction: vi.fn(),
    requireGroup: vi.fn(),
  };
});

function makeRef(kind: string, path: string, id = path.split("/").at(-1) ?? "") {
  return {
    kind,
    path,
    id,
    get: () => kind === "session" ? mocks.sessionRead() : mocks.groupRead(id),
    collection: (collectionName: string) => ({
      doc: (docId: string) => makeRef(collectionName, `${path}/${collectionName}/${docId}`, docId),
    }),
  };
}

vi.mock("firebase-functions/v2/https", () => ({
  HttpsError: mocks.HttpsError,
  onCall: (_options: unknown, handler: Function) => handler,
}));

vi.mock("firebase-admin/firestore", () => ({
  getFirestore: () => ({
    collection: (name: string) => ({
      doc: (id: string) => makeRef(name === "groups" ? "group" : "settings", `${name}/${id}`, id),
    }),
    runTransaction: mocks.transaction,
  }),
}));

vi.mock("../lib/shared.js", () => ({
  CALLABLE_OPTS: {},
  FUNCTIONS_SERVICE_ACCOUNT: "test-service-account",
  SUPER_ADMIN_EMAIL: "owner@example.test",
  ensureSuperAdmin: (request: { auth?: { token?: { email?: string } } }) => {
    if (request.auth?.token?.email !== "owner@example.test") {
      throw new mocks.HttpsError("permission-denied", "Only super-admin");
    }
  },
  isSuperAdmin: (request: { auth?: { token?: { email?: string } } }) =>
    request.auth?.token?.email === "owner@example.test",
}));

vi.mock("./accounts.js", () => ({ loadAccounts: vi.fn() }));
vi.mock("./client.js", () => ({ ZoomClient: class ZoomClient {} }));
vi.mock("./sync.js", () => ({ syncEvent: vi.fn() }));
vi.mock("./store.js", () => ({
  groupRef: (groupId: string) => makeRef("settings", `zoomAttendanceGroups/${groupId}`, groupId),
  sessionRef: (groupId: string, eventId: string) =>
    makeRef("session", `zoomAttendanceGroups/${groupId}/sessions/${eventId}`, eventId),
  readConfig: mocks.configRead,
  loadEvents: mocks.eventsRead,
  loadRows: mocks.rowsRead,
  sessionMatches: (session: Record<string, unknown> | undefined, eventValue: Record<string, unknown>, config: { accountKey: string }) =>
    !!session && session.accountKey === config.accountKey &&
      session.meetingId === eventValue.meetingId &&
      session.eventStartMs === eventValue.startAtMs &&
      session.eventEndMs === eventValue.endAtMs,
}));

import { matchZoomAttendanceParticipant } from "./callables.js";
import { nameAliasKey } from "./identity.js";

const event = {
  id: "event-1",
  title: "Урок",
  meetingId: "987654321",
  startAtMs: 1_000,
  endAtMs: 61_000,
};

function request(data: Record<string, unknown>, uid = "group-admin") {
  return { auth: { uid, token: { role: "admin" } }, data };
}

function invoke(data: Record<string, unknown>, uid = "group-admin") {
  return (matchZoomAttendanceParticipant as unknown as (value: unknown) => Promise<unknown>)(request(data, uid));
}

function row(key: string, name: string, aliasKey: string | null = null) {
  return {
    key,
    name,
    email: null,
    aliasKey,
    intervals: [{ startMs: 1_000, endMs: 31_000 }],
  };
}

describe("name alias callable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.writes = [];
    mocks.group.memberIds = ["student-1"];
    mocks.group.announcementAdminIds = ["group-admin"];
    mocks.session = {
      accountKey: "account-a",
      meetingId: event.meetingId,
      eventStartMs: event.startAtMs,
      eventEndMs: event.endAtMs,
      status: "ready",
      activeSnapshot: "snapshot-1",
    };
    mocks.configRead.mockResolvedValue({ ...mocks.config });
    mocks.eventsRead.mockResolvedValue([event]);
    mocks.rows = [row("guest-row", "Мария Соколова")];
    mocks.rowsRead.mockImplementation(async () => mocks.rows);
    mocks.sessionRead.mockImplementation(async () => ({ data: () => mocks.session }));
    mocks.groupRead.mockImplementation(async () => ({ exists: true, data: () => mocks.group }));
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
      const pending: typeof mocks.writes = [];
      const tx = {
        get: async (ref: { kind: string }) => ({
          data: () => ref.kind === "session" ? mocks.session
            : ref.kind === "group" ? mocks.group
              : mocks.config,
        }),
        set: (ref: { kind: string; path: string }, data: Record<string, unknown>) => pending.push({ ref, data }),
      };
      const result = await callback(tx);
      mocks.writes.push(...pending);
      return result;
    });
  });

  it("persists session mapping and name alias in the same transaction for an assigned admin", async () => {
    await expect(invoke({
      groupId: "group-1",
      eventId: event.id,
      participantKey: "guest-row",
      studentId: "student-1",
      remember: false,
      rememberName: true,
    })).resolves.toEqual({ success: true });

    const aliasKey = nameAliasKey("account-a", "Мария Соколова");
    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.writes).toHaveLength(2);
    expect(mocks.writes.map(({ ref }) => ref.path).sort()).toEqual([
      `zoomAttendanceGroups/group-1/aliases/${aliasKey}`,
      `zoomAttendanceGroups/group-1/sessions/${event.id}/overrides/guest-row`,
    ].sort());
    expect(mocks.writes.map(({ data }) => data)).toEqual([
      { studentId: "student-1", updatedAtMs: expect.any(Number), updatedBy: "group-admin" },
      { studentId: "student-1", updatedAtMs: expect.any(Number), updatedBy: "group-admin" },
    ]);
  });

  it("rejects writes outside the caller's assigned group", async () => {
    mocks.group.announcementAdminIds = [];
    await expect(invoke({
      groupId: "group-1",
      eventId: event.id,
      participantKey: "guest-row",
      studentId: "student-1",
      remember: false,
      rememberName: true,
    })).rejects.toMatchObject({ code: "permission-denied" });
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.writes).toEqual([]);
  });

  it("rechecks group membership in the transaction before writing either mapping", async () => {
    mocks.transaction.mockImplementationOnce(async (callback: (tx: unknown) => Promise<unknown>) => {
      const pending: typeof mocks.writes = [];
      const tx = {
        get: async (ref: { kind: string }) => ({
          data: () => ref.kind === "session" ? mocks.session
            : ref.kind === "group" ? { ...mocks.group, memberIds: [] }
              : mocks.config,
        }),
        set: (ref: { kind: string; path: string }, data: Record<string, unknown>) => pending.push({ ref, data }),
      };
      const result = await callback(tx);
      mocks.writes.push(...pending);
      return result;
    });
    await expect(invoke({
      groupId: "group-1",
      eventId: event.id,
      participantKey: "guest-row",
      studentId: "student-1",
      remember: false,
      rememberName: true,
    })).rejects.toMatchObject({ code: "invalid-argument" });
    expect(mocks.writes).toEqual([]);
  });

  it.each([
    ["generic", "iPhone", null],
    ["overlapping same-name rows", "Мария Соколова", "ambiguous"],
  ])("refuses to save a %s name alias", async (_label, name, issue) => {
    mocks.rows = issue === "ambiguous"
      ? [row("guest-row", name), { ...row("other-row", name), intervals: [{ startMs: 10_000, endMs: 40_000 }] }]
      : [row("guest-row", name)];
    await expect(invoke({
      groupId: "group-1",
      eventId: event.id,
      participantKey: "guest-row",
      studentId: "student-1",
      remember: false,
      rememberName: true,
    })).rejects.toMatchObject({ code: "failed-precondition" });
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.writes).toEqual([]);
  });

  it("does not create a name alias when rememberName is false", async () => {
    await expect(invoke({
      groupId: "group-1",
      eventId: event.id,
      participantKey: "guest-row",
      studentId: "student-1",
      remember: false,
    })).resolves.toEqual({ success: true });
    expect(mocks.writes).toHaveLength(1);
    expect(mocks.writes[0].ref.path).toBe(`zoomAttendanceGroups/group-1/sessions/${event.id}/overrides/guest-row`);
  });

  it.each([
    ["null optional mode", { remember: false, rememberName: null }],
    ["missing legacy remember flag", { rememberName: true }],
  ])("rejects %s instead of treating it as a valid name-alias request", async (_label, flags) => {
    await expect(invoke({
      groupId: "group-1",
      eventId: event.id,
      participantKey: "guest-row",
      studentId: "student-1",
      ...flags,
    })).rejects.toMatchObject({ code: "invalid-argument" });
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.writes).toEqual([]);
  });

  it("preserves the old stable-key remember contract and session-only guest mapping", async () => {
    mocks.rows = [row("stable-row", "Zoom Member", "stable-identity-key")];
    await expect(invoke({
      groupId: "group-1",
      eventId: event.id,
      participantKey: "stable-row",
      studentId: "student-1",
      remember: true,
    })).resolves.toEqual({ success: true });
    expect(mocks.writes.map(({ ref }) => ref.path)).toContain("zoomAttendanceGroups/group-1/aliases/stable-identity-key");

    mocks.writes = [];
    mocks.rows = [row("guest-row", "Мария Соколова")];
    await expect(invoke({
      groupId: "group-1",
      eventId: event.id,
      participantKey: "guest-row",
      studentId: "student-1",
      remember: false,
    })).resolves.toEqual({ success: true });
    expect(mocks.writes).toHaveLength(1);
    await expect(invoke({
      groupId: "group-1",
      eventId: event.id,
      participantKey: "guest-row",
      studentId: "student-1",
      remember: true,
    })).rejects.toMatchObject({ code: "invalid-argument" });
  });
});
