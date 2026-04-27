/* Serverless endpoint: POST /api/assistant
 * AI assistant for psychology questions using Google Gemini.
 * Restricts topics to psychology/developmental psychology/clinical psychology.
 *
 * Helpers вынесены в api/_lib/assistant*.ts.
 */
import type { IncomingMessage } from 'node:http';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import {
  setSharedCorsHeaders,
  verifyAuthBearer,
  recordByokUsage,
} from '../src/lib/api-server/sharedApiRuntime.js';
import {
  DAILY_TOTAL_QUOTA,
  PER_USER_DAILY_QUOTA,
  addUsage,
  enforceDailyQuota,
  enforceRateLimit,
  estimateTokens,
  getClientIp,
  resetUsageIfNeeded,
} from './_lib/assistantQuota.js';
import {
  validateInput,
  truncateResponse,
} from './_lib/assistantValidation.js';
import {
  callGemini,
  callGeminiCourseIntroDraft,
  getGeminiApiKey,
} from './_lib/assistantGemini.js';
import type {
  AssistantErrorResponse,
  AssistantHistoryItem,
  AssistantResponse,
} from './_lib/assistantTypes.js';

// Re-export для совместимости с tests/api/assistant.test.ts
export { truncateResponse } from './_lib/assistantValidation.js';

/**
 * Silent firebase init для best-effort BYOK usage tracking. Если
 * FIREBASE_SERVICE_ACCOUNT_KEY не задан — не валит запрос (в отличие от
 * shared initFirebaseAdmin). Также конфигурирует storageBucket.
 */
function ensureFirebaseAdminInit() {
  if (getApps().length > 0) return;
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!json) return;
  const sa = JSON.parse(json);
  initializeApp({
    credential: cert(sa),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${sa.project_id}.firebasestorage.app`,
  });
}

export default async function handler(req: any, res: any) {
  const started = Date.now();

  const allowedOrigin = setSharedCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    if (req.headers.origin && !allowedOrigin) {
      res.status(403).json({ ok: false, error: 'Origin not allowed' });
      return;
    }
    res.status(200).end();
    return;
  }

  const parsedUrl = new URL(req.url ?? '/', 'http://localhost');
  const isStatsRequest = req.method === 'GET' && parsedUrl.searchParams.get('stats') === '1';

  if (isStatsRequest) {
    const usage = resetUsageIfNeeded();
    res.status(200).json({
      ok: true,
      day: usage.day,
      tokensUsed: usage.tokensUsed,
      requests: usage.requests,
      perUserDailyQuota: PER_USER_DAILY_QUOTA,
      totalDailyQuota: DAILY_TOTAL_QUOTA,
    });
    return;
  }

  if (req.method !== 'POST') {
    const errorResponse: AssistantErrorResponse = {
      ok: false,
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED',
    };
    res.status(405).json(errorResponse);
    return;
  }

  // Rate limiting
  const clientIp = getClientIp(req as IncomingMessage);
  if (!enforceDailyQuota(clientIp)) {
    res.status(429).json({
      ok: false,
      error: `Достигнут дневной лимит. Доступно запросов в день на пользователя: ${PER_USER_DAILY_QUOTA}`,
      code: 'DAILY_QUOTA_EXCEEDED',
    } satisfies AssistantErrorResponse);
    return;
  }

  if (!enforceRateLimit(clientIp)) {
    res.status(429).json({
      ok: false,
      error: 'Слишком много запросов. Подождите несколько минут.',
      code: 'RATE_LIMITED',
    } satisfies AssistantErrorResponse);
    return;
  }

  // Parse body
  let body: unknown;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    res.status(400).json({
      ok: false,
      error: 'Invalid JSON body',
      code: 'INVALID_JSON',
    } satisfies AssistantErrorResponse);
    return;
  }

  // Action: courseIntroDraft — admin-only text generation для course intro editor
  if (
    body &&
    typeof body === 'object' &&
    (body as { action?: unknown }).action === 'courseIntroDraft'
  ) {
    const auth = await verifyAuthBearer(req);
    if (auth.valid !== true) {
      res.status(401).json({ ok: false, error: auth.error, code: auth.code });
      return;
    }
    const apiKey = getGeminiApiKey(req);
    if (!apiKey) {
      res.status(402).json({
        ok: false,
        error: 'Подключите свой Gemini API ключ в профиле — он бесплатный.',
        code: 'BYOK_REQUIRED',
      });
      return;
    }
    const raw = body as Record<string, unknown>;
    const courseName = typeof raw.courseName === 'string' ? raw.courseName : '';
    const kind = raw.kind === 'program' ? 'program' : 'idea';
    const lessons = Array.isArray(raw.lessons)
      ? raw.lessons.filter((l): l is string => typeof l === 'string')
      : [];
    if (!courseName.trim()) {
      res
        .status(400)
        .json({ ok: false, error: 'courseName is required', code: 'INVALID_PAYLOAD' });
      return;
    }
    try {
      const answer = await callGeminiCourseIntroDraft(
        { action: 'courseIntroDraft', courseName, kind, lessons },
        apiKey,
      );
      const tokensUsed =
        estimateTokens(courseName) + estimateTokens(lessons.join('\n')) + estimateTokens(answer);
      const usage = addUsage(tokensUsed);
      ensureFirebaseAdminInit();
      void recordByokUsage({
        uid: auth.uid,
        action: 'assistant:courseIntroDraft',
        tokens: tokensUsed,
        firestore: getFirestore(),
      });
      res.status(200).json({
        ok: true,
        answer,
        meta: { tookMs: Date.now() - started, tokensUsed, requestsToday: usage.requests },
      });
    } catch (error: any) {
      const isConfig = error?.message?.includes('GEMINI_API_KEY');
      res.status(isConfig ? 503 : 500).json({
        ok: false,
        error: isConfig
          ? 'Service not configured'
          : 'Не удалось сгенерировать черновик. Попробуйте позже.',
        code: isConfig ? 'SERVICE_NOT_CONFIGURED' : 'GEMINI_ERROR',
        ...(process.env.VERCEL_ENV !== 'production' && { debug: error?.message }),
      });
    }
    return;
  }

  // Validate input
  const validation = validateInput(body);
  if (validation.valid !== true) {
    res.status(400).json({
      ok: false,
      error: validation.error,
      code: validation.code,
    } satisfies AssistantErrorResponse);
    return;
  }

  const { message, locale, history } = validation;

  // BYOK: auth + ключ обязательны. Гость без ключа → 402.
  const auth = await verifyAuthBearer(req);
  if (auth.valid !== true) {
    res.status(401).json({ ok: false, error: auth.error, code: auth.code });
    return;
  }
  const apiKey = getGeminiApiKey(req);
  if (!apiKey) {
    res.status(402).json({
      ok: false,
      error: 'Подключите свой Gemini API ключ в профиле — он бесплатный.',
      code: 'BYOK_REQUIRED',
    });
    return;
  }

  try {
    const geminiResponse = await callGemini(message, locale, history, apiKey);
    const truncatedAnswer = truncateResponse(geminiResponse.answer);
    const historyText = history.map((item) => `${item.role}: ${item.message}`).join('\n');
    const tokensUsed =
      estimateTokens(message) + estimateTokens(historyText) + estimateTokens(truncatedAnswer);
    const usage = addUsage(tokensUsed);
    ensureFirebaseAdminInit();
    void recordByokUsage({
      uid: auth.uid,
      action: 'assistant:chat',
      tokens: tokensUsed,
      firestore: getFirestore(),
    });

    const response: AssistantResponse = {
      ok: true,
      answer: truncatedAnswer,
      refused: !geminiResponse.allowed,
      meta: {
        tookMs: Date.now() - started,
        tokensUsed,
        requestsToday: usage.requests,
      },
    };

    res.status(200).json(response);
  } catch (error: any) {
    // Production error reporting → Vercel logs. Намеренно console.error.
    /* eslint-disable no-console */
    console.error('[assistant] Gemini error:', error?.message || error);
    console.error('[assistant] Error stack:', error?.stack);
    console.error('[assistant] Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    /* eslint-enable no-console */

    const isConfig = error?.message?.includes('GEMINI_API_KEY');

    // Определяем ошибку неверного API ключа
    const isInvalidKey =
      error?.status === 400 ||
      error?.status === 401 ||
      error?.status === 403 ||
      error?.message?.includes('API key') ||
      error?.message?.includes('invalid') ||
      error?.message?.includes('Invalid');

    if (isInvalidKey && !isConfig) {
      res.status(401).json({
        ok: false,
        error: 'Неверный API ключ Gemini. Проверьте ключ и попробуйте снова.',
        code: 'INVALID_API_KEY',
      } satisfies AssistantErrorResponse);
      return;
    }

    res.status(isConfig ? 503 : 500).json({
      ok: false,
      error: isConfig ? 'Service not configured' : 'Не удалось получить ответ. Попробуйте позже.',
      code: isConfig ? 'SERVICE_NOT_CONFIGURED' : 'GEMINI_ERROR',
      ...(process.env.VERCEL_ENV !== 'production' && { debug: error?.message }),
    } satisfies AssistantErrorResponse);
  }
}
