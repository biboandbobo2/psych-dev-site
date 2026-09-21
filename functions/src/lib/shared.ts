/**
 * Shared utilities for Cloud Functions.
 *
 * Centralises helpers that were previously duplicated across
 * bulkEnrollment.ts, onUserCreate.ts, courseAccess.ts, etc.
 */

import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";

export const SUPER_ADMIN_EMAIL = "biboandbobo2@gmail.com";

// gen2 по умолчанию работает под compute default SA, у которого нет доступа к
// Secret Manager / Google Calendar / BigQuery. gen1 работал под appspot SA —
// функции, которым нужны эти ресурсы, явно указывают его в опциях.
export const FUNCTIONS_SERVICE_ACCOUNT = "psych-dev-site-prod@appspot.gserviceaccount.com";

export const CORE_COURSE_IDS = ["development", "clinical", "general"];

// Клиент вызывает getFunctions(app) без региона → us-central1 обязателен.
// cpu/memory явно: у gen2 другие дефолты (cpu до 1 vCPU и т.п.), не выкручиваем ресурсы.
export const CALLABLE_OPTS = { region: "us-central1", cpu: 1, memory: "256MiB" } as const;

// ── Auth helpers ──────────────────────────────────────────────

export function ensureSuperAdmin(request: Pick<CallableRequest, "auth">) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  if (request.auth.token?.email !== SUPER_ADMIN_EMAIL) {
    throw new HttpsError(
      "permission-denied",
      "Only super-admin can perform this action"
    );
  }
}

/**
 * Проверяет, что вызывающий имеет роль admin или super-admin.
 */
export function ensureAdmin(request: Pick<CallableRequest, "auth">) {
  const role = (request.auth?.token as { role?: unknown } | undefined)?.role;
  if (role !== "admin" && role !== "super-admin") {
    throw new HttpsError("permission-denied", "Admin only");
  }
}

/** Claims вызывающего, важные для ролевых проверок. */
interface AuthClaims {
  email?: unknown;
  role?: unknown;
  coAdmin?: unknown;
  editableCourses?: unknown;
}

function readClaims(request: Pick<CallableRequest, "auth">): AuthClaims {
  return (request.auth?.token ?? {}) as AuthClaims;
}

/**
 * Super-admin — владелец по email (у него может не быть claims вовсе) либо
 * claim `role: 'super-admin'`, который выставляет onUserCreate.
 */
export function isSuperAdmin(request: Pick<CallableRequest, "auth">): boolean {
  const claims = readClaims(request);
  return claims.email === SUPER_ADMIN_EMAIL || claims.role === "super-admin";
}

/**
 * «Менеджер пользователей» — super-admin или со-админ (claim `coAdmin: true`).
 * Со-админ помогает владельцу с пользователями и потоками; выдача админских
 * прав (makeUserAdmin/removeAdmin/setAdminEditableCourses/makeUserCoAdmin/
 * removeCoAdmin), seedAdmin и setUserRole остаются только у super-admin.
 */
export function isUserManager(request: Pick<CallableRequest, "auth">): boolean {
  return isSuperAdmin(request) || readClaims(request).coAdmin === true;
}

/** Бросает unauthenticated/permission-denied; возвращает uid вызывающего. */
export function ensureUserManager(request: Pick<CallableRequest, "auth">): string {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Требуется авторизация");
  }
  if (!isUserManager(request)) {
    throw new HttpsError(
      "permission-denied",
      "Только super-admin или со-админ может управлять пользователями и потоками"
    );
  }
  return request.auth.uid;
}

/** Курсы из claim `editableCourses` (админ курса). */
export function extractEditableCourses(request: Pick<CallableRequest, "auth">): string[] {
  const raw = readClaims(request).editableCourses;
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === "string" && id.trim().length > 0);
}

/** Super-admin / со-админ — любой курс; admin — только свои editableCourses. */
export function canEditCourse(
  request: Pick<CallableRequest, "auth">,
  courseId: string
): boolean {
  if (isUserManager(request)) return true;
  return (
    readClaims(request).role === "admin" &&
    extractEditableCourses(request).includes(courseId)
  );
}

/** Бросает unauthenticated/permission-denied; возвращает uid вызывающего. */
export function ensureCanEditCourse(
  request: Pick<CallableRequest, "auth">,
  courseId: string
): string {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Требуется авторизация");
  }
  if (!canEditCourse(request, courseId)) {
    throw new HttpsError(
      "permission-denied",
      `Нет прав на курс ${courseId}`
    );
  }
  return request.auth.uid;
}

// ── Pending user helpers ──────────────────────────────────────

export function toPendingUid(email: string): string {
  return `pending_${Buffer.from(email).toString("base64url")}`;
}

// ── Course access helpers ─────────────────────────────────────

export interface CourseAccessMap {
  [courseId: string]: boolean | undefined;
}

export function extractCourseAccess(value: unknown): CourseAccessMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const source = value as Record<string, unknown>;
  const result: CourseAccessMap = {};
  for (const [key, access] of Object.entries(source)) {
    if (typeof access === "boolean") {
      result[key] = access;
    }
  }
  return result;
}

// ── Email / course normalisation ──────────────────────────────

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function normalizeEmailList(rawEmails: unknown): string[] {
  if (!Array.isArray(rawEmails)) {
    return [];
  }

  const dedupe = new Set<string>();
  for (const item of rawEmails) {
    if (typeof item !== "string") continue;
    const normalized = normalizeEmail(item);
    if (!normalized || !isValidEmail(normalized)) continue;
    dedupe.add(normalized);
  }
  return Array.from(dedupe);
}

export function normalizeCourseIds(rawCourseIds: unknown): string[] {
  if (!Array.isArray(rawCourseIds)) {
    return [];
  }

  const dedupe = new Set<string>();
  for (const item of rawCourseIds) {
    if (typeof item !== "string") continue;
    const normalized = item.trim();
    if (!normalized) continue;
    dedupe.add(normalized);
  }
  return Array.from(dedupe);
}
