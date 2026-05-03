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
