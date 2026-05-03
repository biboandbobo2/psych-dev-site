import { describe, expect, it } from 'vitest';

import { buildBiographyEvaluationMetrics } from '../../server/api/timelineBiographyMetrics.js';
import { parseLineBasedBiographyFactCandidates } from '../../server/api/timelineBiographyFacts.js';

describe('timelineBiographyMetrics', () => {
  it('считает generic labels, approximate events и покрытие тем', () => {
    const facts = parseLineBasedBiographyFactCandidates([
      'FACT\t1799\t0\tbirth\tfamily\thigh\tРождение\tРодился в Москве.\tРанние годы\thigh\texact\t0\t0\tfamily_household\t\t\t0 лет',
      'FACT\tunknown\tunknown\tfamily\tfamily\tmedium\tНяня Арина Родионовна\tВ раннем детстве важную роль играла няня.\tРанние годы\tmedium\tapproximate\t4\t7\tupbringing_mentors|family_household\tАрина Родионовна\tняня\tпримерно 4-7 лет',
      'FACT\t1825\t26\tfriends\tfriends\thigh\tДекабристы среди друзей\tПосле восстания многие друзья оказались под ударом.\tОбщество\thigh\tyear\t26\t26\tfriends_network|politics_public_pressure\t\t\t26 лет',
    ].join('\n'));

    const metrics = buildBiographyEvaluationMetrics({
      facts,
      plan: {
        subjectName: 'Александр Пушкин',
        canvasName: 'Пушкин',
        currentAge: 37,
        birthDetails: { date: '1799-06-06' },
        mainEvents: [
          { age: 6, label: 'Формирующее детство', notes: 'Возраст примерный: 4-7 лет.', isDecision: false, sphere: 'education' },
          { age: 26, label: 'Декабристы среди друзей', notes: 'После восстания многие друзья оказались под ударом.', isDecision: false, sphere: 'friends' },
        ],
        branches: [
          {
            label: 'Друзья',
            sphere: 'friends',
            sourceMainEventIndex: 1,
            events: [{ age: 28, label: 'Переписка с друзьями', notes: 'Поддерживал переписку.', isDecision: false, sphere: 'friends' }],
          },
        ],
      },
    });

    expect(metrics.facts.approximate).toBe(1);
    expect(metrics.facts.withPeople).toBe(1);
    expect(metrics.facts.themeCoverage.upbringing_mentors).toBe(1);
    expect(metrics.plan.genericLabels).toBe(1);
    expect(metrics.plan.approximateEvents).toBe(1);
    expect(metrics.plan.birthAnchoredBranches).toBe(0);
  });
});
