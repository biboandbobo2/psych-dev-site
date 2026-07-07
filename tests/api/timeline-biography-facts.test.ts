import { describe, expect, it } from 'vitest';
import {
  parseLineBasedBiographyFactCandidates,
} from '../../server/api/timelineBiographyFacts.js';

describe('timelineBiographyFacts', () => {
  it('парсит line-based facts и переводит publication в creativity', () => {
    const facts = parseLineBasedBiographyFactCandidates([
      'SUBJECT\tАлександр Пушкин',
      'FACT\t1820\t21\tpublication\tcareer\thigh\t«Руслан и Людмила»\tОпубликовал поэму.\tТворчество\thigh\tyear\t21\t21\tcreative_work|legacy\t\t\t21 год',
      'FACT\t1820\t21\tpublication\tcareer\thigh\t«Руслан и Людмила»\tОпубликовал поэму.\tТворчество\thigh\tyear\t21\t21\tcreative_work|legacy\t\t\t21 год',
    ].join('\n'));

    expect(facts).toHaveLength(1);
    expect(facts[0].eventType).toBe('publication');
    expect(facts[0].sphere).toBe('creativity');
    expect(facts[0].confidence).toBe('high');
    expect(facts[0].timePrecision).toBe('year');
    expect(facts[0].themes).toEqual(['creative_work', 'legacy']);
    expect(facts[0].ageLabel).toBe('21 год');
  });

  it('не пропускает запись из метрической книги как публикацию в ноль лет', () => {
    const facts = parseLineBasedBiographyFactCandidates([
      'FACT\t1799\t0\tpublication\tcreativity\thigh\tНовая публикация\tВ метрической книге церкви Богоявления в Елохове на дату 8 (19) июня 1799 года, в числе прочих, приходится такая запись:\tРанние годы\thigh\tyear\t0\t0\tcreative_work\t\t\t0 лет',
    ].join('\n'));

    expect(facts).toHaveLength(1);
    expect(facts[0].eventType).toBe('birth');
    expect(facts[0].sphere).toBe('family');
    expect(facts[0].labelHint).toBe('Рождение');
  });

});

// Д-B6: логика post-death фильтра и density-режима gap-filling жила только
// в CF (functions/src/biographyImport.ts) — Runtime, питающий automation
// endpoints и бенчмарки, её не имел. Хелперы выносятся и покрываются здесь.
describe('filterFactsBeyondDeath', () => {
  const makeFact = (year: number | undefined, details = 'x') => ({
    year,
    age: undefined,
    sphere: 'other' as const,
    category: 'other',
    eventType: 'other' as never,
    labelHint: details,
    details,
    evidence: details,
    importance: 'medium' as const,
    confidence: 'medium' as const,
    source: 'model' as const,
  });

  it('удаляет факты позже deathYear + 10, сохраняя недатированные', async () => {
    const { filterFactsBeyondDeath } = await import('../../server/api/timelineBiographyFacts.js');
    const facts = [makeFact(1900), makeFact(1936), makeFact(1944), makeFact(1947), makeFact(undefined)];
    const filtered = filterFactsBeyondDeath(facts, 1936);
    expect(filtered.map((f) => f.year)).toEqual([1900, 1936, 1944, undefined]);
  });

  it('без deathYear ничего не фильтрует', async () => {
    const { filterFactsBeyondDeath } = await import('../../server/api/timelineBiographyFacts.js');
    const facts = [makeFact(1900), makeFact(2020)];
    expect(filterFactsBeyondDeath(facts, null)).toEqual(facts);
  });
});

describe('resolveGapFillingMode', () => {
  const makeFact = (year: number | undefined) => ({
    year,
    age: undefined,
    sphere: 'other' as const,
    category: 'other',
    eventType: 'other' as never,
    labelHint: 'x',
    details: 'x',
    evidence: 'x',
    importance: 'medium' as const,
    confidence: 'medium' as const,
    source: 'model' as const,
  });

  it('высокая плотность → dating-only', async () => {
    const { resolveGapFillingMode } = await import('../../server/api/timelineBiographyFacts.js');
    // 40 датированных фактов на 10 лет жизни → density 4
    const facts = Array.from({ length: 40 }, (_, i) => makeFact(1900 + (i % 10)));
    const { mode, factDensity } = resolveGapFillingMode(facts, 1900, 1910);
    expect(mode).toBe('dating-only');
    expect(factDensity).toBeGreaterThanOrEqual(3);
  });

  it('низкая плотность → full', async () => {
    const { resolveGapFillingMode } = await import('../../server/api/timelineBiographyFacts.js');
    const facts = [makeFact(1900), makeFact(1920), makeFact(1950)];
    expect(resolveGapFillingMode(facts, 1900, 1950).mode).toBe('full');
  });

  it('birthYear/deathYear защищают lifespan от фактов о предках', async () => {
    const { resolveGapFillingMode } = await import('../../server/api/timelineBiographyFacts.js');
    // 40 фактов в 1900-1909 + факт о предке 1800: без birth/death lifespan
    // растянулся бы до 110 лет и плотность упала бы ниже 3
    const facts = [makeFact(1800), ...Array.from({ length: 40 }, (_, i) => makeFact(1900 + (i % 10)))];
    expect(resolveGapFillingMode(facts, 1900, 1910).mode).toBe('dating-only');
  });
});
