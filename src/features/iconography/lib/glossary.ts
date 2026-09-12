import type { GlossaryTerm } from '../types';

/** Морфологии в проекте нет: словоформы перечислены в данных, ё и регистр не различаются. */
const fold = (text: string) => text.toLowerCase().replaceAll('ё', 'е');

/** `\b` в JS не знает кириллицы, поэтому границу слова проверяем сами. */
const letter = /[\p{L}\p{N}]/u;

export interface Segment { text: string; term?: GlossaryTerm }

interface Index { pattern: RegExp; byForm: Map<string, GlossaryTerm> }

const indexes = new WeakMap<GlossaryTerm[], Index>();

const escape = (form: string) => form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function indexTerms(terms: GlossaryTerm[]): Index {
  const known = indexes.get(terms);
  if (known) return known;
  const byForm = new Map<string, GlossaryTerm>();
  for (const term of terms) {
    for (const form of term.forms) {
      const key = fold(form).trim();
      if (key && !byForm.has(key)) byForm.set(key, term);
    }
  }
  // Самая длинная форма первой: «деисусный ряд» должен выиграть у «деисусный».
  const alternatives = [...byForm.keys()].sort((a, b) => b.length - a.length).map(escape);
  const index: Index = { pattern: new RegExp(alternatives.join('|'), 'g'), byForm };
  indexes.set(terms, index);
  return index;
}

/**
 * Делит текст на отрезки, помечая термином только первое вхождение каждого понятия:
 * подряд подчёркнутые слова мешают читать, а пояснение нужно один раз.
 */
export function markTerms(text: string, terms: GlossaryTerm[]): Segment[] {
  if (!text || !terms.length) return [{ text }];
  const folded = fold(text);
  // Регистр меняет длину только у экзотических букв, но тогда индексы совпадений уедут.
  if (folded.length !== text.length) return [{ text }];
  const { pattern, byForm } = indexTerms(terms);
  const segments: Segment[] = [];
  const used = new Set<string>();
  let cursor = 0;
  pattern.lastIndex = 0;
  for (let match = pattern.exec(folded); match; match = pattern.exec(folded)) {
    const term = byForm.get(match[0]);
    const start = match.index;
    const end = start + match[0].length;
    const before = start > 0 ? folded[start - 1] : '';
    const after = end < folded.length ? folded[end] : '';
    if (!term || used.has(term.id) || letter.test(before) || letter.test(after)) continue;
    used.add(term.id);
    if (start > cursor) segments.push({ text: text.slice(cursor, start) });
    segments.push({ text: text.slice(start, end), term });
    cursor = end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) });
  return segments;
}
