import { describe, expect, it } from 'vitest';
import { buildGeminiApiKeyHeader, sanitizeGeminiApiKey } from '../geminiKey';

describe('geminiKey helpers', () => {
  it('удаляет пробелы и переводы строк из ключа', () => {
    expect(sanitizeGeminiApiKey('  AIzaSy12 34\n56\t78  ')).toBe('AIzaSy12345678');
  });

  it('удаляет кавычки, zero-width и посторонние символы из ключа', () => {
    expect(sanitizeGeminiApiKey(' "\u200BAIzaSyab c_12-3`\n" ')).toBe('AIzaSyabc_12-3');
  });

  it('возвращает undefined для пустого ключа', () => {
    expect(sanitizeGeminiApiKey(' \n\t ')).toBeUndefined();
    expect(sanitizeGeminiApiKey(null)).toBeUndefined();
  });

  it('строит header только для непустого ключа', () => {
    expect(buildGeminiApiKeyHeader(' AIzaSyabc \n123 ')).toEqual({
      'X-Gemini-Api-Key': 'AIzaSyabc123',
    });
    expect(buildGeminiApiKeyHeader('')).toEqual({});
  });
});
