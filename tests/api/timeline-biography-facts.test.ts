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

  it('вытаскивает high-salience факты про утраты, друзей, семейный конфликт и отношения без пушкинского хардкода', () => {
    const extract = [
      'Александр Сергеевич Пушкин родился в Москве в 1799 году.',
      'В 1825 году после восстания декабристов многие его друзья были арестованы.',
      'В 1828 году у него завязались отношения с Анной Керн.',
      'В 1830 году произошла ссора с отцом.',
      'В 1836 году умерла его мать.',
    ].join(' ');

    const facts = buildHeuristicFactCandidates(extract, 'Пушкин, Александр Сергеевич');

    expect(facts.some((fact) => fact.labelHint === 'Восстание друзей-декабристов')).toBe(true);
    expect(
      facts.some(
        (fact) =>
          fact.labelHint === 'Отношения с Анной Керн' &&
          fact.themes?.includes('romance') &&
          fact.people?.some((person) => person.includes('Керн'))
      )
    ).toBe(true);
    expect(
      facts.some(
        (fact) =>
          fact.labelHint === 'Ссора с отцом' &&
          fact.themes?.includes('conflict_duels') &&
          fact.sphere === 'family'
      )
    ).toBe(true);
    expect(
      facts.some(
        (fact) =>
          fact.labelHint === 'Смерть матери' &&
          fact.themes?.includes('losses') &&
          fact.sphere === 'family'
      )
    ).toBe(true);
  });
});
