import { describe, expect, it } from 'vitest';
import {
  detectLang,
  isStopword,
  translateRuToEn,
} from '../../api/_lib/papersTranslation.js';
import {
  PSYCHOLOGY_SCORE_THRESHOLD,
  getPsychologyScore,
} from '../../api/_lib/papersScoring.js';
import {
  cleanHost,
  isAllowedUrl,
} from '../../api/_lib/papersAllowList.js';
import {
  buildParagraph,
  reconstructAbstractFromIndex,
} from '../../api/_lib/papersNormalization.js';
import type { ResearchWork } from '../../api/_lib/papersTypes.js';

describe('detectLang', () => {
  it('кириллица → ru', () => {
    expect(detectLang('тревога у подростков')).toBe('ru');
  });
  it('немецкие умляуты → de', () => {
    expect(detectLang('Bindungstheorie und Stabilität')).toBe('de');
  });
  it('испанский ¿', () => {
    expect(detectLang('¿qué es ansiedad?')).toBe('es');
  });
  it('default → en', () => {
    expect(detectLang('attachment theory')).toBe('en');
  });
});

describe('translateRuToEn', () => {
  it('переводит точные термины', () => {
    expect(translateRuToEn('тревога у детей')).toContain('anxiety');
    expect(translateRuToEn('тревога у детей')).toContain('children');
  });

  it('обрабатывает падежи (морфологические формы)', () => {
    expect(translateRuToEn('депрессии')).toBe('depression');
    expect(translateRuToEn('депрессию')).toBe('depression');
  });

  it('фильтрует RU stop-words', () => {
    const result = translateRuToEn('тревога и стресс');
    expect(result).toBe('anxiety stress');
  });

  it('multi-word phrase: "младшие школьники" → один матч', () => {
    expect(translateRuToEn('младшие школьники депрессия')).toBe(
      'elementary school children depression',
    );
  });

  it('возвращает null если ни одного словарного матча', () => {
    expect(translateRuToEn('какой-то набор')).toBeNull();
  });

  it('сохраняет неизвестные слова если есть хотя бы один матч', () => {
    const result = translateRuToEn('тревога Васильевич');
    expect(result).toContain('anxiety');
    expect(result).toContain('васильевич');
  });
});

describe('isStopword', () => {
  it('generic стоп-слова отлавливаются для любого языка', () => {
    expect(isStopword('study', 'en')).toBe(true);
    expect(isStopword('study', 'ru')).toBe(true);
  });
  it('en стоп-слова работают только для en', () => {
    expect(isStopword('the', 'en')).toBe(true);
    expect(isStopword('the', 'ru')).toBe(false);
  });
  it('ru стоп-слова работают только для ru', () => {
    expect(isStopword('и', 'ru')).toBe(true);
    expect(isStopword('и', 'en')).toBe(false);
  });
});

describe('getPsychologyScore', () => {
  it('даёт positive score для psychology термина в title', () => {
    const score = getPsychologyScore('Cognitive therapy for anxiety', null, 'en', null);
    expect(score).toBeGreaterThan(PSYCHOLOGY_SCORE_THRESHOLD);
  });

  it('даёт 0 для нерелевантного title', () => {
    const score = getPsychologyScore('Soil tillage methods', null, 'en', null);
    expect(score).toBe(0);
  });

  it('негативный venue → штраф', () => {
    const score = getPsychologyScore(
      'attachment theory in children',
      null,
      'en',
      'Astronomy and Astrophysics',
    );
    // штраф за astronomy venue 30 минус позитив за psychology термины
    expect(score).toBeLessThan(50);
  });

  it('кросс-язычные термины тоже учитываются', () => {
    // психология (ru) — должен прибавить 10 даже если lang=en
    const score = getPsychologyScore('тревога', null, 'en', null);
    expect(score).toBeGreaterThan(0);
  });

  it('clamp к [0, 100]', () => {
    const longTitle = Array(100).fill('psychology cognitive therapy anxiety').join(' ');
    const score = getPsychologyScore(longTitle, null, 'en', null);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe('cleanHost', () => {
  it('возвращает hostname без www', () => {
    expect(cleanHost('https://www.example.com/path')).toBe('example.com');
  });
  it('lowercase', () => {
    expect(cleanHost('https://EXAMPLE.com')).toBe('example.com');
  });
  it('null для невалидного URL', () => {
    expect(cleanHost('not a url')).toBeNull();
    expect(cleanHost(null)).toBeNull();
    expect(cleanHost(undefined)).toBeNull();
  });
});

describe('isAllowedUrl', () => {
  it('null/undefined/пустой → false', () => {
    expect(isAllowedUrl(null)).toBe(false);
    expect(isAllowedUrl(undefined)).toBe(false);
    expect(isAllowedUrl('')).toBe(false);
  });
  it('невалидный URL → false', () => {
    expect(isAllowedUrl('not a url')).toBe(false);
  });
  it('cyberleninka.ru разрешён (есть в allow-list)', () => {
    expect(isAllowedUrl('https://cyberleninka.ru/article/abc')).toBe(true);
  });
  it('случайный домен не разрешён', () => {
    expect(isAllowedUrl('https://random-host.example/article')).toBe(false);
  });
});

describe('reconstructAbstractFromIndex', () => {
  it('null/undefined/пустой → null', () => {
    expect(reconstructAbstractFromIndex(null)).toBeNull();
    expect(reconstructAbstractFromIndex(undefined)).toBeNull();
    expect(reconstructAbstractFromIndex({})).toBeNull();
  });

  it('собирает слова в правильном порядке по позициям', () => {
    // позиции: hello=0, world=1
    expect(reconstructAbstractFromIndex({ hello: [0], world: [1] })).toBe('hello world');
  });

  it('повторяющиеся слова в нескольких позициях', () => {
    // The cat sat on the mat
    expect(
      reconstructAbstractFromIndex({ The: [0], cat: [1], sat: [2], on: [3], the: [4], mat: [5] }),
    ).toBe('The cat sat on the mat');
  });

  it('пропуски в позициях схлопываются в одиночный пробел', () => {
    // hello _ _ world (gap at 1,2)
    const result = reconstructAbstractFromIndex({ hello: [0], world: [3] });
    expect(result).toBe('hello world');
  });
});

describe('buildParagraph', () => {
  const baseWork = (over: Partial<ResearchWork>): ResearchWork => ({
    id: 'x',
    title: 'X',
    year: null,
    authors: [],
    venue: null,
    language: 'unknown',
    source: 'openalex',
    ...over,
  });

  it('обрезает длинный paragraph до 650 chars и добавляет ellipsis', () => {
    const long = 'a'.repeat(800);
    const result = buildParagraph(baseWork({ paragraph: long }));
    expect(result?.length).toBeLessThanOrEqual(651);
    expect(result?.endsWith('…')).toBe(true);
  });

  it('возвращает paragraph как есть если короткий', () => {
    expect(buildParagraph(baseWork({ paragraph: 'short text' }))).toBe('short text');
  });

  it('null если ни paragraph, ни fallback-метаданных', () => {
    expect(buildParagraph(baseWork({}))).toBeNull();
  });

  it('fallback на venue + год + lang + 3 первых автора', () => {
    const result = buildParagraph(
      baseWork({
        venue: 'Nature',
        year: 2024,
        language: 'en',
        authors: ['A', 'B', 'C', 'D'],
      }),
    );
    expect(result).toContain('Nature');
    expect(result).toContain('2024');
    expect(result).toContain('EN');
    expect(result).toContain('A, B, C');
    expect(result).not.toContain('D');
  });

  it('пропускает language=unknown', () => {
    const result = buildParagraph(baseWork({ venue: 'V', year: 2024 }));
    expect(result).not.toContain('UNKNOWN');
  });

  it('сжимает множественные пробелы', () => {
    const result = buildParagraph(baseWork({ paragraph: 'a   b\t\nc' }));
    expect(result).toBe('a b c');
  });
});
