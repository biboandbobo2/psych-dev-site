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

// MP-8: sparse-biography theme branches.
// Even with few facts, theme-driven branches (friends, romance, travel, losses)
// must survive composition + post-filtering. These pin the contract that the
// composer doesn't quietly drop one-event theme branches that are valid.
describe('buildPlanFromCompositionResult — sparse theme branches', () => {
  const themeBranchCases: Array<{
    label: string;
    sphere: string;
    expectedSphere: string;
    branchDetails: string;
    branchYear: number;
  }> = [
    {
      label: 'friends_network',
      sphere: 'friends',
      expectedSphere: 'friends',
      branchDetails: 'Дружба с поэтами лицея',
      branchYear: 1815,
    },
    {
      label: 'romance',
      sphere: 'family',
      expectedSphere: 'family',
      branchDetails: 'Знакомство с Натальей',
      branchYear: 1828,
    },
    {
      label: 'travel_moves_exile',
      sphere: 'place',
      expectedSphere: 'place',
      branchDetails: 'Южная ссылка',
      branchYear: 1820,
    },
    {
      label: 'losses',
      sphere: 'family',
      expectedSphere: 'family',
      branchDetails: 'Смерть матери',
      branchYear: 1836,
    },
  ];

  themeBranchCases.forEach(({ label, sphere, expectedSphere, branchDetails, branchYear }) => {
    it(`сохраняет sparse "${label}" ветку с одним событием`, () => {
      const facts: BiographyFactCandidate[] = [
        makeFact({ year: 1799, details: 'Родился в Москве', category: 'birth', importance: 'high' }),
        makeFact({ year: 1817, details: 'Лицей закончен', category: 'education', importance: 'high' }),
        makeFact({ year: 1837, details: 'Смерть после дуэли', category: 'death', importance: 'high' }),
        makeFact({ year: branchYear, details: branchDetails, category: 'other', sphere }),
      ];
      const composition: BiographyCompositionResult = {
        mainLine: [0, 1, 2],
        branches: [{ name: label, sphere, facts: [3] }],
      };

      const plan = buildPlanFromCompositionResult({
        subjectName: 'Sparse subject',
        facts,
        composition,
      });

      expect(plan.branches).toHaveLength(1);
      expect(plan.branches[0].label).toBe(label);
      expect(plan.branches[0].events).toHaveLength(1);
      expect(plan.branches[0].events[0].label).toContain(branchDetails.slice(0, 12));
      expect(plan.branches[0].sphere).toBe(expectedSphere);
    });
  });

  it('обрабатывает ветку с unmapped sphere через "other" fallback', () => {
    const facts: BiographyFactCandidate[] = [
      makeFact({ year: 1799, details: 'Родился', category: 'birth', importance: 'high' }),
      makeFact({ year: 1837, details: 'Смерть', category: 'death', importance: 'high' }),
      makeFact({
        year: 1820,
        details: 'Странное обстоятельство',
        category: 'other',
        sphere: 'no_such_theme',
      }),
    ];
    const composition: BiographyCompositionResult = {
      mainLine: [0, 1],
      branches: [{ name: 'Загадка', sphere: 'no_such_theme', facts: [2] }],
    };

    const plan = buildPlanFromCompositionResult({
      subjectName: 'Test',
      facts,
      composition,
    });

    expect(plan.branches).toHaveLength(1);
    expect(plan.branches[0].sphere).toBe('other');
  });

  it('не теряет ветку из 1 события когда у subject мало фактов всего', () => {
    // Edge case: extreme sparsity — 4 facts total, 1 of them is a theme branch.
    const facts: BiographyFactCandidate[] = [
      makeFact({ year: 1900, details: 'Родился', category: 'birth' }),
      makeFact({ year: 1925, details: 'Брак', category: 'marriage', sphere: 'family' }),
      makeFact({ year: 1970, details: 'Умер', category: 'death', importance: 'high' }),
      makeFact({ year: 1940, details: 'Эвакуация', category: 'other', sphere: 'place' }),
    ];
    const composition: BiographyCompositionResult = {
      mainLine: [0, 1, 2],
      branches: [{ name: 'travel_moves_exile', sphere: 'place', facts: [3] }],
    };

    const plan = buildPlanFromCompositionResult({
      subjectName: 'Sparse subject',
      facts,
      composition,
    });

    expect(plan.branches).toHaveLength(1);
    expect(plan.branches[0].events[0].label).toContain('Эвакуация');
  });
});
