import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  groupMembers: ["student-1"],
  groupAnnouncementAdmins: ["assigned-admin"],
  groupSnap: vi.fn(),
  getAll: vi.fn(),
  config: vi.fn(),
  events: vi.fn(),
  students: vi.fn(),
  accounts: vi.fn(),
  stored: vi.fn(),
  sessionGet: vi.fn(),
  loadRows: vi.fn(),
  sessionMatches: vi.fn(),
  groupSet: vi.fn(),
  sync: vi.fn(),
}));

vi.mock("firebase-functions/v2/https", () => ({
  HttpsError: class HttpsError extends Error {
    constructor(
      public code: string,
      message: string,
    ) {
      super(message);
      this.name = "HttpsError";
    }
  },
  onCall: (_options: unknown, handler: Function) => handler,
}));

vi.mock("firebase-admin/firestore", () => ({
  getFirestore: () => ({
    collection: (name: string) => ({
      doc: (id: string) => ({
        get: () => mocks.groupSnap(name, id),
      }),
    }),
    getAll: mocks.getAll,
  }),
}));

vi.mock("./store.js", () => ({
  groupRef: () => ({ set: mocks.groupSet }),
  sessionRef: () => ({ get: mocks.sessionGet }),
  readConfig: mocks.config,
  loadEvents: mocks.events,
  loadStudents: mocks.students,
  resolveStoredAttendance: mocks.stored,
  loadRows: mocks.loadRows,
  sessionMatches: mocks.sessionMatches,
}));

vi.mock("./accounts.js", () => ({ loadAccounts: mocks.accounts }));
vi.mock("./sync.js", () => ({ syncEvent: mocks.sync }));
vi.mock("./client.js", () => ({ ZoomClient: class ZoomClient {} }));

import {
  getMyZoomAttendance,
  getZoomAttendance,
  matchZoomAttendanceParticipant,
  setZoomAttendanceConnection,
} from "./callables.js";

const SUPER_EMAIL = "biboandbobo2@gmail.com";
const group = {
  memberIds: mocks.groupMembers,
  announcementAdminIds: mocks.groupAnnouncementAdmins,
};
const account = {
  key: "account-one",
  label: "Zoom 1",
  accountId: "a",
  clientId: "c",
  clientSecret: "s",
};
const event = {
  id: "event-1",
  title: "Семинар",
  meetingId: "987654321",
  startAtMs: 1_000,
  endAtMs: 3_601_000,
};
const readySession = {
  accountKey: "account-one",
  meetingId: event.meetingId,
  eventStartMs: event.startAtMs,
  eventEndMs: event.endAtMs,
  status: "ready",
  activeSnapshot: "snapshot-1",
};

function context(
  uid: string,
  claims: Record<string, unknown> = {},
  data: Record<string, unknown> = {},
) {
  return { auth: { uid, token: claims }, data };
}

function invoke(
  handler: unknown,
  request: ReturnType<typeof context> | { data?: Record<string, unknown> },
) {
  return (handler as (request: unknown) => Promise<unknown>)(request);
}

describe("zoom attendance callables", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.groupSnap.mockImplementation((name: string) =>
      name === "groups"
        ? { exists: true, data: () => group }
        : { exists: false, data: () => undefined },
    );
    mocks.getAll.mockResolvedValue([]);
    mocks.config.mockResolvedValue({
      accountKey: "account-one",
      minPercent: 50,
      updatedAtMs: 0,
    });
    mocks.events.mockResolvedValue([event]);
    mocks.students.mockResolvedValue([
      {
        uid: "student-1",
        displayName: "Student One",
        email: "one@example.test",
      },
    ]);
    mocks.accounts.mockResolvedValue([account]);
    mocks.stored.mockResolvedValue({
      participants: [],
      attendance: [
        {
          uid: "student-1",
          minutes: 37.2,
          percent: 62,
          present: true,
          email: "private@example.test",
        },
        {
          uid: "student-2",
          minutes: 10,
          percent: 16,
          present: false,
          email: "other@example.test",
        },
      ],
    });
    mocks.sessionGet.mockResolvedValue({ data: () => readySession });
    mocks.loadRows.mockResolvedValue([{ key: "guest", aliasKey: null }]);
    mocks.sessionMatches.mockImplementation(
      (
        session: unknown,
        candidate: unknown,
        config: { accountKey: string },
      ) => {
        const s = session as typeof readySession;
        const e = candidate as typeof event;
        return (
          !!s &&
          s.accountKey === config.accountKey &&
          s.meetingId === e.meetingId &&
          s.eventStartMs === e.startAtMs &&
          s.eventEndMs === e.endAtMs
        );
      },
    );
    mocks.groupSet.mockResolvedValue(undefined);
    mocks.sync.mockResolvedValue(true);
  });

  it("denies unauthenticated, student and foreign course-admin report access", async () => {
    await expect(
      invoke(getZoomAttendance, { data: { groupId: "g1" } }),
    ).rejects.toMatchObject({ code: "unauthenticated" });
    await expect(
      invoke(
        getZoomAttendance,
        context("student-1", { role: "student" }, { groupId: "g1" }),
      ),
    ).rejects.toMatchObject({ code: "permission-denied" });
    await expect(
      invoke(
        getZoomAttendance,
        context(
          "author",
          {
            role: "admin",
            editableCourses: ["development"],
          },
          { groupId: "g1" },
        ),
      ),
    ).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("returns a member's own attendance fields only", async () => {
    const result = await invoke(
      getMyZoomAttendance,
      context(
        "student-1",
        { role: "student" },
        {
          groupId: "g1",
          eventId: event.id,
        },
      ),
    );
    expect(result).toEqual({
      enabled: true,
      status: "ready",
      minutes: 37.2,
      percent: 62,
      present: true,
    });
    expect(JSON.stringify(result)).not.toContain("email");
    expect(JSON.stringify(result)).not.toContain("student-2");
    expect(mocks.stored).toHaveBeenCalledOnce();
  });

  it("requires super-admin to configure and enforces integer thresholds from 1 to 100", async () => {
    await expect(
      invoke(
        setZoomAttendanceConnection,
        context(
          "student-1",
          { role: "student" },
          {
            groupId: "g1",
            accountKey: null,
            minPercent: 50,
          },
        ),
      ),
    ).rejects.toMatchObject({ code: "permission-denied" });

    for (const minPercent of [0, 101, 50.5]) {
      await expect(
        invoke(
          setZoomAttendanceConnection,
          context(
            "owner",
            { email: SUPER_EMAIL },
            {
              groupId: "g1",
              accountKey: null,
              minPercent,
            },
          ),
        ),
      ).rejects.toMatchObject({ code: "invalid-argument" });
    }
    await expect(
      invoke(
        setZoomAttendanceConnection,
        context(
          "owner",
          { email: SUPER_EMAIL },
          {
            groupId: "g1",
            accountKey: "account-one",
            minPercent: 1,
          },
        ),
      ),
    ).resolves.toEqual({ success: true });
    await expect(
      invoke(
        setZoomAttendanceConnection,
        context(
          "owner",
          { email: SUPER_EMAIL },
          {
            groupId: "g1",
            accountKey: null,
            minPercent: 100,
          },
        ),
      ),
    ).resolves.toEqual({ success: true });
    expect(mocks.groupSet).toHaveBeenCalledTimes(2);
  });

  it("rejects slash-containing Firestore ids before querying documents", async () => {
    await expect(
      invoke(
        getZoomAttendance,
        context(
          "assigned-admin",
          { role: "admin" },
          {
            groupId: "g1/sessions/secret",
          },
        ),
      ),
    ).rejects.toMatchObject({ code: "invalid-argument" });
    expect(mocks.groupSnap).not.toHaveBeenCalled();
  });

  it("allows matching only current members and refuses to remember an unmatched guest", async () => {
    await expect(
      invoke(
        matchZoomAttendanceParticipant,
        context(
          "assigned-admin",
          { role: "admin" },
          {
            groupId: "g1",
            eventId: event.id,
            participantKey: "guest",
            studentId: "not-a-member",
            remember: false,
          },
        ),
      ),
    ).rejects.toMatchObject({ code: "invalid-argument" });

    await expect(
      invoke(
        matchZoomAttendanceParticipant,
        context(
          "assigned-admin",
          { role: "admin" },
          {
            groupId: "g1",
            eventId: event.id,
            participantKey: "guest",
            studentId: "student-1",
            remember: true,
          },
        ),
      ),
    ).rejects.toMatchObject({ code: "invalid-argument" });
    expect(mocks.groupSet).not.toHaveBeenCalled();
  });

  it("does not return stale saved attendance when event source identity changed", async () => {
    mocks.getAll.mockResolvedValue([
      {
        id: event.id,
        data: () => ({ ...readySession, meetingId: "different-zoom-meeting" }),
      },
    ]);
    const result = (await invoke(
      getZoomAttendance,
      context(
        "assigned-admin",
        { role: "admin" },
        {
          groupId: "g1",
          eventId: event.id,
        },
      ),
    )) as {
      events: Array<Record<string, unknown>>;
      attendance: unknown[];
      participants: unknown[];
    };
    expect(result.events[0]).toMatchObject({
      status: "pending",
      message: null,
      syncedAtMs: null,
    });
    expect(result.attendance).toEqual([]);
    expect(result.participants).toEqual([]);
    expect(mocks.stored).not.toHaveBeenCalled();
  });
});
