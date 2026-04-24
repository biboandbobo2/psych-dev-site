import * as functions from "firebase-functions";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { SUPER_ADMIN_EMAIL, toPendingUid } from "./lib/shared.js";
import { isEveryoneGroup } from "../../shared/groups/everyoneGroup.js";

const db = getFirestore();

function assertSuperAdmin(context: functions.https.CallableContext): string {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Требуется авторизация");
  }
  if (context.auth.token.email !== SUPER_ADMIN_EMAIL) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Только super-admin может управлять группами"
    );
  }
  return context.auth.uid;
}

function normalizeStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return Array.from(
    new Set(raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0))
  );
}

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new functions.https.HttpsError("invalid-argument", `${field} is required and must be a non-empty string`);
  }
  return value.trim();
}

export const createGroup = functions.https.onCall(async (data, context) => {
  const uid = assertSuperAdmin(context);
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
  functions.logger.info("✅ Group created", { groupId: ref.id, name, by: uid });
  return { success: true, groupId: ref.id };
});

export const updateGroup = functions.https.onCall(async (data, context) => {
  const uid = assertSuperAdmin(context);
  const d = (data ?? {}) as Record<string, unknown>;
  const groupId = requireNonEmptyString(d.groupId, "groupId");

  const updates: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: uid,
  };
  if (typeof d.name === "string") {
    const name = d.name.trim();
    if (!name) {
      throw new functions.https.HttpsError("invalid-argument", "name cannot be empty");
    }
    if (isEveryoneGroup(groupId)) {
      throw new functions.https.HttpsError(
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
  functions.logger.info("✅ Group updated", { groupId, by: uid });
  return { success: true };
});

export const setGroupMembers = functions.https.onCall(async (data, context) => {
  const uid = assertSuperAdmin(context);
  const d = (data ?? {}) as Record<string, unknown>;
  const groupId = requireNonEmptyString(d.groupId, "groupId");
  const memberIds = normalizeStringArray(d.memberIds);

  if (isEveryoneGroup(groupId)) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Состав системной группы управляется автоматически"
    );
  }

  await db.collection("groups").doc(groupId).update({
    memberIds,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: uid,
  });
  functions.logger.info("✅ Group members updated", { groupId, count: memberIds.length, by: uid });
  return { success: true, count: memberIds.length };
});

/**
 * Добавить участников в группу по списку email. Резолвит email через Auth:
 * существующих юзеров — по реальному uid, несуществующих — по
 * pendingUid (тот же формат, что и у bulkEnrollStudents/onUserCreate).
 * Реальный uid заменит pendingUid автоматически при регистрации (см. onUserCreate).
 */
export const addGroupMembersByEmail = functions.https.onCall(async (data, context) => {
  const callerUid = assertSuperAdmin(context);
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
    throw new functions.https.HttpsError(
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
        throw new functions.https.HttpsError(
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

  functions.logger.info("✅ Group members added by email", {
    groupId,
    resolvedExisting,
    createdPending,
    by: callerUid,
  });

  return { success: true, resolvedExisting, createdPending, uids };
});

export const deleteGroup = functions.https.onCall(async (data, context) => {
  const uid = assertSuperAdmin(context);
  const d = (data ?? {}) as Record<string, unknown>;
  const groupId = requireNonEmptyString(d.groupId, "groupId");

  if (isEveryoneGroup(groupId)) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Системную группу нельзя удалить"
    );
  }

  await db.collection("groups").doc(groupId).delete();
  functions.logger.info("✅ Group deleted", { groupId, by: uid });
  return { success: true };
});
