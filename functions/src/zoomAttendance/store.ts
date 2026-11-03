import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import type { DocumentData } from "firebase-admin/firestore";
import type { ZoomAttendanceStudent } from "../../../shared/zoomAttendance/types.js";
import type {
  AttendanceConfig,
  AttendanceEvent,
  AttendanceGroup,
  AttendanceRow,
  AttendanceSession,
  AttendanceOverride,
} from "./model.js";
import { DAY, extractMeetingId, resolveAttendance } from "./logic.js";

export const groupRef = (groupId: string) =>
  getFirestore().collection("zoomAttendanceGroups").doc(groupId);
export const sessionRef = (groupId: string, eventId: string) =>
  groupRef(groupId).collection("sessions").doc(eventId);

export async function readConfig(groupId: string): Promise<AttendanceConfig> {
  const snap = await groupRef(groupId).get();
  return snap.exists
    ? (snap.data() as AttendanceConfig)
    : { accountKey: null, minPercent: 50, updatedAtMs: 0 };
}

function timeMs(raw: unknown): number {
  return raw &&
    typeof raw === "object" &&
    "toMillis" in raw &&
    typeof raw.toMillis === "function"
    ? raw.toMillis()
    : NaN;
}

export function parseEvent(
  id: string,
  data: DocumentData,
): AttendanceEvent | null {
  const meetingId = extractMeetingId(data.zoomLink);
  const startAtMs = timeMs(data.startAt);
  const endAtMs = timeMs(data.endAt);
  if (
    data.kind !== "event" ||
    data.isAllDay ||
    !meetingId ||
    !Number.isFinite(startAtMs) ||
    !Number.isFinite(endAtMs) ||
    endAtMs <= startAtMs ||
    endAtMs - startAtMs > DAY
  )
    return null;
  return {
    id,
    title: String(data.text ?? "").slice(0, 500),
    meetingId,
    startAtMs,
    endAtMs,
  };
}

/** No composite index; bound reads by the indexed startAt range. */
export async function loadEvents(
  groupId: string,
  now = Date.now(),
): Promise<AttendanceEvent[]> {
  const snap = await getFirestore()
    .collection("groups")
    .doc(groupId)
    .collection("events")
    .where("startAt", ">=", new Date(now - 30 * DAY))
    .where("startAt", "<=", new Date(now))
    .orderBy("startAt", "desc")
    .limit(200)
    .get();
  return snap.docs
    .map((d) => parseEvent(d.id, d.data()))
    .filter((e): e is AttendanceEvent => !!e && e.endAtMs <= now)
    .slice(0, 60);
}

export function sessionMatches(
  session: AttendanceSession | undefined,
  event: AttendanceEvent,
  config: AttendanceConfig,
): boolean {
  return (
    !!session &&
    session.accountKey === config.accountKey &&
    session.meetingId === event.meetingId &&
    session.eventStartMs === event.startAtMs &&
    session.eventEndMs === event.endAtMs
  );
}

export async function loadStudents(
  group: AttendanceGroup,
): Promise<ZoomAttendanceStudent[]> {
  const ids = [...new Set(group.memberIds ?? [])].filter(
    (id) => !id.startsWith("pending_"),
  );
  if (ids.length > 2000)
    throw new Error("В группе слишком много участников для одного отчёта.");
  const students: ZoomAttendanceStudent[] = [];
  for (let i = 0; i < ids.length; i += 100) {
    const result = await getAuth().getUsers(
      ids.slice(i, i + 100).map((uid) => ({ uid })),
    );
    students.push(
      ...result.users
        .filter((u) => !u.disabled)
        .map((u) => ({
          uid: u.uid,
          displayName: u.displayName || u.email || "Студент",
          // Firestore profiles are owner-editable; only verified Auth emails can auto-match.
          email: u.emailVerified ? (u.email ?? "") : "",
        })),
    );
  }
  return students.sort((a, b) =>
    a.displayName.localeCompare(b.displayName, "ru"),
  );
}

export async function loadRows(
  groupId: string,
  eventId: string,
  session: AttendanceSession,
): Promise<AttendanceRow[]> {
  if (!session.activeSnapshot) return [];
  const snap = await sessionRef(groupId, eventId)
    .collection("snapshots")
    .doc(session.activeSnapshot)
    .collection("participants")
    .get();
  return snap.docs.map((doc) => doc.data() as AttendanceRow);
}

export async function resolveStoredAttendance(
  groupId: string,
  event: AttendanceEvent,
  session: AttendanceSession,
  students: ZoomAttendanceStudent[],
  minPercent: number,
) {
  const rows = await loadRows(groupId, event.id, session);
  const [aliasSnap, overrideSnap] = await Promise.all([
    groupRef(groupId).collection("aliases").get(),
    sessionRef(groupId, event.id).collection("overrides").get(),
  ]);
  const aliases = new Map(
    aliasSnap.docs.map((d) => [d.id, d.data() as AttendanceOverride]),
  );
  const overrides = new Map(
    overrideSnap.docs.map((d) => [d.id, d.data() as AttendanceOverride]),
  );
  return resolveAttendance(
    rows,
    students,
    aliases,
    overrides,
    event,
    minPercent,
  );
}
