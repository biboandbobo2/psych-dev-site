import type { Period } from '../../../types/content';

export const STOP_WORDS = new Set([
  // English
  'and', 'or', 'the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from', 'as',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these',
  'those', 'it', 'its',
  // Russian
  'и', 'в', 'на', 'с', 'по', 'для', 'из', 'к', 'о', 'об', 'от', 'до', 'за', 'при', 'во', 'не',
  'как', 'что', 'это', 'или', 'но', 'а', 'же', 'ли', 'бы', 'его', 'её', 'их', 'то', 'все', 'вся',
  'всё',
]);

/**
 * Извлекает данные из sections (новый формат) или legacy полей.
 * При наличии sections.X.content использует его и игнорирует legacy.
 */
export function extractSectionData<T>(
  period: Period,
  sectionKey: string,
  legacyKey: keyof Period,
): T[] {
  const sectionData = period.sections?.[sectionKey]?.content;
  if (Array.isArray(sectionData) && sectionData.length > 0) {
    return sectionData as T[];
  }
  const legacyData = period[legacyKey];
  if (Array.isArray(legacyData)) {
    return legacyData as T[];
  }
  return [];
}

/**
 * Одно слово — substring match. Несколько слов — AND-семантика
 * (каждое слово должно быть substring в тексте).
 */
export function matchesQuery(text: string | undefined, queryWords: string[]): boolean {
  if (!text || queryWords.length === 0) return false;
  const lowerText = text.toLowerCase();
  if (queryWords.length === 1) return lowerText.includes(queryWords[0]);
  return queryWords.every((word) => lowerText.includes(word));
}

const REGEX_SPECIALS = /[.*+?^${}()|[\]\\]/g;

/** Считает суммарное число вхождений слов (re-используется для transcript scoring). */
export function countMatches(text: string, queryWords: string[]): number {
  return queryWords.reduce((count, word) => {
    const matches = text.match(new RegExp(word.replace(REGEX_SPECIALS, '\\$&'), 'g'));
    return count + (matches?.length ?? 0);
  }, 0);
}
