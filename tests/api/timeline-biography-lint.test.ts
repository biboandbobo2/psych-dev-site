import { describe, expect, it } from 'vitest';
import {
  cleanGenericEventLabels,
  lintBiographyPlan,
  repairBiographyPlan,
} from '../../server/api/timelineBiographyLint.js';
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

    expect(repaired.mainEvents.some((event) => event.age === 0)).toBe(false);
    expect(repaired.mainEvents.every((event) => Boolean(event.notes?.trim()))).toBe(true);
    expect(repaired.branches).toHaveLength(0);
    expect(issues.some((issue) => issue.code === 'empty-notes')).toBe(false);
    expect(issues.some((issue) => issue.code === 'birth-anchored-branch')).toBe(false);
  });

  it('чинит label и notes из одного и того же факта, а не смешивает разные', () => {
    const facts = parseLineBasedBiographyFactCandidates([
      'FACT\t1903\t36\taward\tcareer\thigh\tНобелевская премия по физике\tПолучила Нобелевскую премию по физике за исследования радиоактивности.\tНаграды\thigh\tyear\t36\t36\tservice_career|legacy\tМария Кюри\tлауреат\t36 лет',
      'FACT\t1911\t44\taffair\tfamily\thigh\tОтношения с Полем Ланжевеном\tРоман с Полем Ланжевеном вызвал публичный скандал и газетную кампанию.\tЛичная жизнь\thigh\tyear\t44\t44\tromance|conflict_duels\tПоль Ланжевен\tпартнёр\t44 года',
    ].join('\n'));

    const repaired = repairBiographyPlan({
      facts,
      plan: {
        subjectName: 'Мария Кюри',
        canvasName: 'Кюри Мария',
        currentAge: 66,
        mainEvents: [
          { age: 44, label: 'В 1910', isDecision: false, sphere: 'family' },
        ],
        branches: [],
      },
    });

    expect(repaired.mainEvents).toHaveLength(1);
    expect(repaired.mainEvents[0]?.label).toBe('Отношения с Полем Ланжевеном');
    expect(repaired.mainEvents[0]?.notes).toContain('Полем Ланжевеном');
    expect(repaired.mainEvents[0]?.notes).toContain('публичный скандал');
  });

  it('подтягивает корректный факт по названию произведения, даже если возраст в draft съехал', () => {
    const facts = parseLineBasedBiographyFactCandidates([
      'FACT\t1879\t51\tpublication\tcreativity\thigh\t«Исповедь»\tОпубликовал произведение «Исповедь», в котором описал духовный кризис.\tТворчество\thigh\tyear\t51\t51\tcreative_work|legacy\t\t\t51 год',
      'FACT\t1873\t45\tpublication\tcreativity\thigh\t«Анна Каренина»\tНачал публикацию романа «Анна Каренина».\tТворчество\thigh\tyear\t45\t45\tcreative_work\t\t\t45 лет',
    ].join('\n'));

    const repaired = repairBiographyPlan({
      facts,
      plan: {
        subjectName: 'Лев Толстой',
        canvasName: 'Толстой Лев',
        currentAge: 82,
        mainEvents: [
          { age: 42, label: 'В своей работе «Исповедь» Толстой писал', isDecision: false, sphere: 'other' },
        ],
        branches: [],
      },
    });

    expect(repaired.mainEvents[0]?.label).toBe('«Исповедь»');
    expect(repaired.mainEvents[0]?.notes).toContain('духовный кризис');
  });
});

describe('cleanGenericEventLabels (MP-8)', () => {
  it('заменяет generic label на конкретный из факта, не drop\'ая single-event ветки', () => {
    const facts = parseLineBasedBiographyFactCandidates(
      [
        'FACT\t1820\t21\teducation\teducation\thigh\tЮжная ссылка\tСослан на юг России за вольнодумные стихи.\tСсылка\thigh\tyear\t21\t21\ttravel_moves_exile\t\t\t21 год',
      ].join('\n')
    );

    const cleaned = cleanGenericEventLabels({
      facts,
      plan: {
        subjectName: 'Test',
        canvasName: 'Test',
        currentAge: 30,
        mainEvents: [
          // Generic placeholder that the legacy fallback might emit:
          { age: 21, label: 'Ссылка', isDecision: false, sphere: 'education' },
        ],
        branches: [
          {
            label: 'travel_moves_exile',
            sphere: 'place',
            sourceMainEventIndex: 0,
            // Single-event sparse theme branch — must NOT be dropped (MP-8b contract).
            events: [{ age: 21, label: 'Ссылка', isDecision: false, sphere: 'place' }],
          },
        ],
      },
    });

    expect(cleaned.mainEvents).toHaveLength(1);
    expect(cleaned.mainEvents[0]?.label).not.toBe('Ссылка');
    expect(cleaned.mainEvents[0]?.label).toContain('Южная');

    expect(cleaned.branches).toHaveLength(1);
    expect(cleaned.branches[0].events).toHaveLength(1);
    expect(cleaned.branches[0].events[0].label).not.toBe('Ссылка');
  });

  it('оставляет нейтральный план без изменений', () => {
    const cleaned = cleanGenericEventLabels({
      facts: [],
      plan: {
        subjectName: 'Test',
        canvasName: 'Test',
        currentAge: 50,
        mainEvents: [
          { age: 30, label: 'Защита диссертации', isDecision: true, sphere: 'education' },
        ],
        branches: [],
      },
    });

    expect(cleaned.mainEvents[0]?.label).toBe('Защита диссертации');
  });
});
