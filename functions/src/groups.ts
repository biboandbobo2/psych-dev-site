import { onCall, HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import * as fnLogger from "firebase-functions/logger";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { CORE_COURSE_IDS, SUPER_ADMIN_EMAIL, toPendingUid } from "./lib/shared.js";
import { isEveryoneGroup } from "../../shared/groups/everyoneGroup.js";

// Клиент вызывает getFunctions(app) без региона → us-central1 обязателен.
// cpu/memory явно: у gen2 другие дефолты (cpu до 1 vCPU и т.п.), не выкручиваем ресурсы.
const CALLABLE_OPTS = { region: "us-central1", cpu: 1, memory: "256MiB" } as const;

const db = getFirestore();

const MAX_FEATURED_COURSES = 3;

function assertSuperAdmin(request: Pick<CallableRequest, "auth">): string {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Требуется авторизация");
  }
  if (request.auth.token.email !== SUPER_ADMIN_EMAIL) {
    throw new HttpsError(
      "permission-denied",
      "Только super-admin может управлять группами"
    );
  }
  return request.auth.uid;
}

/**
 * Каллер либо super-admin, либо обычный admin, либо явный announcement-admin
 * указанной группы. Используется в setGroupFeaturedCourses.
 */
async function assertCanManageGroup(
  request: Pick<CallableRequest, "auth">,
  groupId: string
): Promise<string> {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Требуется авторизация");
  }
  const callerUid = request.auth.uid;
  const callerEmail = request.auth.token.email;
  if (callerEmail === SUPER_ADMIN_EMAIL) return callerUid;

  const role = (request.auth.token as { role?: string } | undefined)?.role;
  if (role === "super-admin") return callerUid;

  const groupSnap = await db.collection("groups").doc(groupId).get();
  if (!groupSnap.exists) {
    throw new HttpsError("not-found", "Group not found");
  }
  const data = groupSnap.data() as Record<string, unknown> | undefined;
  const announcementAdminIds = Array.isArray(data?.announcementAdminIds)
    ? (data!.announcementAdminIds as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  if (role === "admin" && announcementAdminIds.includes(callerUid)) {
    return callerUid;
  }
  throw new HttpsError(
    "permission-denied",
    "Только super-admin или админ этой группы может менять актуальные курсы"
  );
}

/**
 * Проверяет что все courseIds существуют. Core-курсы (development/clinical/
 * general) считаются всегда существующими — их метаданные жёстко в
 * src/constants/courses.ts, документ в `courses/{id}` опционален. Через
 * Firestore проверяются только динамические курсы.
 */
async function assertCoursesExist(courseIds: string[]): Promise<void> {
  if (courseIds.length === 0) return;
  const coreSet = new Set<string>(CORE_COURSE_IDS);
  const dynamicIds = courseIds.filter((id) => !coreSet.has(id));
  if (dynamicIds.length === 0) return;
  const refs = dynamicIds.map((id) => db.collection("courses").doc(id));
  const snaps = await db.getAll(...refs);
  const missing = snaps
    .map((snap, idx) => (snap.exists ? null : dynamicIds[idx]))
    .filter((id): id is string => id !== null);
  if (missing.length > 0) {
    throw new HttpsError(
      "invalid-argument",
      `Курсы не найдены: ${missing.join(", ")}`
    );
  }
}

function normalizeFeaturedCourseIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    throw new HttpsError(
      "invalid-argument",
      "courseIds must be an array"
    );
  }
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  if (result.length > MAX_FEATURED_COURSES) {
    throw new HttpsError(
      "invalid-argument",
      `Можно выбрать не более ${MAX_FEATURED_COURSES} актуальных курсов`
    );
  }
  return result;
}

function normalizeStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return Array.from(
    new Set(raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0))
  );
}

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpsError("invalid-argument", `${field} is required and must be a non-empty string`);
  }
  return value.trim();
}

export const createGroup = onCall(CALLABLE_OPTS, async (request) => {
  const data = request.data;
  const uid = assertSuperAdmin(request);
  const d = (data ?? {}) as Record<string, unknown>;
  const name = requireNonEmptyString(d.name, "name");
  const description = typeof d.description === "string" ? d.description.trim() : "";

  const payload: Record<string, unknown> = {
    name,
    memberIds: normalizeStringArray(d.memberIds),
    grantedCourses: normalizeStringArray(d.grantedCourses),
    announcementAdminIds: normalizeStringArray(d.announcementAdminIds),
    createdAt: FieldValue.serverTimestamp(),
    createdBy: uid,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: uid,
  };
  if (description) payload.description = description;

  const ref = await db.collection("groups").add(payload);
  fnLogger.info("✅ Group created", { groupId: ref.id, name, by: uid });
  return { success: true, groupId: ref.id };
});

export const updateGroup = onCall(CALLABLE_OPTS, async (request) => {
  const data = request.data;
  const uid = assertSuperAdmin(request);
  const d = (data ?? {}) as Record<string, unknown>;
  const groupId = requireNonEmptyString(d.groupId, "groupId");

  const updates: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: uid,
  };
  if (typeof d.name === "string") {
    const name = d.name.trim();
    if (!name) {
      throw new HttpsError("invalid-argument", "name cannot be empty");
    }
    if (isEveryoneGroup(groupId)) {
      throw new HttpsError(
        "failed-precondition",
        "Системную группу нельзя переименовывать"
      );
    }
    updates.name = name;
  }
  if (typeof d.description === "string") {
    const desc = d.description.trim();
    if (desc) updates.description = desc;
    else updates.description = FieldValue.delete();
  }
  if (Array.isArray(d.grantedCourses)) {
    updates.grantedCourses = normalizeStringArray(d.grantedCourses);
  }
  if (Array.isArray(d.announcementAdminIds)) {
    updates.announcementAdminIds = normalizeStringArray(d.announcementAdminIds);
  }

  await db.collection("groups").doc(groupId).update(updates);
  fnLogger.info("✅ Group updated", { groupId, by: uid });
  return { success: true };
});

export const setGroupMembers = onCall(CALLABLE_OPTS, async (request) => {
  const data = request.data;
  const uid = assertSuperAdmin(request);
  const d = (data ?? {}) as Record<string, unknown>;
  const groupId = requireNonEmptyString(d.groupId, "groupId");
  const memberIds = normalizeStringArray(d.memberIds);

  if (isEveryoneGroup(groupId)) {
    throw new HttpsError(
      "failed-precondition",
      "Состав системной группы управляется автоматически"
    );
  }

  await db.collection("groups").doc(groupId).update({
    memberIds,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: uid,
  });
  fnLogger.info("✅ Group members updated", { groupId, count: memberIds.length, by: uid });
  return { success: true, count: memberIds.length };
});

/**
 * Добавить участников в группу по списку email. Резолвит email через Auth:
 * существующих юзеров — по реальному uid, несуществующих — по
 * pendingUid (тот же формат, что и у bulkEnrollStudents/onUserCreate).
 * Реальный uid заменит pendingUid автоматически при регистрации (см. onUserCreate).
 */
export const addGroupMembersByEmail = onCall(CALLABLE_OPTS, async (request) => {
  const data = request.data;
  const callerUid = assertSuperAdmin(request);
  const d = (data ?? {}) as Record<string, unknown>;
  const groupId = requireNonEmptyString(d.groupId, "groupId");
  const emails = Array.isArray(d.emails)
    ? Array.from(
        new Set(
          (d.emails as unknown[])
            .filter((x): x is string => typeof x === "string")
            .map((e) => e.trim().toLowerCase())
            .filter((e) => e.includes("@"))
        )
      )
    : [];

  if (emails.length === 0) {
    throw new HttpsError(
      "invalid-argument",
      "emails must be a non-empty list"
    );
  }

  const adminAuth = getAuth();
  const db = getFirestore();
  const uids: string[] = [];
  let createdPending = 0;
  let resolvedExisting = 0;

  // Читаем grantedCourses группы для courseAccess pending-пользователей
  const groupSnap = await db.collection("groups").doc(groupId).get();
  const groupData = groupSnap.data() as Record<string, unknown> | undefined;
  const grantedCourses = Array.isArray(groupData?.grantedCourses)
    ? (groupData!.grantedCourses as string[])
    : [];
  const courseAccess: Record<string, boolean> = {};
  for (const courseId of grantedCourses) {
    courseAccess[courseId] = true;
  }

  for (const email of emails) {
    try {
      const authUser = await adminAuth.getUserByEmail(email);
      uids.push(authUser.uid);
      resolvedExisting++;
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code !== "auth/user-not-found") {
        const message = err instanceof Error ? err.message : String(err);
        throw new HttpsError(
          "internal",
          `Failed to resolve ${email}: ${message}`
        );
      }
      const pendingUid = toPendingUid(email);
      const pendingRef = db.collection("users").doc(pendingUid);
      const snap = await pendingRef.get();
      if (!snap.exists) {
        await pendingRef.set({
          uid: pendingUid,
          email,
          displayName: email.split("@")[0],
          photoURL: null,
          courseAccess,
          pendingRegistration: true,
          invitedAt: FieldValue.serverTimestamp(),
          invitedBy: callerUid,
          createdAt: FieldValue.serverTimestamp(),
          lastLoginAt: null,
        });
      }
      uids.push(pendingUid);
      createdPending++;
    }
  }

  await db.collection("groups").doc(groupId).update({
    memberIds: FieldValue.arrayUnion(...uids),
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: callerUid,
  });

  fnLogger.info("✅ Group members added by email", {
    groupId,
    resolvedExisting,
    createdPending,
    by: callerUid,
  });

  return { success: true, resolvedExisting, createdPending, uids };
});

export const deleteGroup = onCall(CALLABLE_OPTS, async (request) => {
  const data = request.data;
  const uid = assertSuperAdmin(request);
  const d = (data ?? {}) as Record<string, unknown>;
  const groupId = requireNonEmptyString(d.groupId, "groupId");

  if (isEveryoneGroup(groupId)) {
    throw new HttpsError(
      "failed-precondition",
      "Системную группу нельзя удалить"
    );
  }

  await db.collection("groups").doc(groupId).delete();
  fnLogger.info("✅ Group deleted", { groupId, by: uid });
  return { success: true };
});

/**
 * Обновить «актуальные курсы» группы (groups/{id}.featuredCourseIds).
 * Право: super-admin или admin, явно указанный в announcementAdminIds группы.
 * Валидация: max 3 элемента, все courseIds существуют в коллекции courses/.
 * Пустой массив очищает поле (FieldValue.delete()).
 */
export const setGroupFeaturedCourses = onCall(CALLABLE_OPTS, async (request) => {
  const data = request.data;
  const d = (data ?? {}) as Record<string, unknown>;
  const groupId = requireNonEmptyString(d.groupId, "groupId");
  const callerUid = await assertCanManageGroup(request, groupId);
  const courseIds = normalizeFeaturedCourseIds(d.courseIds);
  await assertCoursesExist(courseIds);

  const updates: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: callerUid,
  };
  if (courseIds.length === 0) {
    updates.featuredCourseIds = FieldValue.delete();
  } else {
    updates.featuredCourseIds = courseIds;
  }

  await db.collection("groups").doc(groupId).update(updates);
  fnLogger.info("✅ Group featuredCourseIds updated", {
    groupId,
    count: courseIds.length,
    by: callerUid,
  });
  return { success: true, courseIds };
});
