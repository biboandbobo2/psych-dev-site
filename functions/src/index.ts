// Cloud Functions (Node 20, ESM), firebase-admin v12+.

import * as functions from "firebase-functions";
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import {
  buildVerifyResult,
  loadActualBundle,
  expectedFromTransformedJson,
  type ExpectedBundle,
  type PeriodDoc,
} from "../../shared/verifyCore.js";
import {
  debugError as functionsDebugError,
  debugLog as functionsDebugLog,
} from "./lib/debug.js";

if (!getApps().length) {
  initializeApp({ credential: applicationDefault() });
}

type ReconcileArrayField =
  | 'concepts'
  | 'authors'
  | 'core_literature'
  | 'extra_literature'
  | 'extra_videos'
  | 'video_playlist'
  | 'leisure';

const ARRAY_FIELDS: ReconcileArrayField[] = ['concepts', 'authors', 'core_literature', 'extra_literature', 'extra_videos', 'video_playlist', 'leisure'];

type Author = { name: string; url?: string };
type Link = { title: string; url?: string };
type Leisure = { title: string; url?: string; type?: string; year?: string };
type VideoEntry = { title: string; url: string; deckUrl?: string; audioUrl?: string };

export function ensureAdmin(context: functions.https.CallableContext) {
  const role = (context.auth?.token as any)?.role;
  if (role !== "admin" && role !== "super-admin") {
    throw new functions.https.HttpsError('permission-denied', 'Admin only');
  }
}

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeAuthor(value: any): Author | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') {
    const name = normalizeSpaces(value);
    if (!name) return undefined;
    return { name };
  }
  if (typeof value === 'object') {
    const name = normalizeSpaces(String(value.name ?? value.title ?? ''));
    if (!name) return undefined;
    const url = value.url ?? value.link ?? value.href;
    return url ? { name, url: String(url).trim() } : { name };
  }
  return undefined;
}

function normalizeAuthors(value: unknown): Author[] {
  if (!Array.isArray(value)) return [];
  const result: Author[] = [];
  value.forEach((item) => {
    const normalized = normalizeAuthor(item);
    if (normalized) result.push(normalized);
  });
  return result;
}

function normalizeLink(value: any): Link | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') {
    const title = normalizeSpaces(value);
    if (!title) return undefined;
    return { title };
  }
  if (typeof value === 'object') {
    const title = normalizeSpaces(String(value.title ?? value.name ?? ''));
    if (!title) return undefined;
    const url = value.url ?? value.link ?? value.href;
    return url ? { title, url: String(url).trim() } : { title };
  }
  return undefined;
}

function normalizeLinks(value: unknown): Link[] {
  if (!Array.isArray(value)) return [];
  const result: Link[] = [];
  value.forEach((item) => {
    const normalized = normalizeLink(item);
    if (normalized) result.push(normalized);
  });
  return result;
}

function normalizeVideoPlaylist(value: unknown): VideoEntry[] {
  if (!Array.isArray(value)) return [];
  const result: VideoEntry[] = [];
  value.forEach((item) => {
    if (!item) return;
    if (typeof item === 'string') {
      const url = normalizeSpaces(item);
      if (url) result.push({ title: '', url });
      return;
    }
    if (typeof item === 'object') {
      const rawUrl = (item as any).url ?? (item as any).videoUrl ?? (item as any).src;
      const url = rawUrl ? normalizeSpaces(String(rawUrl)) : '';
      if (!url) return;
      const title = normalizeSpaces(String((item as any).title ?? (item as any).label ?? ''));
      const deck = (item as any).deckUrl ?? (item as any).deck_url;
      const audio = (item as any).audioUrl ?? (item as any).audio_url;
      result.push({
        title,
        url,
        ...(deck ? { deckUrl: normalizeSpaces(String(deck)) } : {}),
        ...(audio ? { audioUrl: normalizeSpaces(String(audio)) } : {}),
      });
    }
  });
  return result;
}

function normalizeLeisure(value: unknown): Leisure[] {
  if (!Array.isArray(value)) return [];
  const result: Leisure[] = [];
  value.forEach((item) => {
    if (!item) return;
    if (typeof item === 'string') {
      const title = normalizeSpaces(item);
      if (title) result.push({ title });
      return;
    }
    if (typeof item === 'object') {
      const title = normalizeSpaces(String((item as any).title ?? (item as any).name ?? ''));
      if (!title) return;
      const urlRaw = (item as any).url ?? (item as any).link;
      const typeRaw = (item as any).type ?? (item as any).category;
      const yearRaw = (item as any).year;
      result.push({
        title,
        ...(urlRaw ? { url: String(urlRaw).trim() } : {}),
        ...(typeRaw ? { type: normalizeSpaces(String(typeRaw)) } : {}),
        ...(yearRaw !== undefined && yearRaw !== null
          ? { year: normalizeSpaces(String(yearRaw)) }
          : {}),
      });
    }
  });
  return result;
}

function normalizeConcepts(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalizeSpaces(String(item ?? '')))
    .filter((item) => item.length > 0);
}

function conceptKey(value: string): string {
  return normalizeSpaces(value).toLowerCase();
}

function authorKey(value: Author): string {
  const name = normalizeSpaces(value.name).toLowerCase();
  const url = value.url ? value.url.trim().toLowerCase() : '';
  return `${name}|${url}`;
}

function linkKey(value: Link): string {
  const title = normalizeSpaces(value.title).toLowerCase();
  const url = value.url ? value.url.trim().toLowerCase() : '';
  return `${title}|${url}`;
}

function videoKey(value: VideoEntry): string {
  const title = normalizeSpaces(value.title).toLowerCase();
  const url = value.url.trim().toLowerCase();
  const deck = value.deckUrl ? normalizeSpaces(value.deckUrl).toLowerCase() : '';
  const audio = value.audioUrl ? normalizeSpaces(value.audioUrl).toLowerCase() : '';
  return `${title}|${url}|${deck}|${audio}`;
}

function leisureKey(value: Leisure): string {
  const title = normalizeSpaces(value.title).toLowerCase();
  const url = value.url ? value.url.trim().toLowerCase() : '';
  const type = value.type ? normalizeSpaces(value.type).toLowerCase() : '';
  const year = value.year ? normalizeSpaces(value.year).toLowerCase() : '';
  return `${title}|${url}|${type}|${year}`;
}

function mergeUniqueStrings(current: string[], additions: string[]): string[] {
  const set = new Set(current.map(conceptKey));
  const result = [...current];
  additions.forEach((item) => {
    const key = conceptKey(item);
    if (!set.has(key)) {
      set.add(key);
      result.push(item);
    }
  });
  return result;
}

function mergeUniqueAuthors(current: Author[], additions: Author[]): Author[] {
  const set = new Set(current.map(authorKey));
  const result = [...current];
  additions.forEach((item) => {
    const key = authorKey(item);
    if (!set.has(key)) {
      set.add(key);
      result.push(item);
    }
  });
  return result;
}

function mergeUniqueLinks(current: Link[], additions: Link[]): Link[] {
  const set = new Set(current.map(linkKey));
  const result = [...current];
  additions.forEach((item) => {
    const key = linkKey(item);
    if (!set.has(key)) {
      set.add(key);
      result.push(item);
    }
  });
  return result;
}

function mergeUniqueVideos(current: VideoEntry[], additions: VideoEntry[]): VideoEntry[] {
  const set = new Set(current.map(videoKey));
  const result = [...current];
  additions.forEach((item) => {
    const key = videoKey(item);
    if (!set.has(key)) {
      set.add(key);
      result.push(item);
    }
  });
  return result;
}

function mergeUniqueLeisure(current: Leisure[], additions: Leisure[]): Leisure[] {
  const set = new Set(current.map(leisureKey));
  const result = [...current];
  additions.forEach((item) => {
    const key = leisureKey(item);
    if (!set.has(key)) {
      set.add(key);
      result.push(item);
    }
  });
  return result;
}

/**
 * Callable: seedAdmin
 * По одноразовому коду добавляет пользователя в коллекцию admins/{uid}
 * и выставляет custom claim role: "admin".
 *
 * Требует аутентификации (Google Sign-In). Код берётся из functions:config admin.seed_code.
 */
export const seedAdmin = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  const email = context.auth?.token?.email;
  const seedCode = (data?.seedCode ?? "").trim();

  functionsDebugLog("🔵 seedAdmin called", {
    hasAuth: !!context.auth,
    hasUid: Boolean(uid),
    hasEmail: Boolean(email),
    hasSeedCode: Boolean(seedCode),
  });

  if (!uid || !email) {
    functionsDebugError("❌ No UID or email");
    throw new functions.https.HttpsError("unauthenticated", "Login required");
  }

  const expected = (functions.config().admin?.seed_code || "").trim();
  functionsDebugLog("🔵 Expected seed code configured:", Boolean(expected));

  if (!expected || seedCode !== expected) {
    functionsDebugError("❌ Invalid seed code");
    throw new functions.https.HttpsError("permission-denied", "Invalid code");
  }

  try {
    functionsDebugLog("🔵 Writing to Firestore admins collection...");
    await getFirestore().collection("admins").doc(uid).set(
      { email, createdAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
    functionsDebugLog("✅ Firestore write successful");

    functionsDebugLog("🔵 Setting custom user claims...");
    await getAdminAuth().setCustomUserClaims(uid, { role: "admin" });
    functionsDebugLog("✅ Custom claims set successfully");

    const userRecord = await getAdminAuth().getUser(uid);
    functionsDebugLog("✅ User custom claims after setting:", userRecord.customClaims);

    return { ok: true, claims: userRecord.customClaims };
  } catch (err: any) {
    functionsDebugError("❌ Error in seedAdmin:", err);
    functionsDebugError("❌ Error code:", err?.code);
    functionsDebugError("❌ Error message:", err?.message);
    throw new functions.https.HttpsError("internal", "Failed to set admin role: " + err?.message);
  }
});

/**
 * setRole - управление ролями пользователей (только для админов)
 *
 * @param data.targetUid - UID пользователя, которому меняем роль
 * @param data.role - 'admin' | 'student' | null (null удаляет роль)
 */
export const setRole = functions.https.onCall(async (data, context) => {
  functions.logger.info("🔵 setRole called", {
    caller: context.auth?.uid,
    target: data?.targetUid,
    role: data?.role,
  });

  if (!context.auth) {
    functions.logger.error("❌ Unauthenticated call");
    throw new functions.https.HttpsError("unauthenticated", "Authentication required");
  }

  const callerRole = context.auth.token?.role;
  if (callerRole !== "admin") {
    functions.logger.error("❌ Caller is not admin", {
      caller: context.auth.uid,
      callerRole,
    });
    throw new functions.https.HttpsError("permission-denied", "Only admins can manage roles");
  }

  const targetUid = data?.targetUid;
  const role = data?.role as "admin" | "student" | null | undefined;

  if (!targetUid || typeof targetUid !== "string") {
    functions.logger.error("❌ Invalid targetUid");
    throw new functions.https.HttpsError("invalid-argument", "targetUid is required and must be a string");
  }

  if (role !== "admin" && role !== "student" && role !== null) {
    functions.logger.error("❌ Invalid role", { role });
    throw new functions.https.HttpsError(
      "invalid-argument",
      "role must be 'admin', 'student', or null"
    );
  }

  try {
    const authAdmin = getAdminAuth();
    const firestore = getFirestore();

    const targetUser = await authAdmin.getUser(targetUid);
    functions.logger.info("✅ Target user found", { email: targetUser.email });

    const claims = role ? { role } : {};
    await authAdmin.setCustomUserClaims(targetUid, claims);
    functions.logger.info("✅ Custom claims updated", { targetUid, newClaims: claims });

    const adminDocRef = firestore.collection("admins").doc(targetUid);

    if (role === "admin") {
      await adminDocRef.set(
        {
          email: targetUser.email,
          role: "admin",
          grantedBy: context.auth.uid,
          grantedByEmail: context.auth.token.email,
          grantedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      functions.logger.info("✅ Admin document created/updated");
    } else {
      if (role === null) {
        await adminDocRef.delete();
        functions.logger.info("✅ Admin document deleted");
      } else {
        await adminDocRef.set(
          {
            email: targetUser.email,
            role: "student",
            revokedBy: context.auth.uid,
            revokedByEmail: context.auth.token.email,
            revokedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        functions.logger.info("✅ Admin role revoked");
      }
    }

    const updatedUser = await authAdmin.getUser(targetUid);
    functions.logger.info("✅ Final custom claims", { claims: updatedUser.customClaims });

    return {
      success: true,
      targetUid,
      targetEmail: targetUser.email,
      newRole: role || "student",
      customClaims: updatedUser.customClaims,
      message: `Role successfully changed to ${role || "student"}. User must sign out and sign in again.`,
    };
  } catch (error: any) {
    functions.logger.error("❌ Error in setRole", {
      error: error?.message,
      code: error?.code,
      targetUid,
    });

    if (error?.code === "auth/user-not-found") {
      throw new functions.https.HttpsError(
        "not-found",
        `User with UID ${targetUid} not found`
      );
    }

    throw new functions.https.HttpsError("internal", `Failed to set role: ${error?.message}`);
  }
});

function coerceExpected(input: any): ExpectedBundle {
  if (!input) {
    throw new functions.https.HttpsError('invalid-argument', 'expected payload required');
  }
  if (Array.isArray(input)) {
    return expectedFromTransformedJson(input as PeriodDoc[]);
  }
  if (Array.isArray(input.periods)) {
    return input as ExpectedBundle;
  }
  throw new functions.https.HttpsError('invalid-argument', 'expected must contain periods array');
}

export const runVerify = functions.https.onCall(async (data, context) => {
  ensureAdmin(context);
  const db = getFirestore();

  let expected: ExpectedBundle | null = null;
  if (data?.expected) {
    expected = coerceExpected(data.expected);
  } else {
    const snap = await db.collection('admin').doc('expectedData').collection('snapshots').doc('latest').get();
    if (!snap.exists) {
      throw new functions.https.HttpsError('failed-precondition', 'Upload expected snapshot first (admin/expectedData/snapshots/latest)');
    }
    expected = coerceExpected(snap.data());
  }

  const actual = await loadActualBundle(db);
  const verify = buildVerifyResult(expected, actual);

  await db.collection('admin').doc('verification').set(
    {
      latest: {
        createdAt: FieldValue.serverTimestamp(),
        summaryPerPeriod: verify.summaryPerPeriod,
      },
    },
    { merge: true }
  );

  return {
    ok: true,
    summaryPerPeriod: verify.summaryPerPeriod,
    reportMd: verify.reportMd,
    diffJson: verify.diffJson,
  };
});

export const runReconcile = functions.https.onCall(async (data, context) => {
  ensureAdmin(context);
  const apply = !!data?.apply;
  const expected = coerceExpected(data?.expected);
  const db = getFirestore();

  const actual = await loadActualBundle(db);
  const verify = buildVerifyResult(expected, actual);
  const expectedMap = new Map<string, PeriodDoc>();
  expected.periods.forEach((p) => expectedMap.set(p.period, p));
  if (expected.intro) expectedMap.set('intro', expected.intro);

  const plan: Array<{
    period: string;
    missingDocument: boolean;
    scalars: string[];
    arrays: Record<string, number>;
  }> = [];

  for (const [period, diff] of Object.entries(verify.diffJson.perPeriod)) {
    const expectedDoc = expectedMap.get(period);
    if (!expectedDoc) continue;

    const isIntro = period === 'intro';
    const docRef = isIntro ? db.collection('intro').doc('singleton') : db.collection('periods').doc(period);
    const descriptor = isIntro ? 'intro/singleton' : `periods/${period}`;

    const arrays: Record<string, number> = {};
    ARRAY_FIELDS.forEach((field) => {
      const entry = diff.arrays[field];
      if (entry?.missing.length) arrays[field] = entry.missing.length;
    });

    plan.push({
      period,
      missingDocument: !!diff.missingDocument,
      scalars: Object.keys(diff.scalars),
      arrays,
    });

    if (!apply) continue;

    if (diff.missingDocument) {
      await docRef.set({ ...expectedDoc, updatedAt: FieldValue.serverTimestamp() }, { merge: false });
      if (isIntro) {
        actual.intro = expectedDoc;
      } else {
        actual.periods[period] = expectedDoc;
      }
      continue;
    }

    const currentData = isIntro ? actual.intro : actual.periods[period];
    const updates: Record<string, unknown> = {};

    Object.keys(diff.scalars).forEach((field) => {
      updates[field] = (expectedDoc as any)[field];
    });

    ARRAY_FIELDS.forEach((field) => {
      const entry = diff.arrays[field];
      if (!entry || !entry.missing.length) return;
      if (field === 'concepts') {
        const current = normalizeConcepts(currentData?.concepts);
        const additions = entry.missing.map((item) => normalizeSpaces(String(item)));
        updates[field] = mergeUniqueStrings(current, additions);
      } else if (field === 'authors') {
        const current = normalizeAuthors(currentData?.authors);
        const additions = entry.missing
          .map((item) => normalizeAuthor(item))
          .filter((item): item is Author => Boolean(item));
        updates[field] = mergeUniqueAuthors(current, additions);
      } else if (field === 'video_playlist') {
        const current = normalizeVideoPlaylist((currentData as any)?.video_playlist);
        const additions = normalizeVideoPlaylist(entry.missing);
        updates[field] = mergeUniqueVideos(current, additions);
      } else if (field === 'leisure') {
        const current = normalizeLeisure((currentData as any)?.leisure);
        const additions = normalizeLeisure(entry.missing);
        updates[field] = mergeUniqueLeisure(current, additions);
      } else {
        const current = normalizeLinks((currentData as any)?.[field]);
        const additions = entry.missing
          .map((item) => normalizeLink(item))
          .filter((item): item is Link => Boolean(item));
        updates[field] = mergeUniqueLinks(current, additions);
      }
    });

    if (Object.keys(updates).length === 0) continue;

    await docRef.set({ ...updates, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

    if (isIntro) {
      actual.intro = { ...(actual.intro ?? {}), ...updates } as PeriodDoc;
    } else {
      actual.periods[period] = { ...(actual.periods[period] ?? {}), ...updates } as PeriodDoc;
    }
  }

  if (apply) {
    await db.collection('admin').doc('verification').set(
      {
        latest: {
          createdAt: FieldValue.serverTimestamp(),
          summaryPerPeriod: verify.summaryPerPeriod,
        },
      },
      { merge: true }
    );
  }

  return { ok: true, applied: apply, plan };
});

export { onUserCreate } from './onUserCreate.js';
export { migrateAdmins } from './migrateAdmins.js';
export { makeUserAdmin, removeAdmin } from './makeAdmin.js';
export { ingestBook } from './ingestBook.js';

/**
 * Интерфейс для карты доступа к курсам
 */
interface CourseAccessMap {
  development?: boolean;
  clinical?: boolean;
  general?: boolean;
}

/**
 * updateCourseAccess - обновление доступа пользователя к курсам
 *
 * Только super-admin может вызывать эту функцию.
 * Используется для гранулярного управления доступом к видео-контенту.
 *
 * @param data.targetUid - UID пользователя
 * @param data.courseAccess - карта доступа { development?: boolean, clinical?: boolean, general?: boolean }
 */
export const updateCourseAccess = functions.https.onCall(async (data, context) => {
  functions.logger.info("🔵 updateCourseAccess called", {
    caller: context.auth?.uid,
    callerEmail: context.auth?.token?.email,
    target: data?.targetUid,
    courseAccess: data?.courseAccess,
  });

  // Проверка аутентификации
  if (!context.auth) {
    functions.logger.error("❌ Unauthenticated call");
    throw new functions.https.HttpsError("unauthenticated", "Authentication required");
  }

  // Только super-admin может управлять доступом к курсам
  const callerEmail = context.auth.token?.email;
  const SUPER_ADMIN_EMAIL = "biboandbobo2@gmail.com";

  if (callerEmail !== SUPER_ADMIN_EMAIL) {
    functions.logger.error("❌ Caller is not super-admin", {
      caller: context.auth.uid,
      callerEmail,
    });
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only super-admin can manage course access"
    );
  }

  const targetUid = data?.targetUid;
  const courseAccess = data?.courseAccess as CourseAccessMap | undefined;

  // Валидация параметров
  if (!targetUid || typeof targetUid !== "string") {
    functions.logger.error("❌ Invalid targetUid");
    throw new functions.https.HttpsError(
      "invalid-argument",
      "targetUid is required and must be a string"
    );
  }

  if (!courseAccess || typeof courseAccess !== "object") {
    functions.logger.error("❌ Invalid courseAccess");
    throw new functions.https.HttpsError(
      "invalid-argument",
      "courseAccess is required and must be an object"
    );
  }

  // Валидация значений courseAccess
  const validCourses = ["development", "clinical", "general"];
  for (const [key, value] of Object.entries(courseAccess)) {
    if (!validCourses.includes(key)) {
      functions.logger.error("❌ Invalid course key", { key });
      throw new functions.https.HttpsError(
        "invalid-argument",
        `Invalid course key: ${key}. Valid keys: ${validCourses.join(", ")}`
      );
    }
    if (typeof value !== "boolean") {
      functions.logger.error("❌ Invalid course value", { key, value });
      throw new functions.https.HttpsError(
        "invalid-argument",
        `Course access value must be boolean, got ${typeof value} for ${key}`
      );
    }
  }

  try {
    const firestore = getFirestore();
    const userDocRef = firestore.collection("users").doc(targetUid);

    // Проверяем, что пользователь существует
    const userDoc = await userDocRef.get();
    if (!userDoc.exists) {
      functions.logger.error("❌ User not found", { targetUid });
      throw new functions.https.HttpsError(
        "not-found",
        `User with UID ${targetUid} not found`
      );
    }

    const userData = userDoc.data();
    const currentRole = userData?.role;

    // Обновляем courseAccess
    await userDocRef.update({
      courseAccess: {
        development: courseAccess.development ?? false,
        clinical: courseAccess.clinical ?? false,
        general: courseAccess.general ?? false,
      },
      courseAccessUpdatedAt: FieldValue.serverTimestamp(),
      courseAccessUpdatedBy: context.auth.uid,
    });

    functions.logger.info("✅ Course access updated", {
      targetUid,
      targetEmail: userData?.email,
      courseAccess,
      currentRole,
    });

    return {
      success: true,
      targetUid,
      targetEmail: userData?.email,
      courseAccess: {
        development: courseAccess.development ?? false,
        clinical: courseAccess.clinical ?? false,
        general: courseAccess.general ?? false,
      },
      message: "Course access updated successfully",
    };
  } catch (error: any) {
    // Пробрасываем HttpsError как есть
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    functions.logger.error("❌ Error in updateCourseAccess", {
      error: error?.message,
      code: error?.code,
      targetUid,
    });

    throw new functions.https.HttpsError(
      "internal",
      `Failed to update course access: ${error?.message}`
    );
  }
});
