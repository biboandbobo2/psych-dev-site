import { describe, expect, it } from 'vitest';
import {
  buildHeuristicFactCandidates,
  mergeFactCandidates,
  parseLineBasedBiographyFactCandidates,
} from '../../server/api/timelineBiographyFacts.js';

describe('timelineBiographyFacts', () => {
  it('парсит line-based facts и переводит publication в creativity', () => {
    const facts = parseLineBasedBiographyFactCandidates([
      'SUBJECT\tАлександр Пушкин',
      'FACT\t1820\t21\tpublication\tcareer\thigh\t«Руслан и Людмила»\tОпубликовал поэму.\tТворчество\thigh',
      'FACT\t1820\t21\tpublication\tcareer\thigh\t«Руслан и Людмила»\tОпубликовал поэму.\tТворчество\thigh',
    ].join('\n'));

    expect(facts).toHaveLength(1);
    expect(facts[0].eventType).toBe('publication');
    expect(facts[0].sphere).toBe('creativity');
    expect(facts[0].confidence).toBe('high');
  });

  it('добирает ранние окна жизни из heuristics, если model facts редкие', () => {
    const extract = [
      'Александр Сергеевич Пушкин родился в Москве в 1799 году.',
      'В детстве он много читал в библиотеке отца.',
      'Летние месяцы проводил в Захарове у бабушки.',
      'В 1811 году поступил в Царскосельский лицей.',
      'В 1837 году погиб после дуэли.',
    ].join(' ');
    const heuristicFacts = buildHeuristicFactCandidates(extract, 'Пушкин, Александр Сергеевич');
    const modelFacts = parseLineBasedBiographyFactCandidates([
      'FACT\t1799\t0\tbirth\tfamily\thigh\tРождение\tРодился в Москве.',
      'FACT\t1811\t12\teducation\teducation\thigh\tПоступление в лицей\tНачал обучение в лицее.',
      'FACT\t1837\t37\tdeath\thealth\thigh\tДуэль и смерть\tПогиб после дуэли.',
    ].join('\n'));

    const merged = mergeFactCandidates({
      modelFacts,
      heuristicFacts,
      extract,
    });

    const earlyFacts = merged.filter((fact) => Number(fact.age) <= 18);
    expect(earlyFacts.length).toBeGreaterThanOrEqual(3);
    expect(earlyFacts.some((fact) => Number(fact.age) <= 6)).toBe(true);
    expect(earlyFacts.some((fact) => Number(fact.age) >= 7 && Number(fact.age) <= 12)).toBe(true);
    expect(earlyFacts.length).toBeGreaterThan(modelFacts.filter((fact) => Number(fact.age) <= 18).length);
  });
});
