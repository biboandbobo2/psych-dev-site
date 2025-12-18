/* Serverless endpoint: POST /api/assistant
 * AI assistant for psychology questions using Google Gemini.
 * Restricts topics to psychology/developmental psychology/clinical psychology.
 */
import type { IncomingMessage } from 'node:http';
import { GoogleGenAI } from '@google/genai';

// ============================================================================
// TYPES
// ============================================================================

interface AssistantRequest {
  message: string;
  locale?: string;
}

interface AssistantResponse {
  ok: true;
  answer: string;
  refused?: boolean;
  meta?: {
    tookMs: number;
  };
}

interface AssistantErrorResponse {
  ok: false;
  error: string;
  code?: string;
}

interface GeminiStructuredResponse {
  allowed: boolean;
  answer: string;
}

// ============================================================================
// RATE LIMITING (in-memory, per IP)
// ============================================================================

const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_MAX = 10; // 10 requests per window
const rateLimitStore = new Map<string, number[]>();

function enforceRateLimit(ip: string): boolean {
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

function getClientIp(req: IncomingMessage): string {
  const forwarded = (req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '') as string;
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return (req.socket && (req.socket as any).remoteAddress) || 'unknown';
}

// ============================================================================
// INPUT VALIDATION
// ============================================================================

const MAX_MESSAGE_LENGTH = 100;

function validateInput(body: unknown): { valid: true; message: string; locale: string } | { valid: false; error: string; code: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body is required', code: 'INVALID_BODY' };
  }

  const { message, locale } = body as AssistantRequest;

  if (!message || typeof message !== 'string') {
    return { valid: false, error: 'Message is required', code: 'MISSING_MESSAGE' };
  }

  const trimmed = message.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Message cannot be empty', code: 'EMPTY_MESSAGE' };
  }

  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return { valid: false, error: `Message exceeds ${MAX_MESSAGE_LENGTH} characters`, code: 'MESSAGE_TOO_LONG' };
  }

  return {
    valid: true,
    message: trimmed,
    locale: typeof locale === 'string' ? locale : 'ru',
  };
}

// ============================================================================
// RESPONSE TRUNCATION
// ============================================================================

const MAX_PARAGRAPHS = 4;
const MAX_CHARS = 1600;

/**
 * Truncates response to max 4 paragraphs and 1600 characters.
 * Adds ellipsis if truncated.
 */
export function truncateResponse(text: string): string {
  if (!text) return '';

  // Split by double newlines (paragraph separator)
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);

  // Limit to MAX_PARAGRAPHS
  const limitedParagraphs = paragraphs.slice(0, MAX_PARAGRAPHS);
  let result = limitedParagraphs.join('\n\n');

  // Limit to MAX_CHARS
  if (result.length > MAX_CHARS) {
    result = result.slice(0, MAX_CHARS).trimEnd();
    // Try to cut at last sentence or word boundary
    const lastSentenceEnd = Math.max(
      result.lastIndexOf('. '),
      result.lastIndexOf('! '),
      result.lastIndexOf('? ')
    );
    if (lastSentenceEnd > MAX_CHARS * 0.7) {
      result = result.slice(0, lastSentenceEnd + 1);
    }
    result += '…';
  } else if (paragraphs.length > MAX_PARAGRAPHS) {
    // Was truncated by paragraphs, add ellipsis
    result += '…';
  }

  return result;
}

// ============================================================================
// GEMINI INTEGRATION
// ============================================================================

const SYSTEM_INSTRUCTION = `Ты — ИИ-помощник по психологии на образовательном сайте.

СТРОГИЕ ПРАВИЛА:
1. Отвечай ТОЛЬКО на вопросы по психологии, психологии развития, педагогической психологии, клинической психологии.
2. Если вопрос НЕ относится к психологии — установи allowed=false и вежливо откажи, предложив переформулировать вопрос.
3. НЕ давай медицинских диагнозов и не заменяй консультацию специалиста.
4. При обсуждении клинических тем добавляй дисклеймер о необходимости консультации с профессионалом.
5. Ответ должен быть кратким: максимум 4 абзаца, около 1200-1600 символов.
6. Отвечай на языке вопроса (русский/английский).

ФОРМАТ ОТВЕТА — строго JSON:
{
  "allowed": true/false,
  "answer": "текст ответа"
}

Примеры отказа (allowed=false):
- Вопросы про программирование, математику, физику
- Вопросы про рецепты, путешествия, спорт
- Просьбы написать код или сочинение

Примеры принятия (allowed=true):
- Что такое теория привязанности?
- Как развивается память у детей?
- Признаки тревожного расстройства
- Стадии развития по Пиаже`;

async function callGemini(message: string, locale: string): Promise<GeminiStructuredResponse> {
  // Try multiple env var names in case of configuration issues
  // Note: VITE_ prefix seems to work on Vercel while others don't
  const apiKey = process.env.GEMINI_API_KEY || process.env.MY_GEMINI_KEY || process.env.GOOGLE_API_KEY || process.env.VITE_GEMINI_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const ai = new GoogleGenAI({ apiKey });

  const userPrompt = `Вопрос пользователя (язык: ${locale}): ${message}

Ответь строго в формате JSON: {"allowed": boolean, "answer": "текст"}`;

  // First attempt
  let response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: userPrompt,
    config: {
      maxOutputTokens: 400,
      temperature: 0.5,
      systemInstruction: SYSTEM_INSTRUCTION,
    },
  });

  let text = response.text?.trim() ?? '';

  // Try to parse JSON
  let parsed = tryParseGeminiResponse(text);

  // Retry with stricter instruction if parsing failed
  if (!parsed) {
    const retryPrompt = `${userPrompt}

ВАЖНО: Верни ТОЛЬКО валидный JSON без markdown, без \`\`\`, без пояснений:
{"allowed": boolean, "answer": "текст"}`;

    response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: retryPrompt,
      config: {
        maxOutputTokens: 400,
        temperature: 0.3,
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    text = response.text?.trim() ?? '';
    parsed = tryParseGeminiResponse(text);
  }

  if (!parsed) {
    // Fallback: treat as allowed response if we got any text
    return {
      allowed: true,
      answer: text || 'Извините, не удалось обработать ваш вопрос. Попробуйте переформулировать.',
    };
  }

  return parsed;
}

function tryParseGeminiResponse(text: string): GeminiStructuredResponse | null {
  if (!text) return null;

  // Remove markdown code blocks if present
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  // Try to extract JSON from the text
  const jsonMatch = cleaned.match(/\{[\s\S]*"allowed"[\s\S]*"answer"[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }

  try {
    const parsed = JSON.parse(cleaned);
    if (typeof parsed.allowed === 'boolean' && typeof parsed.answer === 'string') {
      return {
        allowed: parsed.allowed,
        answer: parsed.answer,
      };
    }
  } catch {
    // Parsing failed
  }

  return null;
}

// ============================================================================
// HANDLER
// ============================================================================

export default async function handler(req: any, res: any) {
  const started = Date.now();

  // CORS headers for preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
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
  if (!enforceRateLimit(clientIp)) {
    const errorResponse: AssistantErrorResponse = {
      ok: false,
      error: 'Слишком много запросов. Подождите несколько минут.',
      code: 'RATE_LIMITED',
    };
    res.status(429).json(errorResponse);
    return;
  }

  // Parse body
  let body: unknown;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    const errorResponse: AssistantErrorResponse = {
      ok: false,
      error: 'Invalid JSON body',
      code: 'INVALID_JSON',
    };
    res.status(400).json(errorResponse);
    return;
  }

  // Validate input
  const validation = validateInput(body);
  if (!validation.valid) {
    const errorResponse: AssistantErrorResponse = {
      ok: false,
      error: (validation as { valid: false; error: string; code: string }).error,
      code: (validation as { valid: false; error: string; code: string }).code,
    };
    res.status(400).json(errorResponse);
    return;
  }

  // TypeScript now knows validation.valid === true
  const { message, locale } = validation as { valid: true; message: string; locale: string };

  try {
    const geminiResponse = await callGemini(message, locale);
    const truncatedAnswer = truncateResponse(geminiResponse.answer);

    const response: AssistantResponse = {
      ok: true,
      answer: truncatedAnswer,
      refused: !geminiResponse.allowed,
      meta: {
        tookMs: Date.now() - started,
      },
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('[assistant] Gemini error:', error?.message || error);
    console.error('[assistant] Error stack:', error?.stack);
    console.error('[assistant] Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));

    const isConfig = error?.message?.includes('GEMINI_API_KEY');
    const errorResponse: AssistantErrorResponse = {
      ok: false,
      error: isConfig ? 'Service not configured' : 'Не удалось получить ответ. Попробуйте позже.',
      code: isConfig ? 'SERVICE_NOT_CONFIGURED' : 'GEMINI_ERROR',
      // Include error details in development/preview for debugging
      ...(process.env.VERCEL_ENV !== 'production' && { debug: error?.message }),
    };
    res.status(isConfig ? 503 : 500).json(errorResponse);
  }
}
