import { createHash } from "node:crypto";
import type {
  ZoomAttendanceParticipant,
  ZoomAttendanceStudent,
  ZoomStudentAttendance,
} from "../../../shared/zoomAttendance/types.js";
import type { ZoomReportParticipant } from "./client.js";
import type {
  AttendanceEvent,
  AttendanceInterval,
  AttendanceOverride,
  AttendanceRow,
} from "./model.js";

export const MINUTE = 60_000;
export const DAY = 24 * 60 * MINUTE;

export function hashKey(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function extractMeetingId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !/(^|\.)zoom\.us$/.test(url.hostname))
      return null;
    return (
      url.pathname.match(/^\/(?:j|wc|my)\/(\d{9,11})(?:\/|$)/)?.[1] ?? null
    );
  } catch {
    return null;
  }
}

/** Time within the scheduled lesson; overlapping devices/rejoins count once. */
export function unionSeconds(intervals: AttendanceInterval[]): number {
  const sorted = intervals
    .filter((i) => i.endMs > i.startMs)
    .sort((a, b) => a.startMs - b.startMs);
  let end = -Infinity;
  let total = 0;
  for (const interval of sorted) {
    total += Math.max(0, interval.endMs - Math.max(end, interval.startMs));
    end = Math.max(end, interval.endMs);
  }
  return total / 1000;
}

export function buildRows(
  reports: Array<{ uuid: string; participants: ZoomReportParticipant[] }>,
  accountKey: string,
  event: AttendanceEvent,
): AttendanceRow[] {
  const rows = new Map<string, AttendanceRow>();
  for (const report of reports) {
    report.participants.forEach((p, index) => {
      if (p.status === "in_waiting_room") return;
      const email = p.user_email?.trim().toLowerCase() || null;
      // user_id is connection-scoped; only id/participant_user_id identify a Zoom user.
      const zoomId = p.participant_user_id || p.id;
      const identity = zoomId
        ? `user:${zoomId}`
        : email
          ? `email:${email}`
          : null;
      const key = hashKey(
        `${accountKey}:${identity ?? `${report.uuid}:${p.user_id ?? ""}:${p.join_time}:${index}`}`,
      );
      const join = Date.parse(p.join_time ?? "");
      const leave = Date.parse(p.leave_time ?? "");
      if (!Number.isFinite(join) || !Number.isFinite(leave) || leave <= join) {
        throw new Error(
          "Отчёт Zoom ещё не содержит корректное время подключений.",
        );
      }
      const startMs = Math.max(join, event.startAtMs);
      const endMs = Math.min(leave, event.endAtMs);
      if (endMs <= startMs) return;
      const row = rows.get(key) ?? {
        key,
        name: (p.name || "Участник без имени").slice(0, 300),
        email,
        aliasKey: identity ? hashKey(`${accountKey}:${identity}`) : null,
        intervals: [],
      };
      row.intervals.push({ startMs, endMs });
      rows.set(key, row);
    });
  }
  return [...rows.values()];
}

export function resolveAttendance(
  rows: AttendanceRow[],
  students: ZoomAttendanceStudent[],
  aliases: Map<string, AttendanceOverride>,
  overrides: Map<string, AttendanceOverride>,
  event: AttendanceEvent,
  minPercent: number,
): {
  participants: ZoomAttendanceParticipant[];
  attendance: ZoomStudentAttendance[];
} {
  const memberIds = new Set(students.map((s) => s.uid));
  const byEmail = new Map<string, string[]>();
  for (const student of students) {
    const email = student.email.trim().toLowerCase();
    if (email) byEmail.set(email, [...(byEmail.get(email) ?? []), student.uid]);
  }
  const intervalsByStudent = new Map<string, AttendanceInterval[]>();
  const participants = rows.map((row): ZoomAttendanceParticipant => {
    const manual = overrides.get(row.key);
    const saved = row.aliasKey ? aliases.get(row.aliasKey) : undefined;
    const emails = row.email ? (byEmail.get(row.email) ?? []) : [];
    // Explicit unbinding blocks both a remembered match and email auto-matching.
    const match =
      manual !== undefined
        ? { uid: manual.studentId, source: "manual" as const }
        : saved !== undefined
          ? { uid: saved.studentId, source: "saved" as const }
          : {
              uid: emails.length === 1 ? emails[0] : null,
              source: "email" as const,
            };
    const studentId = match.uid && memberIds.has(match.uid) ? match.uid : null;
    if (studentId)
      intervalsByStudent.set(studentId, [
        ...(intervalsByStudent.get(studentId) ?? []),
        ...row.intervals,
      ]);
    return {
      key: row.key,
      name: row.name,
      email: row.email,
      minutes: Math.round(unionSeconds(row.intervals) / 6) / 10,
      studentId,
      matchSource: studentId ? match.source : null,
      canRemember: !!row.aliasKey,
    };
  });
  const duration = (event.endAtMs - event.startAtMs) / 1000;
  const attendance = students.map((student): ZoomStudentAttendance => {
    const seconds = unionSeconds(intervalsByStudent.get(student.uid) ?? []);
    const exactPercent =
      duration > 0 ? Math.min(100, (seconds / duration) * 100) : 0;
    return {
      uid: student.uid,
      minutes: Math.round(seconds / 6) / 10,
      percent: Math.round(exactPercent * 10) / 10,
      present: exactPercent >= minPercent,
    };
  });
  return { participants, attendance };
}

/** UUIDs are selected by occurrence start; an ambiguous calendar needs correction. */
export function selectInstances(
  instances: Array<{ uuid: string; start_time: string }>,
  event: AttendanceEvent,
  siblings: AttendanceEvent[],
): Array<{ uuid: string; start_time: string }> {
  return instances.filter((instance) => {
    const start = Date.parse(instance.start_time);
    if (
      start < event.startAtMs - 30 * MINUTE ||
      start >= event.endAtMs ||
      !Number.isFinite(start)
    )
      return false;
    const owners = siblings.filter(
      (e) =>
        e.meetingId === event.meetingId &&
        start >= e.startAtMs - 30 * MINUTE &&
        start < e.endAtMs,
    );
    if (owners.length > 1)
      throw new Error(
        "Несколько занятий группы подходят к одной сессии Zoom. Уточните время в календаре.",
      );
    return true;
  });
}
