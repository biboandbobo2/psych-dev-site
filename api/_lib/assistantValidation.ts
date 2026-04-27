// Валидация входа и обрезка ответа для /api/assistant. Pure helpers.

import type { AssistantHistoryItem, AssistantRequest } from './assistantTypes.js';

export const MAX_MESSAGE_LENGTH = 200;
export const MAX_HISTORY_ITEMS = 6;
export const MAX_HISTORY_TOTAL_CHARS = 1200;

export function sanitizeHistory(history: unknown): AssistantHistoryItem[] {
  if (!Array.isArray(history)) return [];
  const result: AssistantHistoryItem[] = [];
  let totalChars = 0;

  for (const item of history) {
    if (!item || typeof item !== 'object') continue;
    const role = (item as any).role;
    const msg = typeof (item as any).message === 'string' ? (item as any).message.trim() : '';
    if ((role === 'user' || role === 'assistant') && msg.length > 0) {
      const clipped = msg.slice(0, MAX_MESSAGE_LENGTH);
      const nextTotal = totalChars + clipped.length;
      if (result.length < MAX_HISTORY_ITEMS && nextTotal <= MAX_HISTORY_TOTAL_CHARS) {
        result.push({ role, message: clipped });
        totalChars = nextTotal;
      }
    }
    if (result.length >= MAX_HISTORY_ITEMS || totalChars >= MAX_HISTORY_TOTAL_CHARS) break;
  }

  return result;
}

export function validateInput(
  body: unknown,
):
  | { valid: true; message: string; locale: string; history: AssistantHistoryItem[] }
  | { valid: false; error: string; code: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body is required', code: 'INVALID_BODY' };
  }

  const { message, locale, history } = body as AssistantRequest;

  if (!message || typeof message !== 'string') {
    return { valid: false, error: 'Message is required', code: 'MISSING_MESSAGE' };
  }

  const trimmed = message.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Message cannot be empty', code: 'EMPTY_MESSAGE' };
  }

  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return {
      valid: false,
      error: `Message exceeds ${MAX_MESSAGE_LENGTH} characters`,
      code: 'MESSAGE_TOO_LONG',
    };
  }

  return {
    valid: true,
    message: trimmed,
    locale: typeof locale === 'string' ? locale : 'ru',
    history: sanitizeHistory(history),
  };
}

// ============================================================================
// RESPONSE TRUNCATION
// ============================================================================

export const MAX_PARAGRAPHS = 6;
export const MAX_CHARS = 3000;

/**
 * Обрезает ответ ассистента до максимум 6 параграфов и 3000 символов.
 * Добавляет ellipsis если обрезано. Старается резать по концу предложения,
 * если sentence-end попадает в последние 30% результата.
 */
export function truncateResponse(text: string): string {
  if (!text) return '';

  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);
  const limitedParagraphs = paragraphs.slice(0, MAX_PARAGRAPHS);
  let result = limitedParagraphs.join('\n\n');

  if (result.length > MAX_CHARS) {
    result = result.slice(0, MAX_CHARS).trimEnd();
    const lastSentenceEnd = Math.max(
      result.lastIndexOf('. '),
      result.lastIndexOf('! '),
      result.lastIndexOf('? '),
    );
    if (lastSentenceEnd > MAX_CHARS * 0.7) {
      result = result.slice(0, lastSentenceEnd + 1);
    }
    result += '…';
  } else if (paragraphs.length > MAX_PARAGRAPHS) {
    result += '…';
  }

  return result;
}
