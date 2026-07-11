import { describe, it, expect } from 'vitest';
import { normalizeError } from './errors.js';

describe('normalizeError — квота Gemini (429)', () => {
  it('дневная квота (PerDay) → человеческое сообщение про дневной лимит и платный ключ', () => {
    // Реальный текст 429 от Google для бесплатного tier содержит различитель.
    const err = new Error(
      '[429 Too Many Requests] Resource has been exhausted (e.g. check quota). ' +
        'quota_metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, ' +
        'quota_id: GenerateRequestsPerDayPerProjectPerModel-FreeTier',
    );
    const result = normalizeError(err);
    expect(result.statusCode).toBe(429);
    expect(result.message).toMatch(/дневной лимит/i);
    expect(result.message).toMatch(/платный ключ/i);
    // Не должен предлагать «позже» — дневная квота так не сбрасывается.
    expect(result.message).not.toMatch(/попробуйте позже/i);
  });

  it('поминутная квота (429 без PerDay) → прежнее «попробуйте позже»', () => {
    const err = new Error(
      '[429 Too Many Requests] Resource has been exhausted. ' +
        'quota_id: GenerateRequestsPerMinutePerProjectPerModel-FreeTier',
    );
    const result = normalizeError(err);
    expect(result.statusCode).toBe(429);
    expect(result.message).toBe('Gemini временно недоступен из-за лимита запросов. Попробуйте позже.');
  });

  it('generic RESOURCE_EXHAUSTED без PerDay остаётся поминутным сообщением', () => {
    const result = normalizeError(new Error('RESOURCE_EXHAUSTED: quota exceeded'));
    expect(result.statusCode).toBe(429);
    expect(result.message).toMatch(/попробуйте позже/i);
  });

  it('явный statusCode на ошибке пробрасывается без переклассификации', () => {
    const err = Object.assign(new Error('Укажите ссылку на статью Wikipedia.'), { statusCode: 400 });
    expect(normalizeError(err)).toEqual({ statusCode: 400, message: 'Укажите ссылку на статью Wikipedia.' });
  });
});
