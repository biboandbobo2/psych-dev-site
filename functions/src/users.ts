import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as fnLogger from "firebase-functions/logger";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { CORE_COURSE_IDS, SUPER_ADMIN_EMAIL, CALLABLE_OPTS } from "./lib/shared.js";

const db = getFirestore();

// Продуктового лимита на «актуальные» нет. Это технический предел против
// мусорных запросов: на каждый id — чтение courses/{id} в assertCoursesExist.
const MAX_COURSE_IDS = 50;

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
  if (result.length > MAX_COURSE_IDS) {
    throw new HttpsError(
      "invalid-argument",
      `Слишком много курсов: не больше ${MAX_COURSE_IDS}`
    );
  }
  return result;
}

async function assertCoursesExist(courseIds: string[]): Promise<void> {
  if (courseIds.length === 0) return;
  // Core-курсы (development/clinical/general) считаются всегда существующими —
  // их метаданные жёстко заданы в src/constants/courses.ts, документ в
  // `courses/{id}` опционален. Проверяем через Firestore только динамические
  // курсы, у которых документ обязателен.
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

/**
 * Обновить личные правки «актуальных курсов» пользователя:
 * `featuredCourseIds` — добавленные поверх курсов потока и купленных,
 * `unfeaturedCourseIds` — убранные из них. Писать может либо сам пользователь
 * (на свой документ), либо super-admin (на любой). Добавленные курсы должны
 * существовать. Пустой массив очищает поле; `unfeaturedCourseIds` не передан
 * (старый клиент) — поле не трогаем.
 */
export const setMyFeaturedCourses = onCall(CALLABLE_OPTS, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Требуется авторизация");
  }
  const callerUid = request.auth.uid;
  const callerEmail = request.auth.token.email;
  const isSuperAdmin = callerEmail === SUPER_ADMIN_EMAIL;

  const d = (request.data ?? {}) as Record<string, unknown>;
  const targetUidRaw = typeof d.targetUid === "string" ? d.targetUid.trim() : "";
  const targetUid = targetUidRaw || callerUid;

  if (targetUid !== callerUid && !isSuperAdmin) {
    throw new HttpsError(
      "permission-denied",
      "Только сам пользователь или super-admin может менять актуальные курсы"
    );
  }

  const courseIds = normalizeFeaturedCourseIds(d.courseIds);
  const unfeaturedCourseIds =
    d.unfeaturedCourseIds === undefined ? null : normalizeFeaturedCourseIds(d.unfeaturedCourseIds);
  await assertCoursesExist(courseIds);

  const updates: Record<string, unknown> = {
    featuredCoursesUpdatedAt: FieldValue.serverTimestamp(),
    featuredCoursesUpdatedBy: callerUid,
    featuredCourseIds: courseIds.length > 0 ? courseIds : FieldValue.delete(),
  };
  if (unfeaturedCourseIds) {
    updates.unfeaturedCourseIds =
      unfeaturedCourseIds.length > 0 ? unfeaturedCourseIds : FieldValue.delete();
  }

  await db.collection("users").doc(targetUid).set(updates, { merge: true });
  fnLogger.info("✅ User featuredCourseIds updated", {
    targetUid,
    count: courseIds.length,
    unfeaturedCount: unfeaturedCourseIds?.length ?? null,
    by: callerUid,
  });
  return { success: true, courseIds };
});
