import { describe, expect, it } from 'vitest';
import { lintBiographyPlan, repairBiographyPlan } from '../../server/api/timelineBiographyLint.js';
import { parseLineBasedBiographyFactCandidates } from '../../server/api/timelineBiographyFacts.js';

describe('timelineBiographyLint', () => {
  it('чинит пустые notes и выкидывает ветку, якорённую к рождению', () => {
    const facts = parseLineBasedBiographyFactCandidates([
      'FACT\t1799\t0\tbirth\tfamily\thigh\tРождение\tРодился в Москве.',
      'FACT\t1811\t12\teducation\teducation\thigh\tПоступление в лицей\tНачал обучение в Царскосельском лицее.',
      'FACT\t1815\t16\tpublication\tcreativity\thigh\tПервое признание\tПолучил известность после лицейского выступления.',
      'FACT\t1820\t21\tpublication\tcreativity\thigh\t«Руслан и Людмила»\tОпубликовал поэму.',
    ].join('\n'));

    const repaired = repairBiographyPlan({
      facts,
      plan: {
        subjectName: 'Александр Пушкин',
        canvasName: 'Пушкин',
        currentAge: 37,
        mainEvents: [
          { age: 0, label: 'Рождение', isDecision: false, sphere: 'family' },
          { age: 12, label: 'Поступление в лицей', isDecision: true, sphere: 'education' },
          { age: 21, label: 'Публикация', isDecision: true, sphere: 'creativity' },
        ],
        branches: [
          {
            label: 'Творчество',
            sphere: 'creativity',
            sourceMainEventIndex: 0,
            events: [
              { age: 16, label: 'Публикация', isDecision: true, sphere: 'creativity' },
              { age: 21, label: 'Публикация', isDecision: true, sphere: 'creativity' },
            ],
          },
        ],
      },
    });

    const issues = lintBiographyPlan(repaired);

    expect(repaired.mainEvents.every((event) => Boolean(event.notes?.trim()))).toBe(true);
    expect(repaired.branches).toHaveLength(0);
    expect(issues.some((issue) => issue.code === 'empty-notes')).toBe(false);
    expect(issues.some((issue) => issue.code === 'birth-anchored-branch')).toBe(false);
  });
});
