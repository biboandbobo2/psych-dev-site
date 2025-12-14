import type { QueryVariantSource } from './wikidata';

const GENERIC_STOPWORDS = new Set(['study', 'research', 'theory', 'analysis', 'review', 'science']);
const EN_STOPWORDS = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'for', 'in']);
const RU_STOPWORDS = new Set(['и', 'в', 'на', 'по', 'о', 'об', 'от', 'для', 'как']);

function isStopword(value: string, lang: string): boolean {
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
  const base = q.trim();
  const maxTotal = mode === 'page' ? 6 : 3;
  const result: string[] = [];
  const seen = new Set<string>();

  const pushVariant = (value: string) => {
    const normalized = normalizeVariant(value);
    if (normalized.length < 3) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push(normalized);
  };

  pushVariant(base);

  const langsPriority = [
    detectedLang !== 'en' ? 'en' : null,
    detectedLang,
    ...langsRequested.filter((lang) => lang !== detectedLang && lang !== 'en'),
  ].filter(Boolean) as string[];

  const candidates = wikidataVariants.filter((item) => !isStopword(item.value, item.lang));

  for (const lang of langsPriority) {
    for (const variant of candidates) {
      if (variant.lang !== lang) continue;
      pushVariant(variant.value);
      if (result.length >= maxTotal) return result;
    }
  }

  // fill remaining from any language if still below max
  for (const variant of candidates) {
    pushVariant(variant.value);
    if (result.length >= maxTotal) break;
  }

  return result.slice(0, maxTotal);
}
