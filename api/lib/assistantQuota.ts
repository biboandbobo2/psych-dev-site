// In-memory rate-limit + daily quota + usage tracking для /api/assistant.
// ВАЖНО: счётчики per-instance — не масштабируются на serverless. См. LP-3
// в audit-backlog для миграции на Vercel KV / Upstash.

import type { IncomingMessage } from 'node:http';

// ============================================================================
// RATE LIMITING (per IP, sliding window)
// ============================================================================

export const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
export const RATE_LIMIT_MAX = 10; // 10 requests per window
export const rateLimitStore = new Map<string, number[]>();

export function enforceRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const entries = rateLimitStore.get(ip)?.filter((ts) => ts >= windowStart) ?? [];

  if (entries.length >= RATE_LIMIT_MAX) {
    rateLimitStore.set(ip, entries);
    return false;
  }

  entries.push(now);
  rateLimitStore.set(ip, entries);
  return true;
}

export function getClientIp(req: IncomingMessage): string {
  const forwarded = (req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '') as string;
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return (req.socket && (req.socket as any).remoteAddress) || 'unknown';
}

// ============================================================================
// DAILY QUOTA (per client key, reset daily)
// ============================================================================

const DAILY_TOTAL_RAW = Number(process.env.ASSISTANT_DAILY_TOTAL_QUOTA ?? 500);
export const DAILY_TOTAL_QUOTA =
  Number.isFinite(DAILY_TOTAL_RAW) && DAILY_TOTAL_RAW > 0 ? DAILY_TOTAL_RAW : 500;
export const PER_USER_DAILY_QUOTA = Math.max(1, Math.floor(DAILY_TOTAL_QUOTA / 5));
export const dailyQuotaStore = new Map<string, { day: number; count: number }>();

export function getDayKey(): number {
  return Math.floor(Date.now() / (24 * 60 * 60 * 1000));
}

export function enforceDailyQuota(clientKey: string): boolean {
  const today = getDayKey();
  const entry = dailyQuotaStore.get(clientKey);
  if (!entry || entry.day !== today) {
    dailyQuotaStore.set(clientKey, { day: today, count: 1 });
    return true;
  }
  if (entry.count >= PER_USER_DAILY_QUOTA) {
    return false;
  }
  entry.count += 1;
  dailyQuotaStore.set(clientKey, entry);
  return true;
}

// ============================================================================
// USAGE TRACKING (tokens/request count, per day, in-memory)
// ============================================================================

export type UsageState = { day: number; tokensUsed: number; requests: number };
export const usageState: UsageState = { day: getDayKey(), tokensUsed: 0, requests: 0 };

export function resetUsageIfNeeded(): UsageState {
  const today = getDayKey();
  if (usageState.day !== today) {
    usageState.day = today;
    usageState.tokensUsed = 0;
    usageState.requests = 0;
  }
  return usageState;
}

export function estimateTokens(text: string): number {
  if (!text) return 0;
  const normalized = text.trim();
  if (!normalized) return 0;
  return Math.max(1, Math.ceil(normalized.length / 4));
}

export function addUsage(tokens: number): UsageState {
  const state = resetUsageIfNeeded();
  state.tokensUsed += Math.max(0, Math.floor(tokens));
  state.requests += 1;
  return state;
}
