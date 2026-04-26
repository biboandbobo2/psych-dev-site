/**
 * Общие helpers для публичных API endpoints в /api:
 * - CORS allowlist через src/lib/appOrigins.
 * - Verification Firebase ID token (Bearer).
 * - Strict BYOK Gemini key extraction (без env fallback) для cost-sensitive endpoints.
 * - In-memory rate-limit по IP.
 *
 * Используется в /api/books и потенциально в других AI-endpoints.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuth } from 'firebase-admin/auth';
import type { IncomingMessage } from 'http';
import { getAllowedAppOrigin } from '../../src/lib/appOrigins.js';

// ============================================================================
// CORS
// ============================================================================

/**
 * Ставит CORS headers с allowlist из appOrigins. Возвращает разрешённый origin
 * или null. Caller-у обычно достаточно проверить это значение в OPTIONS handler:
 * если null и origin был передан — отдать 403.
 */
export function setSharedCorsHeaders(req: VercelRequest, res: VercelResponse): string | null {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
  const allowedOrigin = getAllowedAppOrigin(origin);

  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Gemini-Api-Key');
  return allowedOrigin;
}

// ============================================================================
// AUTH (Firebase Bearer)
// ============================================================================

export type AuthVerifyResult =
  | { valid: true; uid: string }
  | { valid: false; error: string; code: 'UNAUTHORIZED' };

/**
 * Проверяет Firebase ID token из Authorization: Bearer header.
 * Использовать для cost-sensitive endpoints (search/answer).
 */
export async function verifyAuthBearer(req: VercelRequest): Promise<AuthVerifyResult> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return { valid: false as const, error: 'Требуется авторизация', code: 'UNAUTHORIZED' };
  }
  try {
    const decoded = await getAuth().verifyIdToken(authHeader.slice(7));
    return { valid: true as const, uid: decoded.uid };
  } catch {
    return { valid: false as const, error: 'Недействительная авторизация', code: 'UNAUTHORIZED' };
  }
}

// ============================================================================
// BYOK (strict — без env fallback)
// ============================================================================

/**
 * Извлекает Gemini API ключ ТОЛЬКО из заголовка X-Gemini-Api-Key.
 * В отличие от resolveLectureGeminiApiKey() и getGeminiApiKey() в assistant.ts,
 * здесь НЕТ fallback на process.env.GEMINI_API_KEY — если пользователь не передал
 * свой ключ, возвращается null. Это enforcement BYOK для пользовательских AI-вызовов:
 * прод-ключ остаётся только для server-side (Cloud Functions, скрипты).
 *
 * Caller должен вернуть 402 с подсказкой «подключите ключ в профиле».
 */
export function requireBYOKGeminiKey(req: VercelRequest): string | null {
  const userKey = req.headers['x-gemini-api-key'];
  if (typeof userKey === 'string' && userKey.trim()) {
    return userKey.trim();
  }
  return null;
}

// ============================================================================
// RATE LIMIT (in-memory, per IP)
// ============================================================================

export interface RateLimitConfig {
  windowMs: number;
  max: number;
}

const rateLimitStores = new Map<string, Map<string, number[]>>();

function getStore(bucket: string): Map<string, number[]> {
  let store = rateLimitStores.get(bucket);
  if (!store) {
    store = new Map();
    rateLimitStores.set(bucket, store);
  }
  return store;
}

/**
 * Возвращает true если запрос разрешён, false если превышен лимит.
 * Bucket позволяет иметь разные лимиты для разных endpoints.
 *
 * ВАЖНО: in-memory счётчик не масштабируется на serverless (per-instance).
 * Это baseline-защита от случайного спама. См. LP-3 в audit-backlog для
 * миграции на Vercel KV / Upstash.
 */
export function enforceIpRateLimit(bucket: string, ip: string, config: RateLimitConfig): boolean {
  const now = Date.now();
  const windowStart = now - config.windowMs;
  const store = getStore(bucket);
  const entries = (store.get(ip) ?? []).filter((ts) => ts >= windowStart);
  if (entries.length >= config.max) {
    store.set(ip, entries);
    return false;
  }
  entries.push(now);
  store.set(ip, entries);
  return true;
}

/** Очистка для тестов. */
export function resetRateLimitStores() {
  rateLimitStores.clear();
}

export function getClientIp(req: IncomingMessage): string {
  const forwarded = (req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '') as string;
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return (req.socket && (req.socket as { remoteAddress?: string }).remoteAddress) || 'unknown';
}

// ============================================================================
// BYOK USAGE TRACKING
// ============================================================================

/**
 * ISO-формат текущего дня (YYYY-MM-DD) в UTC. Используется как ID документа
 * в `aiUsageDaily/{uid}_{day}`.
 */
export function todayKey(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Логирует использование пользовательского Gemini ключа в Firestore.
 * Документ `aiUsageDaily/{uid}_{day}` инкрементирует tokens / requests / per-action.
 *
 * Никогда не блокирует ответ endpoint-а на ошибке — только логгирует через debugError.
 */
export async function recordByokUsage(params: {
  uid: string;
  action: string; // например, 'books:search', 'books:answer'
  tokens: number;
  firestore: import('firebase-admin/firestore').Firestore;
}): Promise<void> {
  try {
    const { Timestamp, FieldValue } = await import('firebase-admin/firestore');
    const day = todayKey();
    const docId = `${params.uid}_${day}`;
    const ref = params.firestore.collection('aiUsageDaily').doc(docId);
    await ref.set(
      {
        uid: params.uid,
        day,
        tokens: FieldValue.increment(params.tokens),
        requests: FieldValue.increment(1),
        [`byAction.${params.action}.tokens`]: FieldValue.increment(params.tokens),
        [`byAction.${params.action}.requests`]: FieldValue.increment(1),
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    );
  } catch (err) {
    // Логируется через console т.к. /api без debugLog. Не блокируем ответ.
    // eslint-disable-next-line no-console
    console.error('[recordByokUsage]', err);
  }
}
