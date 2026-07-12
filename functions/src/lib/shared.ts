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
