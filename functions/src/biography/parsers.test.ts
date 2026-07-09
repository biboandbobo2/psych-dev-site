import { describe, it, expect } from 'vitest';
import {
  deduplicateFacts,
  parseAnnotationResponse,
  parseRedakturaResponse,
  parseSimpleJsonFacts,
} from './parsers.js';
import type { BiographyFactCandidate } from '../../../server/api/timelineBiographyTypes.js';

describe('parseSimpleJsonFacts', () => {
  it('parses a clean JSON array of facts', () => {
    const text = JSON.stringify([
      { year: 1799, text: 'Родился в Москве', category: 'birth' },
      { year: 1837, text: 'Погиб', category: 'death' },
    ]);
    const facts = parseSimpleJsonFacts(text);
    expect(facts).toHaveLength(2);
    expect(facts[0].year).toBe(1799);
    expect(facts[0].labelHint).toBe('Родился в Москве');
    expect(facts[0].category).toBe('birth');
  });

  it('strips ```json fences', () => {
    const text = '```json\n[{"year":1799,"text":"Родился в Москве","category":"birth"}]\n```';
    expect(parseSimpleJsonFacts(text)).toHaveLength(1);
  });

  it('recovers from a truncated tail by closing the array at last "}"', () => {
    const text =
      '[{"year":1799,"text":"Родился в Москве","category":"birth"},{"year":1820,"text":"Южная ссылка","category":"exile"},{"year":1837,"text":"Дуэл';
    const facts = parseSimpleJsonFacts(text);
    expect(facts.length).toBeGreaterThanOrEqual(2);
    expect(facts[1].year).toBe(1820);
  });

  it('rejects items shorter than 4 chars', () => {
    const text = JSON.stringify([
      { year: 1800, text: 'Х', category: 'other' },
      { year: 1810, text: 'Школа лицея', category: 'education' },
    ]);
    const facts = parseSimpleJsonFacts(text);
    expect(facts).toHaveLength(1);
    expect(facts[0].labelHint).toBe('Школа лицея');
  });

  it('returns [] on garbage', () => {
    expect(parseSimpleJsonFacts('totally not json')).toEqual([]);
  });
});

describe('parseAnnotationResponse', () => {
  it('parses well-formed lines and ignores INDEX header', () => {
    const text =
      'INDEX\tTHEMES\tPEOPLE\tMONTH\tDAY\n0\teducation,upbringing_mentors\tАрина Родионовна\t10\t19\n1\tcreative_work\t-\t\t';
    const map = parseAnnotationResponse(text);
    expect(map.size).toBe(2);
    expect(map.get(0)?.themes).toContain('education');
    expect(map.get(0)?.month).toBe(10);
    expect(map.get(0)?.day).toBe(19);
    expect(map.get(1)?.people).toEqual([]);
  });

  it('drops invalid theme tokens but keeps the line if at least one is valid', () => {
    const map = parseAnnotationResponse('5\teducation,nonsense_theme\t-\t\t');
    expect(map.get(5)?.themes).toEqual(['education']);
  });

  it('drops a line entirely when no theme is valid', () => {
    const map = parseAnnotationResponse('7\tnonsense,other_garbage\t-\t\t');
    expect(map.has(7)).toBe(false);
  });

  it('clamps invalid month/day to null', () => {
    const map = parseAnnotationResponse('3\teducation\t-\t13\t40');
    expect(map.get(3)?.month).toBeNull();
    expect(map.get(3)?.day).toBeNull();
  });
});

describe('parseRedakturaResponse', () => {
  it('parses index/importance/shortLabel triples', () => {
    const text = 'INDEX\tIMP\tLABEL\n0\t5\tНобелевская премия\n1\t2\tСлужба в губернии';
    const map = parseRedakturaResponse(text);
    expect(map.get(0)).toEqual({ importance: 5, shortLabel: 'Нобелевская премия' });
    expect(map.get(1)?.importance).toBe(2);
  });

  it('clamps out-of-range importance to 3', () => {
    const map = parseRedakturaResponse('0\t99\tQ\n1\t-1\tQ');
    expect(map.get(0)?.importance).toBe(3);
    expect(map.get(1)?.importance).toBe(3);
  });
});

describe('deduplicateFacts', () => {
  function makeFact(overrides: Partial<BiographyFactCandidate> & { details: string }): BiographyFactCandidate {
    return {
      year: undefined,
      age: undefined,
      sphere: 'other',
      category: 'other',
      eventType: 'other',
      labelHint: overrides.details,
      details: overrides.details,
      evidence: overrides.details,
      importance: 'medium',
      confidence: 'medium',
      source: 'model',
      ...overrides,
    };
  }

  it('drops a near-duplicate same-year fact, preserving the longer detail', () => {
    const a = makeFact({ year: 1820, details: 'Сослан на юг России за вольнодумные стихи и эпиграммы' });
    const b = makeFact({ year: 1820, details: 'Сослан вольнодумные стихи юг России' });
    const result = deduplicateFacts([a, b]);
    expect(result).toHaveLength(1);
    expect(result[0].details.length).toBeGreaterThanOrEqual(b.details.length);
  });

  it('keeps facts with non-overlapping content even at the same year', () => {
    const a = makeFact({ year: 1837, details: 'Дуэль на Чёрной речке с Дантесом' });
    const b = makeFact({ year: 1837, details: 'Опубликована Капитанская дочка отдельным изданием' });
    expect(deduplicateFacts([a, b])).toHaveLength(2);
  });

  it('drops the undated fact when matched against a dated near-duplicate', () => {
    const dated = makeFact({ year: 1820, details: 'Сослан на юг России за стихи' });
    const undated = makeFact({ details: 'Сослан на юг России за стихи' });
    const result = deduplicateFacts([dated, undated]);
    expect(result).toHaveLength(1);
    expect(result[0].year).toBe(1820);
  });
});

// BPT-9: объединённая разметка (annotation+redaktura одним вызовом)
describe('parseMergedMarkupResponse', () => {
  it('разбирает строку INDEX/THEMES/PEOPLE/MONTH/DAY/IMPORTANCE/SHORTLABEL', async () => {
    const { parseMergedMarkupResponse } = await import('./parsers.js');
    const raw = [
      'INDEX\tTHEMES\tPEOPLE\tMONTH\tDAY\tIMPORTANCE\tSHORTLABEL',
      '0\tfamily_household\t\t6\t\t5\tРождение',
      '1\teducation,upbringing_mentors\tПетров\t\t\t4\tУниверситет',
      '2\tcreative_work\t-\t9\t14\t3\tПервая книга',
      'мусорная строка',
      '3\tнесуществующая_тема\t\t\t\t2\tЧто-то',
    ].join('\n');
    const parsed = parseMergedMarkupResponse(raw);
    expect(parsed.size).toBe(3); // строка 3 без валидных тем отброшена
    expect(parsed.get(0)).toMatchObject({ themes: ['family_household'], month: 6, importance: 5, shortLabel: 'Рождение' });
    expect(parsed.get(1)).toMatchObject({ themes: ['education', 'upbringing_mentors'], people: ['Петров'], importance: 4 });
    expect(parsed.get(2)).toMatchObject({ month: 9, day: 14, importance: 3, shortLabel: 'Первая книга' });
  });

  it('невалидная importance приводится к 3', async () => {
    const { parseMergedMarkupResponse } = await import('./parsers.js');
    const parsed = parseMergedMarkupResponse('0\thealth\t\t\t\t99\tЛейбл');
    expect(parsed.get(0)!.importance).toBe(3);
  });
});
