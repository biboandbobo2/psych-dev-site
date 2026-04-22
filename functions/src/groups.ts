import * as functions from "firebase-functions";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { SUPER_ADMIN_EMAIL } from "./lib/shared.js";

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

  await db.collection("groups").doc(groupId).update({
    memberIds,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: uid,
  });
  functions.logger.info("✅ Group members updated", { groupId, count: memberIds.length, by: uid });
  return { success: true, count: memberIds.length };
});

export const deleteGroup = functions.https.onCall(async (data, context) => {
  const uid = assertSuperAdmin(context);
  const d = (data ?? {}) as Record<string, unknown>;
  const groupId = requireNonEmptyString(d.groupId, "groupId");

  await db.collection("groups").doc(groupId).delete();
  functions.logger.info("✅ Group deleted", { groupId, by: uid });
  return { success: true };
});
