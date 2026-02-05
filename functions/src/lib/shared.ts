/**
 * Shared utilities for Cloud Functions.
 *
 * Centralises helpers that were previously duplicated across
 * bulkEnrollment.ts, onUserCreate.ts, courseAccess.ts, etc.
 */

import * as functions from "firebase-functions";

export const SUPER_ADMIN_EMAIL = "biboandbobo2@gmail.com";

export const CORE_COURSE_IDS = ["development", "clinical", "general"];

// ── Auth helpers ──────────────────────────────────────────────

export function ensureSuperAdmin(context: functions.https.CallableContext) {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Authentication required");
  }

  if (context.auth.token?.email !== SUPER_ADMIN_EMAIL) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only super-admin can perform this action"
    );
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
