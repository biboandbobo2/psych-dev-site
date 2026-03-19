import { describe, expect, it } from 'vitest';
import { buildPlanFromCompositionResult } from '../../server/api/timelineBiographyComposer.js';
import type { BiographyFactCandidate, BiographyCompositionResult } from '../../server/api/timelineBiographyTypes.js';

function makeFact(overrides: Partial<BiographyFactCandidate> & { year: number; details: string }): BiographyFactCandidate {
  return {
    age: undefined,
    sphere: 'other',
    category: overrides.category ?? 'other',
    eventType: (overrides.category ?? 'other') as BiographyFactCandidate['eventType'],
    labelHint: overrides.details,
    shortLabel: overrides.shortLabel ?? overrides.details.slice(0, 25),
    details: overrides.details,
    evidence: overrides.details,
    importance: overrides.importance ?? 'medium',
    confidence: 'medium',
    source: 'model',
    ...overrides,
  };
}

describe('buildPlanFromCompositionResult', () => {
  it('фильтрует рождение из mainLine и ставит в birthDetails', () => {
    const facts: BiographyFactCandidate[] = [
      makeFact({ year: 1799, details: 'Родился в Москве', category: 'birth', importance: 'high' }),
      makeFact({ year: 1811, details: 'Поступил в лицей', category: 'education', importance: 'high' }),
      makeFact({ year: 1837, details: 'Погиб после дуэли', category: 'death', importance: 'high' }),
    ];
    const composition: BiographyCompositionResult = {
      mainLine: [0, 1, 2],
      branches: [],
    };

    const plan = buildPlanFromCompositionResult({
      subjectName: 'Пушкин',
      facts,
      composition,
    });

    // Birth should NOT be in mainEvents
    expect(plan.mainEvents.every(e => e.label !== 'Родился в Москве')).toBe(true);
    // Birth year should be reflected in birthDetails
    expect(plan.birthDetails?.date).toContain('1799');
    // Other events should be on mainLine
    expect(plan.mainEvents.length).toBe(2);
  });

  it('строит ветки с правильными привязками к главной линии', () => {
    const facts: BiographyFactCandidate[] = [
      makeFact({ year: 1849, details: 'Родился в Рязани', category: 'birth' }),
      makeFact({ year: 1870, details: 'Поступил в ВМА', category: 'education', importance: 'high' }),
      makeFact({ year: 1904, details: 'Нобелевская премия', category: 'award', importance: 'high' }),
      makeFact({ year: 1936, details: 'Умер', category: 'death', importance: 'high' }),
      // Branch facts
      makeFact({ year: 1875, details: 'Работа с собаками', category: 'project', sphere: 'career' }),
      makeFact({ year: 1890, details: 'Условные рефлексы', category: 'project', sphere: 'career' }),
      makeFact({ year: 1897, details: 'Лекции по физиологии', category: 'publication', sphere: 'career' }),
    ];
    const composition: BiographyCompositionResult = {
      mainLine: [0, 1, 2, 3],
      branches: [
        { name: 'Научная работа', sphere: 'career', facts: [4, 5, 6] },
      ],
    };

    const plan = buildPlanFromCompositionResult({
      subjectName: 'Павлов',
      facts,
      composition,
    });

    expect(plan.branches.length).toBe(1);
    expect(plan.branches[0].label).toBe('Научная работа');
    expect(plan.branches[0].events.length).toBe(3);
    // Anchor should be mainEvent index 0 (Поступил в ВМА, age 21) — closest before branch start (age 26)
    // Birth is filtered from mainLine, so ВМА is at index 0
    expect(plan.branches[0].sourceMainEventIndex).toBe(0);
  });

  it('отбрасывает пустые ветки', () => {
    const facts: BiographyFactCandidate[] = [
      makeFact({ year: 1879, details: 'Родился', category: 'birth' }),
      makeFact({ year: 1940, details: 'Убит', category: 'death', importance: 'high' }),
    ];
    const composition: BiographyCompositionResult = {
      mainLine: [0, 1],
      branches: [
        { name: 'Пустая ветка', sphere: 'career', facts: [] },
      ],
    };

    const plan = buildPlanFromCompositionResult({
      subjectName: 'Троцкий',
      facts,
      composition,
    });

    expect(plan.branches.length).toBe(0);
  });
});
