import { describe, expect, it } from "vitest";
import { nameAliasKey, nameAliasOptions, normalizeZoomName } from "./identity.js";
import { resolveAttendance } from "./logic.js";
import type { AttendanceEvent, AttendanceOverride, AttendanceRow } from "./model.js";
import type { ZoomAttendanceStudent } from "../../../shared/zoomAttendance/types.js";

const start = 1_000_000;
const event: AttendanceEvent = {
  id: "event",
  title: "Lesson",
  meetingId: "123456789",
  startAtMs: start,
  endAtMs: start + 60_000,
};

function row(
  key: string,
  name: string,
  from = 0,
  to = 30_000,
  aliasKey: string | null = null,
  email: string | null = null,
): AttendanceRow {
  return {
    key,
    name,
    email,
    aliasKey,
    intervals: [{ startMs: start + from, endMs: start + to }],
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
  accountKey = "account-a",
) {
  return resolveAttendance(rows, students, aliases, overrides, event, 50, accountKey);
}

describe("Zoom name aliases", () => {
  it("applies an admin-confirmed exact alias to old snapshot rows without changing their keys", () => {
    const rows = [
      row("old-snapshot-row-a", " Мария Соколова ", 0, 30_000),
      row("old-snapshot-row-b", "мария   соколова", 30_000, 60_000),
    ];
    const aliasKey = nameAliasKey("account-a", "Мария Соколова");
    expect(aliasKey).not.toBeNull();
    const result = resolve(
      rows,
      [student("student-a")],
      new Map([[aliasKey!, { studentId: "student-a" }]]),
    );
    expect(rows.map((item) => item.key)).toEqual(["old-snapshot-row-a", "old-snapshot-row-b"]);
    expect(result.participants.map((item) => [item.key, item.studentId, item.matchSource])).toEqual([
      ["old-snapshot-row-a", "student-a", "name"],
      ["old-snapshot-row-b", "student-a", "name"],
    ]);
    expect(result.attendance[0]).toMatchObject({ uid: "student-a", minutes: 1, percent: 100, present: true });
  });

  it("normalizes case and whitespace but does not fuzzy-match or transliterate", () => {
    expect(normalizeZoomName("  Анна\t  Смирнова  ")).toBe("анна смирнова");
    expect(nameAliasKey("account-a", "  Анна\tСмирнова ")).toBe(
      nameAliasKey("account-a", "анна смирнова"),
    );
    expect(nameAliasKey("account-a", "Anna Smirnova")).not.toBe(
      nameAliasKey("account-a", "Анна Смирнова"),
    );

    const rows = [row("exact", "анна смирнова"), row("near", "анна смирнов")];
    const aliasKey = nameAliasKey("account-a", "Анна Смирнова")!;
    const result = resolve(rows, [student("student-a")], new Map([[aliasKey, { studentId: "student-a" }]]));
    expect(result.participants.map((item) => item.studentId)).toEqual(["student-a", null]);
  });

  it("scopes aliases by Zoom account", () => {
    const rows = [row("guest", "Guest Name")];
    const keyA = nameAliasKey("account-a", "Guest Name")!;
    const keyB = nameAliasKey("account-b", "Guest Name")!;
    expect(keyA).not.toBe(keyB);
    const aliases = new Map([[keyA, { studentId: "student-a" }]]);
    expect(resolve(rows, [student("student-a")], aliases, new Map(), "account-a").participants[0].studentId)
      .toBe("student-a");
    expect(resolve(rows, [student("student-a")], aliases, new Map(), "account-b").participants[0].studentId)
      .toBeNull();
  });

  it("unions disjoint same-name guest rejoins, but declines overlapping rows", () => {
    const key = nameAliasKey("account-a", "Мария Соколова")!;
    const aliases = new Map([[key, { studentId: "student-a" }]]);
    const rejoins = [
      row("join-1", "Мария Соколова", 0, 20_000),
      row("join-2", "Мария Соколова", 20_000, 50_000),
    ];
    const combined = resolve(rejoins, [student("student-a")], aliases);
    expect(combined.participants.map((item) => item.studentId)).toEqual(["student-a", "student-a"]);
    expect(combined.attendance[0]).toMatchObject({ minutes: 0.8, percent: 83.3, present: true });

    const overlap = [
      row("device-a", "Мария Соколова", 0, 30_000),
      row("device-b", "мария соколова", 10_000, 40_000),
    ];
    expect(nameAliasOptions(overlap, "account-a").get("device-a"))
      .toMatchObject({ key: null, issue: "ambiguous" });
    expect(resolve(overlap, [student("student-a")], aliases).participants.map((item) => item.studentId))
      .toEqual([null, null]);
  });

  it("declines aliases when distinct stable Zoom identities share the name", () => {
    const rows = [
      row("zoom-id-a", "Same Name", 0, 20_000, "identity-a"),
      row("zoom-id-b", "same name", 20_000, 40_000, "identity-b"),
    ];
    expect(nameAliasOptions(rows, "account-a").get("zoom-id-a"))
      .toMatchObject({ key: null, issue: "ambiguous" });
    const nameKey = nameAliasKey("account-a", "Same Name")!;
    const result = resolve(rows, [student("student-a")], new Map([[nameKey, { studentId: "student-a" }]]));
    expect(result.participants.map((item) => item.studentId)).toEqual([null, null]);
  });

  it("rejects generic and numeric-only names", () => {
    for (const name of ["", "12345", "iPhone", "Zoom User", "Участник без имени", "Guest 2"]) {
      expect(nameAliasKey("account-a", name), name).toBeNull();
    }
  });

  it("keeps manual override/null, stable identity and verified email ahead of name aliases", () => {
    const rows = [
      row("manual", "Guest Name", 0, 10_000),
      row("manual-null", "Guest Name", 10_000, 20_000),
      row("profile", "Guest Name", 20_000, 30_000, "stable-profile"),
      row("email", "Guest Name", 30_000, 40_000, null, "verified@example.test"),
    ];
    const nameKey = nameAliasKey("account-a", "Guest Name")!;
    const aliases = new Map<string, AttendanceOverride>([
      [nameKey, { studentId: "student-by-name" }],
      ["stable-profile", { studentId: "student-by-profile" }],
    ]);
    const overrides = new Map<string, AttendanceOverride>([
      ["manual", { studentId: "student-manual" }],
      ["manual-null", { studentId: null }],
    ]);
    const result = resolve(rows, [
      student("student-manual"),
      student("student-by-name"),
      student("student-by-profile"),
      student("student-by-email", "verified@example.test"),
    ], aliases, overrides);
    expect(result.participants.map((item) => [item.studentId, item.matchSource])).toEqual([
      ["student-manual", "manual"],
      [null, null],
      ["student-by-profile", "saved"],
      ["student-by-email", "email"],
    ]);
  });

  it("does not let a name alias resolve a conflicting email or transfer to a departed student", () => {
    const conflictRow = row("email-conflict", "Same Name", 0, 20_000, null, "shared@example.test");
    const key = nameAliasKey("account-a", "Same Name")!;
    const conflict = resolve(
      [conflictRow],
      [student("member-a", "shared@example.test"), student("member-b", "SHARED@example.test")],
      new Map([[key, { studentId: "member-a" }]]),
    );
    expect(conflict.participants[0]).toMatchObject({ studentId: null, matchSource: null });
    expect(conflict.attendance.map((item) => item.minutes)).toEqual([0, 0]);

    const departed = resolve(
      [row("departed", "Same Name")],
      [student("current-member")],
      new Map([[key, { studentId: "former-member" }]]),
    );
    expect(departed.participants[0]).toMatchObject({ studentId: null, matchSource: null });
    expect(departed.attendance[0]).toMatchObject({ uid: "current-member", minutes: 0, present: false });
  });

  it("does not apply a name alias to a guest when verified email maps a same-name row elsewhere", () => {
    const rows = [
      row("email-row", "Мария Соколова", 0, 20_000, "email-identity", "verified@example.test"),
      row("guest-row", "мария соколова", 20_000, 40_000),
    ];
    const key = nameAliasKey("account-a", "Мария Соколова")!;
    const result = resolve(
      rows,
      [student("student-a"), student("student-b", "verified@example.test")],
      new Map([[key, { studentId: "student-a" }]]),
    );
    expect(result.participants.map(({ studentId, matchSource }) => [studentId, matchSource])).toEqual([
      ["student-b", "email"],
      [null, null],
    ]);
    expect(result.attendance.map(({ uid, minutes }) => [uid, minutes])).toEqual([
      ["student-a", 0],
      ["student-b", 0.3],
    ]);
  });
});
