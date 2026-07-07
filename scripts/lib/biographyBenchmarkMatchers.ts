/**
 * Текстовые матчеры для biography benchmark (вынесены из
 * evaluateBiographyBenchmark.ts для переиспользования в suite).
 */
import type { BiographyBenchmarkMatcher } from './biographyBenchmarks';

export function normalizeBenchmarkText(value: string) {
  return value
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[«»"“”„‟'`]/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function includesNormalized(haystack: string, needle: string) {
  return haystack.includes(normalizeBenchmarkText(needle));
}

export function matchesBenchmarkText(text: string, matcher: BiographyBenchmarkMatcher | undefined) {
  if (!matcher) return false;
  const normalizedText = normalizeBenchmarkText(text);

  if (matcher.any?.some((needle) => includesNormalized(normalizedText, needle))) {
    return true;
  }

  if (matcher.all?.some((group) => group.every((needle) => includesNormalized(normalizedText, needle)))) {
    return true;
  }

  return false;
}
