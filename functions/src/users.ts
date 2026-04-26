import * as functions from "firebase-functions";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { SUPER_ADMIN_EMAIL } from "./lib/shared.js";

const db = getFirestore();

const MAX_FEATURED_COURSES = 3;

function normalizeFeaturedCourseIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    throw new functions.https.HttpsError(
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
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Можно выбрать не более ${MAX_FEATURED_COURSES} актуальных курсов`
    );
  }
  return result;
}

async function assertCoursesExist(courseIds: string[]): Promise<void> {
  if (courseIds.length === 0) return;
  const refs = courseIds.map((id) => db.collection("courses").doc(id));
  const snaps = await db.getAll(...refs);
  const missing = snaps
    .map((snap, idx) => (snap.exists ? null : courseIds[idx]))
    .filter((id): id is string => id !== null);
  if (missing.length > 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Курсы не найдены: ${missing.join(", ")}`
    );
  }
}

/**
 * Обновить личные «актуальные курсы» пользователя
 * (users/{uid}.featuredCourseIds). Писать может либо сам пользователь
 * (на свой документ), либо super-admin (на любой). Валидация: max 3,
 * все courseIds существуют. Пустой массив — очищает поле.
 */
export const setMyFeaturedCourses = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Требуется авторизация");
  }
  const callerUid = context.auth.uid;
  const callerEmail = context.auth.token.email;
  const isSuperAdmin = callerEmail === SUPER_ADMIN_EMAIL;

  const d = (data ?? {}) as Record<string, unknown>;
  const targetUidRaw = typeof d.targetUid === "string" ? d.targetUid.trim() : "";
  const targetUid = targetUidRaw || callerUid;

  if (targetUid !== callerUid && !isSuperAdmin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Только сам пользователь или super-admin может менять актуальные курсы"
    );
  }

  const courseIds = normalizeFeaturedCourseIds(d.courseIds);
  await assertCoursesExist(courseIds);

  const updates: Record<string, unknown> = {
    featuredCoursesUpdatedAt: FieldValue.serverTimestamp(),
    featuredCoursesUpdatedBy: callerUid,
  };
  if (courseIds.length === 0) {
    updates.featuredCourseIds = FieldValue.delete();
  } else {
    updates.featuredCourseIds = courseIds;
  }

  await db.collection("users").doc(targetUid).set(updates, { merge: true });
  functions.logger.info("✅ User featuredCourseIds updated", {
    targetUid,
    count: courseIds.length,
    by: callerUid,
  });
  return { success: true, courseIds };
});
