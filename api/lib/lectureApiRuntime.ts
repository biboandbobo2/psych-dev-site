import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuth } from 'firebase-admin/auth';
import { GoogleGenAI } from '@google/genai';
import { getAllowedAppOrigin } from '../../src/lib/appOrigins.js';

const SAFE_LECTURE_API_ERROR = 'Сервис лекций временно недоступен. Попробуйте ещё раз позже.';

/**
 * Извлекает Gemini ключ ТОЛЬКО из заголовка X-Gemini-Api-Key (BYOK strict).
 * Возвращает null если пользователь не передал ключ. Caller возвращает 402 BYOK_REQUIRED.
 *
 * До волны 7 здесь был fallback на process.env.GEMINI_API_KEY — это позволяло гостям
 * дёргать AI на наш ключ. Сейчас прод-ключ остаётся только для server-side.
 */
export function resolveLectureGeminiApiKey(req: VercelRequest): string | null {
  const userKey = req.headers['x-gemini-api-key'];
  if (typeof userKey === 'string' && userKey.trim()) {
    return userKey.trim();
  }
  return null;
}

export function getLectureGenAiClient(apiKey: string) {
  return new GoogleGenAI({ apiKey });
}

export function getLectureApiAllowedOrigin(origin: string | undefined) {
  return getAllowedAppOrigin(origin);
}

export function setLectureApiCorsHeaders(req: VercelRequest, res: VercelResponse) {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
  const allowedOrigin = getLectureApiAllowedOrigin(origin);

  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Gemini-Api-Key');
  return allowedOrigin;
}

export async function verifyLectureApiAuth(req: VercelRequest) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return { valid: false, error: 'Требуется авторизация', code: 'UNAUTHORIZED' } as const;
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(authHeader.slice(7));
    return { valid: true, uid: decodedToken.uid } as const;
  } catch {
    return { valid: false, error: 'Недействительная авторизация', code: 'UNAUTHORIZED' } as const;
  }
}

function stripJsonTrailingCommas(value: string) {
  return value.replace(/,\s*([}\]])/g, '$1');
}

export function tryParseLectureGeminiJson(rawText: string) {
  const trimmed = rawText.trim();
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  const candidate = codeBlockMatch
    ? codeBlockMatch[1].trim()
    : trimmed.replace(/```json\s*\n?|\n?```/g, '').trim();
  const jsonText = candidate.startsWith('{')
    ? candidate
    : (candidate.match(/\{[\s\S]*\}/)?.[0] ?? candidate);

  try {
    return JSON.parse(stripJsonTrailingCommas(jsonText)) as {
      answer: string;
      citations: Array<{ chunkId: string; claim: string }>;
    };
  } catch {
    return null;
  }
}

export function toSafeLectureApiError() {
  return SAFE_LECTURE_API_ERROR;
}
