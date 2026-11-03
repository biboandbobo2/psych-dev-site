import { describe, expect, it } from "vitest";
import {
  buildRows,
  extractMeetingId,
  resolveAttendance,
  selectInstances,
  unionSeconds,
} from "./logic.js";
import type {
  AttendanceEvent,
  AttendanceOverride,
  AttendanceRow,
} from "./model.js";
import type { ZoomReportParticipant } from "./client.js";
import type { ZoomAttendanceStudent } from "../../../shared/zoomAttendance/types.js";

const startAtMs = Date.parse("2026-10-20T10:00:00.000Z");
const event: AttendanceEvent = {
  id: "event-1",
  title: "Семинар",
  meetingId: "987654321",
  startAtMs,
  endAtMs: startAtMs + 60 * 60_000,
};

function participant(
  overrides: Partial<ZoomReportParticipant> = {},
): ZoomReportParticipant {
  return {
    id: "zoom-user-1",
    name: "Студент",
    join_time: new Date(startAtMs).toISOString(),
    leave_time: new Date(startAtMs + 60_000).toISOString(),
    ...overrides,
  };
}

function row(
  key: string,
  overrides: Partial<AttendanceRow> = {},
): AttendanceRow {
  return {
    key,
    name: key,
    email: null,
    aliasKey: null,
    intervals: [],
    ...overrides,
  };
}

function student(uid: string, email = ""): ZoomAttendanceStudent {
  return { uid, displayName: uid, email };
}

function resolve(
  rows: AttendanceRow[],
  students: ZoomAttendanceStudent[],
  aliases: Map<string, AttendanceOverride> = new Map(),
  overrides: Map<string, AttendanceOverride> = new Map(),
  scheduled = event,
  minPercent = 50,
) {
  return resolveAttendance(
    rows,
    students,
    aliases,
    overrides,
    scheduled,
    minPercent,
  );
}

describe("zoomAttendance logic", () => {
  it("does not count waiting-room time as attendance", () => {
    const rows = buildRows(
      [
        {
          uuid: "u",
          participants: [participant({ status: "in_waiting_room" })],
        },
      ],
      "account",
      event,
    );
    expect(rows).toEqual([]);
  });
  it("accepts Zoom meeting URL forms and rejects lookalike hosts and invalid paths", () => {
    expect(extractMeetingId("https://zoom.us/j/12345678901?pwd=private")).toBe(
      "12345678901",
    );
    expect(extractMeetingId("https://us02web.zoom.us/wc/123456789/join")).toBe(
      "123456789",
    );
    expect(extractMeetingId("https://zoom.us.evil/j/123456789")).toBeNull();
    expect(
      extractMeetingId("https://evil.zoom.us.evil/j/123456789"),
    ).toBeNull();
    expect(extractMeetingId("https://zoom.us/join/123456789")).toBeNull();
    expect(
      extractMeetingId("https://zoom.us/j/123456789/../../evil"),
    ).toBeNull();
    expect(extractMeetingId("https://zoom.us/j/123456789%2Fevil")).toBeNull();
    expect(extractMeetingId("http://zoom.us/j/123456789")).toBeNull();
  });

  it("unions overlapping device sessions and separate rejoins for one Zoom identity", () => {
    const seconds = unionSeconds([
      { startMs: 0, endMs: 60_000 },
      { startMs: 30_000, endMs: 70_000 },
      { startMs: 90_000, endMs: 120_000 },
    ]);
    expect(seconds).toBe(100);

    const reports = [
      {
        uuid: "occurrence-1",
        participants: [
          participant({
            join_time: new Date(startAtMs).toISOString(),
            leave_time: new Date(startAtMs + 60_000).toISOString(),
          }),
          participant({
            id: "device-2",
            participant_user_id: "zoom-user-1",
            join_time: new Date(startAtMs + 30_000).toISOString(),
            leave_time: new Date(startAtMs + 70_000).toISOString(),
          }),
          participant({
            join_time: new Date(startAtMs + 90_000).toISOString(),
            leave_time: new Date(startAtMs + 120_000).toISOString(),
          }),
        ],
      },
    ];
    const rows = buildRows(reports, "account", event);
    expect(rows).toHaveLength(1);
    expect(unionSeconds(rows[0].intervals)).toBe(100);
  });

  it("clips participant intervals to the scheduled lesson window", () => {
    const rows = buildRows(
      [
        {
          uuid: "occurrence-1",
          participants: [
            participant({
              join_time: new Date(startAtMs - 10_000).toISOString(),
              leave_time: new Date(startAtMs + 70_000).toISOString(),
            }),
          ],
        },
      ],
      "account",
      { ...event, endAtMs: startAtMs + 60_000 },
    );
    expect(unionSeconds(rows[0].intervals)).toBe(60);
  });

  it("keeps rows separate without a stable Zoom identity, even for the same name", () => {
    const rows = buildRows(
      [
        {
          uuid: "occurrence-1",
          participants: [
            participant({
              id: undefined,
              participant_user_id: undefined,
              user_id: "connection-1",
              name: "Гость",
            }),
            participant({
              id: undefined,
              participant_user_id: undefined,
              user_id: "connection-2",
              name: "Гость",
            }),
          ],
        },
      ],
      "account",
      event,
    );
    expect(rows).toHaveLength(2);
    expect(rows.map((item) => item.name)).toEqual(["Гость", "Гость"]);
    expect(rows[0].key).not.toBe(rows[1].key);
    expect(rows.every((item) => item.aliasKey === null)).toBe(true);
  });

  it("does not match by name and auto-matches email only when unique in the group", () => {
    const rows = [
      row("name-only", { name: "Alice" }),
      row("unique-email", { email: "alice@example.test" }),
      row("ambiguous-email", { email: "shared@example.test" }),
    ];
    const result = resolve(rows, [
      student("alice", "alice@example.test"),
      student("shared-1", "shared@example.test"),
      student("shared-2", "SHARED@example.test"),
    ]);
    expect(
      result.participants.map(({ studentId, matchSource }) => [
        studentId,
        matchSource,
      ]),
    ).toEqual([
      [null, null],
      ["alice", "email"],
      [null, null],
    ]);
  });

  it("manual null unbinding blocks saved alias and email auto-matching", () => {
    const item = row("participant-key", {
      email: "alice@example.test",
      aliasKey: "zoom-alias",
      intervals: [{ startMs: startAtMs, endMs: startAtMs + 30_000 }],
    });
    const result = resolve(
      [item],
      [student("alice", "alice@example.test")],
      new Map([["zoom-alias", { studentId: "alice" }]]),
      new Map([["participant-key", { studentId: null }]]),
    );
    expect(result.participants[0]).toMatchObject({
      studentId: null,
      matchSource: null,
    });
    expect(result.attendance[0]).toMatchObject({
      uid: "alice",
      minutes: 0,
      present: false,
    });
  });

  it("does not transfer a saved match's minutes when the matched student left the group", () => {
    const item = row("key", {
      email: "new-student@example.test",
      aliasKey: "saved-zoom-user",
      intervals: [{ startMs: startAtMs, endMs: startAtMs + 45 * 60_000 }],
    });
    const result = resolve(
      [item],
      [student("current-student", "new-student@example.test")],
      new Map([["saved-zoom-user", { studentId: "departed-student" }]]),
    );
    expect(result.participants[0]).toMatchObject({
      studentId: null,
      matchSource: null,
    });
    expect(result.attendance[0]).toMatchObject({
      uid: "current-student",
      minutes: 0,
      percent: 0,
      present: false,
    });
  });

  it("unions multiple participant rows for one student and checks the unrounded threshold", () => {
    const scheduled = { ...event, endAtMs: startAtMs + 100_000 };
    const rows = [
      row("first-device", {
        intervals: [{ startMs: startAtMs, endMs: startAtMs + 30_000 }],
      }),
      row("second-device", {
        intervals: [{ startMs: startAtMs + 20_000, endMs: startAtMs + 49_999 }],
      }),
    ];
    const result = resolve(
      rows,
      [student("alice")],
      new Map(),
      new Map([
        ["first-device", { studentId: "alice" }],
        ["second-device", { studentId: "alice" }],
      ]),
      scheduled,
      50,
    );
    expect(result.attendance[0].minutes).toBe(0.8);
    expect(result.attendance[0].percent).toBe(50);
    expect(result.attendance[0].present).toBe(false);
  });

  it("rejects ambiguous recurring meeting instances that overlap sibling events", () => {
    const first = { ...event, startAtMs, endAtMs: startAtMs + 60 * 60_000 };
    const second = {
      ...event,
      id: "event-2",
      startAtMs: startAtMs + 15 * 60_000,
      endAtMs: startAtMs + 75 * 60_000,
    };
    const instances = [
      {
        uuid: "instance-uuid",
        start_time: new Date(startAtMs + 20 * 60_000).toISOString(),
      },
    ];
    expect(() => selectInstances(instances, first, [first, second])).toThrow(
      /Несколько занятий группы/,
    );
  });
});
