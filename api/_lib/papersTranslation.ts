// Перевод RU→EN и расширение запроса вариантами для /api/papers.
// Pure helpers, без I/O.

import type { QueryVariantSource } from './papersWikidata.js';

const GENERIC_STOPWORDS = new Set(['study', 'research', 'theory', 'analysis', 'review', 'science']);
const EN_STOPWORDS = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'for', 'in']);
export const RU_STOPWORDS = new Set([
  'и', 'в', 'на', 'по', 'о', 'об', 'от', 'для', 'как', 'снижения', 'коррекции', 'средство',
]);

// Dictionary for translating Russian psychology terms to English
// OpenAlex search works much better with English terms even for Russian articles
// Include multiple grammatical forms (cases) for better matching
export const RU_TO_EN_TERMS: Record<string, string> = {
  // Therapy types (all cases)
  'арт-терапия': 'art therapy', 'арт-терапии': 'art therapy', 'арт-терапию': 'art therapy',
  'арт терапия': 'art therapy', 'арт терапии': 'art therapy',
  'арттерапия': 'art therapy', 'арттерапии': 'art therapy',
  'игротерапия': 'play therapy', 'игротерапии': 'play therapy',
  'психотерапия': 'psychotherapy', 'психотерапии': 'psychotherapy',
  'терапия': 'therapy', 'терапии': 'therapy', 'терапию': 'therapy',
  'когнитивно-поведенческая': 'cognitive behavioral',
  'гештальт': 'gestalt',
  // Conditions/behaviors (all cases)
  'агрессия': 'aggression', 'агрессии': 'aggression', 'агрессию': 'aggression',
  'агрессивное': 'aggressive', 'агрессивного': 'aggressive', 'агрессивным': 'aggressive',
  'агрессивность': 'aggressiveness', 'агрессивности': 'aggressiveness',
  'тревога': 'anxiety', 'тревоги': 'anxiety', 'тревогу': 'anxiety',
  'тревожность': 'anxiety', 'тревожности': 'anxiety',
  'депрессия': 'depression', 'депрессии': 'depression', 'депрессию': 'depression',
  'стресс': 'stress', 'стресса': 'stress', 'стрессом': 'stress',
  'травма': 'trauma', 'травмы': 'trauma', 'травму': 'trauma',
  'птср': 'ptsd',
  'аутизм': 'autism', 'аутизма': 'autism', 'аутизмом': 'autism',
  'сдвг': 'adhd',
  // Age groups (all cases)
  'дети': 'children', 'детей': 'children', 'детям': 'children', 'детьми': 'children',
  'ребенок': 'child', 'ребёнок': 'child', 'ребенка': 'child', 'ребёнка': 'child',
  'подростки': 'adolescents', 'подростков': 'adolescents', 'подросткам': 'adolescents',
  'младшие школьники': 'elementary school children',
  'младших школьников': 'elementary school children',
  'школьники': 'schoolchildren', 'школьников': 'schoolchildren',
  'дошкольники': 'preschoolers', 'дошкольников': 'preschoolers',
  // Psychology terms (all cases)
  'психология': 'psychology', 'психологии': 'psychology',
  'психологический': 'psychological', 'психологического': 'psychological',
  'поведение': 'behavior', 'поведения': 'behavior', 'поведением': 'behavior',
  'развитие': 'development', 'развития': 'development', 'развитием': 'development',
  'эмоции': 'emotions', 'эмоций': 'emotions', 'эмоциями': 'emotions',
  'эмоциональный': 'emotional', 'эмоционального': 'emotional', 'эмоциональное': 'emotional',
  'привязанность': 'attachment', 'привязанности': 'attachment',
  'самооценка': 'self-esteem', 'самооценки': 'self-esteem', 'самооценку': 'self-esteem',
  'мотивация': 'motivation', 'мотивации': 'motivation',
};

/**
 * Translate Russian query to English for better OpenAlex search results.
 * OpenAlex indexes Russian articles but searches them better with English terms.
 */
export function translateRuToEn(query: string): string | null {
  const lower = query.toLowerCase();
  const words = lower.split(/\s+/);
  const translated: string[] = [];
  let hasTranslation = false;

  let i = 0;
  while (i < words.length) {
    // Try multi-word phrases first (up to 3 words)
    let matched = false;
    for (let len = 3; len >= 1 && !matched; len--) {
      if (i + len <= words.length) {
        const phrase = words.slice(i, i + len).join(' ');
        if (RU_TO_EN_TERMS[phrase]) {
          translated.push(RU_TO_EN_TERMS[phrase]);
          hasTranslation = true;
          matched = true;
          i += len;
        }
      }
    }
    if (!matched) {
      const word = words[i];
      if (RU_TO_EN_TERMS[word]) {
        translated.push(RU_TO_EN_TERMS[word]);
        hasTranslation = true;
      } else if (!RU_STOPWORDS.has(word)) {
        // Keep non-stopwords as-is (might be transliterated or proper nouns)
        translated.push(word);
      }
      i++;
    }
  }

  if (!hasTranslation || translated.length === 0) return null;
  return translated.join(' ');
}

export function isStopword(value: string, lang: string): boolean {
  const lower = value.toLowerCase();
  if (GENERIC_STOPWORDS.has(lower)) return true;
  if (lang === 'en' && EN_STOPWORDS.has(lower)) return true;
  if (lang === 'ru' && RU_STOPWORDS.has(lower)) return true;
  return false;
}

function normalizeVariant(value: string): string {
  return value.trim();
}

export function buildQueryVariants({
  q,
  detectedLang,
  wikidataVariants,
  langsRequested,
  mode,
}: {
  q: string;
  detectedLang: string;
  wikidataVariants: QueryVariantSource[];
  langsRequested: string[];
  mode: 'drawer' | 'page';
}): string[] {
  const maxVariants = mode === 'page' ? 8 : 6;
  const variants: string[] = [q];
  const seen = new Set([q.toLowerCase()]);

  const tryAdd = (v: QueryVariantSource): boolean => {
    const variant = normalizeVariant(v.variant);
    const lower = variant.toLowerCase();
    if (seen.has(lower)) return false;
    if (isStopword(variant, v.lang || detectedLang)) return false;
    seen.add(lower);
    variants.push(variant);
    return true;
  };

  // STEP 1: Add one label per language (prioritize diversity)
  const targetLangs = langsRequested.filter((lang) => lang !== detectedLang);
  for (const lang of targetLangs) {
    if (variants.length >= maxVariants) break;
    const labelForLang = wikidataVariants.find(
      (v) => v.lang === lang && !seen.has(normalizeVariant(v.variant).toLowerCase()),
    );
    if (labelForLang) {
      tryAdd(labelForLang);
    }
  }

  // STEP 2: Add one synonym in the original language (for synonym expansion)
  const sameLangVariant = wikidataVariants.find(
    (v) => v.lang === detectedLang && !seen.has(normalizeVariant(v.variant).toLowerCase()),
  );
  if (sameLangVariant && variants.length < maxVariants) {
    tryAdd(sameLangVariant);
  }

  // STEP 3: Fill remaining slots with any other variants
  for (const v of wikidataVariants) {
    if (variants.length >= maxVariants) break;
    tryAdd(v);
  }

  return variants;
}

/**
 * Determines the language of a query by character set / function words.
 * Returns one of: ru, en, de, es, fr (Chinese disabled).
 */
export function detectLang(query: string): string {
  const text = query.toLowerCase();
  const hasCyrillic = /[а-яё]/i.test(text);
  if (hasCyrillic) return 'ru';
  // TODO: Re-enable Chinese when needed
  // const hasChinese = /[一-龥]/.test(text);
  // if (hasChinese) return 'zh';
  if (/[äöüß]/i.test(text) || /\bder\b|\bdie\b|\bund\b/.test(text)) return 'de';
  if (/[áéíóúñ¡¿]/i.test(text) || /\bel\b|\bla\b|\bdel\b/.test(text)) return 'es';
  if (/[àâçéèêëîïôûùüÿœ]/i.test(text) || /\ble\b|\bla\b|\bet\b/.test(text)) return 'fr';
  return 'en';
}
