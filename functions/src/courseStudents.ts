/**
 * Студенты курса для его администратора.
 *
 * Коллекция `users` в rules закрыта для админа курса (владелец/super-admin/
 * со-админ), поэтому список своих студентов он получает только через эту
 * callable. Ответ намеренно узкий: ни телефонов, ни ключей, ни prefs.
 *
 * Контракт (клиент типизирует по нему же):
 * ```
 * getCourseStudents({ courseId })
 *   → { courseId, groups: [{ id, name, students: CourseStudent[] }], individual: CourseStudent[] }
 * CourseStudent = { uid, displayName, email, photoURL, lastLoginAt (ISO|null),
 *                   pendingRegistration, disabled }
 * ```
 * Право вызова: super-admin, со-админ (claim `coAdmin`) или admin, у которого
 * `courseId` есть в claim `editableCourses`.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { CALLABLE_OPTS, ensureCanEditCourse } from "./lib/shared.js";
import { isEveryoneGroup } from "../../shared/groups/everyoneGroup.js";

/** courseId — slug курса; точки/слеши сломали бы путь `courseAccess.<id>`. */
const COURSE_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

/** Firestore getAll не любит слишком длинные пачки — читаем по 100 uid. */
const USER_BATCH_SIZE = 100;

export interface CourseStudent {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  /** ISO-строка последнего входа; у pending-приглашений всегда null. */
  lastLoginAt: string | null;
  pendingRegistration: boolean;
  disabled: boolean;
}

export interface CourseStudentsResponse {
  courseId: string;
  /** Потоки, которым открыт курс (без системных и `everyone`). */
  groups: Array<{ id: string; name: string; students: CourseStudent[] }>;
  /** Доступ выдан лично и ни в одном из потоков выше человек не состоит. */
  individual: CourseStudent[];
}

function toIsoString(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const maybeTimestamp = value as { toDate?: () => Date };
  if (typeof maybeTimestamp.toDate === "function") {
    return maybeTimestamp.toDate().toISOString();
  }
  return typeof value === "string" ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function toCourseStudent(uid: string, data: Record<string, unknown>): CourseStudent {
  return {
    uid,
    displayName: asString(data.displayName),
    email: asString(data.email),
    photoURL: asString(data.photoURL),
    lastLoginAt: toIsoString(data.lastLoginAt),
    pendingRegistration: data.pendingRegistration === true,
    disabled: data.disabled === true,
  };
}

/** По имени (ru), безымянные — в конец, внутри них по email. */
function compareStudents(a: CourseStudent, b: CourseStudent): number {
  const aName = a.displayName?.trim() ?? "";
  const bName = b.displayName?.trim() ?? "";
  if (aName && bName) return aName.localeCompare(bName, "ru");
  if (aName) return -1;
  if (bName) return 1;
  return (a.email ?? "").localeCompare(b.email ?? "", "ru");
}

function normalizeMemberIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return Array.from(
    new Set(raw.filter((id): id is string => typeof id === "string" && id.trim().length > 0))
  );
}

async function fetchUserDocs(
  db: FirebaseFirestore.Firestore,
  uids: string[]
): Promise<Map<string, Record<string, unknown>>> {
  const result = new Map<string, Record<string, unknown>>();
  for (let i = 0; i < uids.length; i += USER_BATCH_SIZE) {
    const chunk = uids.slice(i, i + USER_BATCH_SIZE);
    const snaps = await db.getAll(...chunk.map((uid) => db.collection("users").doc(uid)));
    for (const snap of snaps) {
      if (snap.exists) {
        result.set(snap.id, (snap.data() ?? {}) as Record<string, unknown>);
      }
    }
  }
  return result;
}

export const getCourseStudents = onCall(CALLABLE_OPTS, async (request) => {
  const rawCourseId = (request.data as { courseId?: unknown } | undefined)?.courseId;
  const courseId = typeof rawCourseId === "string" ? rawCourseId.trim() : "";
  if (!courseId) {
    throw new HttpsError("invalid-argument", "courseId обязателен и должен быть непустой строкой");
  }
  if (!COURSE_ID_PATTERN.test(courseId)) {
    throw new HttpsError("invalid-argument", `Недопустимый courseId: ${courseId}`);
  }

  ensureCanEditCourse(request, courseId);

  const db = getFirestore();

  const groupsSnap = await db
    .collection("groups")
    .where("grantedCourses", "array-contains", courseId)
    .get();

  const groupDocs = groupsSnap.docs
    .filter(
      (doc) => !isEveryoneGroup(doc.id) && (doc.data() as Record<string, unknown>).isSystem !== true
    )
    .map((doc) => {
      const data = (doc.data() ?? {}) as Record<string, unknown>;
      return {
        id: doc.id,
        name: asString(data.name) ?? doc.id,
        memberIds: normalizeMemberIds(data.memberIds),
      };
    });

  const memberUids = Array.from(new Set(groupDocs.flatMap((group) => group.memberIds)));
  const memberDocs = await fetchUserDocs(db, memberUids);

  const groups = groupDocs
    .map((group) => ({
      id: group.id,
      name: group.name,
      students: group.memberIds
        .map((uid) => {
          const data = memberDocs.get(uid);
          return data ? toCourseStudent(uid, data) : null;
        })
        .filter((student): student is CourseStudent => student !== null)
        .sort(compareStudents),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));

  const inGroups = new Set(memberUids);
  const individualSnap = await db
    .collection("users")
    .where(`courseAccess.${courseId}`, "==", true)
    .get();

  const individual = individualSnap.docs
    .filter((doc) => !inGroups.has(doc.id))
    .map((doc) => toCourseStudent(doc.id, (doc.data() ?? {}) as Record<string, unknown>))
    .sort(compareStudents);

  const response: CourseStudentsResponse = { courseId, groups, individual };
  return response;
});
