/**
 * Pure parsers для biography pipeline (no I/O). Канонический модуль —
 * functions/src/biography/parsers.ts и Runtime ре-экспортируют/импортируют отсюда
 * (раньше это были две дублированные копии).
 */
import type {
  BiographyEventTheme,
  BiographyFactCandidate,
} from './timelineBiographyTypes.js';

export const VALID_BIOGRAPHY_THEMES = new Set<BiographyEventTheme>([
  'upbringing_mentors',
  'education',
  'friends_network',
  'romance',
  'family_household',
  'children',
  'travel_moves_exile',
  'service_career',
  'creative_work',
  'conflict_duels',
  'losses',
  'politics_public_pressure',
  'health',
  'legacy',
]);

export type AnnotationEntry = {
  themes: BiographyEventTheme[];
  people: string[];
  month: number | null;
  day: number | null;
};

export function parseSimpleJsonFacts(rawText: string): BiographyFactCandidate[] {
  const cleaned = rawText.replace(/^```(?:json)?\s*\n?/gm, '').replace(/\n?```\s*$/gm, '').trim();
  let jsonText = cleaned.match(/\[[\s\S]*\]/)?.[0] ?? '';

  if (!jsonText) {
    const arrayStart = cleaned.indexOf('[');
    if (arrayStart >= 0) {
      let truncated = cleaned.slice(arrayStart).replace(/,\s*$/, '');
      const lastComplete = truncated.lastIndexOf('}');
      if (lastComplete > 0) {
        truncated = truncated.slice(0, lastComplete + 1) + ']';
        jsonText = truncated;
      }
    }
  }
  if (!jsonText) return [];

  try {
    const parsed = JSON.parse(jsonText) as Array<{
      year?: number | null;
      month?: number | null;
      text?: string;
      category?: string;
      sphere?: string;
    }>;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.text === 'string' && item.text.trim().length > 3)
      .map((item) => ({
        year: typeof item.year === 'number' ? item.year : undefined,
        // month просился extraction-промптом, но выбрасывался парсером
        month:
          typeof item.month === 'number' && item.month >= 1 && item.month <= 12
            ? item.month
            : undefined,
        age: undefined,
        sphere: (item.sphere ?? 'other') as BiographyFactCandidate['sphere'],
        category: item.category ?? 'other',
        eventType: (item.category ?? 'other') as BiographyFactCandidate['eventType'],
        labelHint: item.text?.trim() ?? '',
        details: item.text?.trim() ?? '',
        evidence: item.text?.trim() ?? '',
        importance: 'medium' as const,
        confidence: 'medium' as const,
        source: 'model' as const,
      }));
  } catch {
    return [];
  }
}

const STOP_WORDS_FOR_DEDUP = new Set([
  'в', 'и', 'на', 'с', 'по', 'из', 'за', 'от', 'к', 'до', 'для', 'не',
  'о', 'об', 'его', 'её', 'был', 'была', 'были', 'году', 'год', 'года', 'лет',
]);

export function deduplicateFacts(facts: BiographyFactCandidate[]): BiographyFactCandidate[] {
  function extractKeywords(text: string): Set<string> {
    return new Set(
      text
        .toLowerCase()
        .replace(/[«»"".,;:!?()—–\-]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOP_WORDS_FOR_DEDUP.has(w))
    );
  }
  function countOverlap(kwA: Set<string>, kwB: Set<string>): number {
    let shared = 0;
    for (const w of kwA) {
      if (kwB.has(w)) shared++;
    }
    return shared;
  }
  const removed = new Set<number>();
  for (let i = 0; i < facts.length; i++) {
    if (removed.has(i)) continue;
    for (let j = i + 1; j < facts.length; j++) {
      if (removed.has(j)) continue;
      const a = facts[i];
      const b = facts[j];
      const sameYear = a.year != null && b.year != null && a.year === b.year;
      const oneUndated = (a.year == null) !== (b.year == null);
      if (!sameYear && !oneUndated) continue;
      const kwA = extractKeywords(a.details);
      const kwB = extractKeywords(b.details);
      const shared = countOverlap(kwA, kwB);
      if (shared >= 3) {
        if (oneUndated) {
          removed.add(a.year == null ? i : j);
          if (a.year == null) break;
        } else {
          if (a.details.length >= b.details.length) {
            removed.add(j);
          } else {
            removed.add(i);
            break;
          }
        }
      }
    }
  }
  return facts.filter((_, idx) => !removed.has(idx));
}

export function parseAnnotationResponse(rawText: string): Map<number, AnnotationEntry> {
  const annotations = new Map<number, AnnotationEntry>();
  for (const line of rawText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('INDEX')) continue;
    const parts = trimmed.split(/\t/);
    if (parts.length < 2) continue;
    const index = parseInt(parts[0], 10);
    if (isNaN(index)) continue;
    const themes = (parts[1] ?? '')
      .split(',')
      .map((t) => t.trim())
      .filter((t) => VALID_BIOGRAPHY_THEMES.has(t as BiographyEventTheme)) as BiographyEventTheme[];
    const people = (parts[2] ?? '')
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p && p !== '-' && p !== 'пусто');
    const month = parts[3] ? parseInt(parts[3], 10) : null;
    const day = parts[4] ? parseInt(parts[4], 10) : null;
    if (themes.length > 0) {
      annotations.set(index, {
        themes,
        people,
        month: month && !isNaN(month) && month >= 1 && month <= 12 ? month : null,
        day: day && !isNaN(day) && day >= 1 && day <= 31 ? day : null,
      });
    }
  }
  return annotations;
}

export function parseRedakturaResponse(
  rawText: string
): Map<number, { importance: number; shortLabel: string }> {
  const results = new Map<number, { importance: number; shortLabel: string }>();
  for (const line of rawText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('INDEX')) continue;
    const parts = trimmed.split(/\t/);
    if (parts.length < 3) continue;
    const index = parseInt(parts[0], 10);
    if (isNaN(index)) continue;
    const importance = parseInt(parts[1], 10);
    const shortLabel = parts[2]?.trim() ?? '';
    results.set(index, {
      importance: importance >= 1 && importance <= 5 ? importance : 3,
      shortLabel,
    });
  }
  return results;
}

// ---------------------------------------------------------------------------
// BPT-9: объединённая разметка — annotation+redaktura одним вызовом.
// Формат строки: INDEX\tTHEMES\tPEOPLE\tMONTH\tDAY\tIMPORTANCE\tSHORTLABEL
// ---------------------------------------------------------------------------

export type MergedMarkupEntry = AnnotationEntry & {
  importance: number;
  shortLabel: string;
};

export function parseMergedMarkupResponse(rawText: string): Map<number, MergedMarkupEntry> {
  const entries = new Map<number, MergedMarkupEntry>();
  for (const line of rawText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('INDEX')) continue;
    const parts = trimmed.split(/\t/);
    if (parts.length < 6) continue;
    const index = parseInt(parts[0], 10);
    if (isNaN(index)) continue;

    const themes = (parts[1] ?? '')
      .split(',')
      .map((t) => t.trim())
      .filter((t) => VALID_BIOGRAPHY_THEMES.has(t as BiographyEventTheme)) as BiographyEventTheme[];
    if (themes.length === 0) continue;

    const people = (parts[2] ?? '')
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v && v !== '-' && v !== 'пусто');
    const month = parts[3] ? parseInt(parts[3], 10) : null;
    const day = parts[4] ? parseInt(parts[4], 10) : null;
    const importance = parseInt(parts[5], 10);
    const shortLabel = parts[6]?.trim() ?? '';

    entries.set(index, {
      themes,
      people,
      month: month && !isNaN(month) && month >= 1 && month <= 12 ? month : null,
      day: day && !isNaN(day) && day >= 1 && day <= 31 ? day : null,
      importance: importance >= 1 && importance <= 5 ? importance : 3,
      shortLabel,
    });
  }
  return entries;
}

/** JSON-вариант объединённой разметки (structured output — lite-профиль):
 *  TSV с пустыми колонками не-thinking модели схлопывают, теряя позиционность. */
export function parseMergedMarkupJsonResponse(rawText: string): Map<number, MergedMarkupEntry> {
  const entries = new Map<number, MergedMarkupEntry>();
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText.replace(/^```(?:json)?\s*\n?/gm, '').replace(/\n?```\s*$/gm, '').trim());
  } catch {
    return entries;
  }
  if (!Array.isArray(parsed)) return entries;
  for (const item of parsed as Array<Record<string, unknown>>) {
    if (!item || typeof item !== 'object') continue;
    const index = typeof item.index === 'number' ? item.index : NaN;
    if (isNaN(index)) continue;
    const themes = (Array.isArray(item.themes) ? item.themes : [])
      .map((t) => String(t).trim())
      .filter((t) => VALID_BIOGRAPHY_THEMES.has(t as BiographyEventTheme)) as BiographyEventTheme[];
    if (themes.length === 0) continue;
    const people = (Array.isArray(item.people) ? item.people : [])
      .map((v) => String(v).trim())
      .filter((v) => v && v !== '-' && v !== 'пусто');
    const month = typeof item.month === 'number' && item.month >= 1 && item.month <= 12 ? item.month : null;
    const day = typeof item.day === 'number' && item.day >= 1 && item.day <= 31 ? item.day : null;
    const importanceRaw = typeof item.importance === 'number' ? item.importance : NaN;
    entries.set(index, {
      themes,
      people,
      month,
      day,
      importance: importanceRaw >= 1 && importanceRaw <= 5 ? importanceRaw : 3,
      shortLabel: typeof item.shortLabel === 'string' ? item.shortLabel.trim() : '',
    });
  }
  return entries;
}
