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
export function ensureSuperAdmin(context) {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Authentication required");
    }
    if (context.auth.token?.email !== SUPER_ADMIN_EMAIL) {
        throw new functions.https.HttpsError("permission-denied", "Only super-admin can perform this action");
    }
}
// ── Pending user helpers ──────────────────────────────────────
export function toPendingUid(email) {
    return `pending_${Buffer.from(email).toString("base64url")}`;
}
export function extractCourseAccess(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return {};
    }
    const source = value;
    const result = {};
    for (const [key, access] of Object.entries(source)) {
        if (typeof access === "boolean") {
            result[key] = access;
        }
    }
    return result;
}
// ── Email / course normalisation ──────────────────────────────
export function normalizeEmail(raw) {
    return raw.trim().toLowerCase();
}
export function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
export function normalizeEmailList(rawEmails) {
    if (!Array.isArray(rawEmails)) {
        return [];
    }
    const dedupe = new Set();
    for (const item of rawEmails) {
        if (typeof item !== "string")
            continue;
        const normalized = normalizeEmail(item);
        if (!normalized || !isValidEmail(normalized))
            continue;
        dedupe.add(normalized);
    }
    return Array.from(dedupe);
}
export function normalizeCourseIds(rawCourseIds) {
    if (!Array.isArray(rawCourseIds)) {
        return [];
    }
    const dedupe = new Set();
    for (const item of rawCourseIds) {
        if (typeof item !== "string")
            continue;
        const normalized = item.trim();
        if (!normalized)
            continue;
        dedupe.add(normalized);
    }
    return Array.from(dedupe);
}
