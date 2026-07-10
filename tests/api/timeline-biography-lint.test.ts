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

// Д-B8: repairEventPlan безусловно заменял notes события на evidence
// fuzzy-подобранного факта. Для JSON-фактов pipeline (age=undefined)
// возрастной индекс пуст, кандидаты подбираются по токенам ≥5 символов —
// фамилия субъекта есть почти в каждом факте, и notes события затирались
// evidence чужого факта (у Фрейда 6 событий получили notes о браке).
describe('cleanGenericEventLabels — свой факт важнее fuzzy-подбора (Д-B8)', () => {
  const jsonFact = (details: string, overrides: Record<string, unknown> = {}) => ({
    year: 1880,
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
    ...overrides,
  });

  it('не подменяет notes события evidence чужого факта', () => {
    const ownDetails = 'Фрейд получил степень доктора медицины в Венском университете.';
    const foreignDetails = 'Фрейд женился на своей возлюбленной Марте Бернайс.';
    const facts = [
      jsonFact(foreignDetails, { importance: 'high', labelHint: 'Брак с Мартой Бернайс', category: 'family' }),
      jsonFact(ownDetails, { importance: 'low' }),
    ];

    const cleaned = cleanGenericEventLabels({
      facts,
      plan: {
        subjectName: 'Зигмунд Фрейд',
        canvasName: 'Фрейд',
        currentAge: 83,
        selectedPeriodization: 'erikson',
        birthDetails: {},
        mainEvents: [
          {
            age: 25,
            label: 'Доктор медицины',
            notes: ownDetails,
            sphere: 'education',
            isDecision: false,
          },
        ],
        branches: [],
      },
    });

    expect(cleaned.mainEvents[0].notes).toContain('доктора медицины');
    expect(cleaned.mainEvents[0].notes).not.toContain('Марте Бернайс');
  });
});

// Д-B9: too-few-early-life-events смотрел только на главную линию, но
// composition сознательно кладёт на неё лишь поворотные точки — события
// ранней жизни живут в ветках и должны засчитываться.
describe('lintBiographyPlan — ранняя жизнь в ветках засчитывается (Д-B9)', () => {
  it('не ругается, когда события до 18 лет лежат в ветках', () => {
    const event = (age: number, label: string) => ({
      age,
      label,
      notes: `${label} — подробности`,
      sphere: 'education' as const,
      isDecision: false,
    });
    const issues = lintBiographyPlan({
      subjectName: 'Тест',
      canvasName: 'Тест',
      currentAge: 80,
      selectedPeriodization: 'erikson',
      birthDetails: {},
      mainEvents: [
        event(20, 'Университет'),
        event(30, 'Кафедра'),
        event(40, 'Признание'),
        event(50, 'Премия'),
        event(60, 'Институт'),
        event(79, 'Смерть'),
      ],
      branches: [
        {
          label: 'Детство и учёба',
          sphere: 'education',
          sourceMainEventIndex: 0,
          events: [event(7, 'Гимназия'), event(12, 'Первые опыты'), event(16, 'Окончание гимназии')],
        },
      ],
    });

    expect(issues.filter((i) => i.code === 'too-few-early-life-events')).toEqual([]);
  });
});

// Д-B11 (lint-половина, finding F1b verifier'а): составные «…Также: …»
// заметки от mergeSameAgeEvents не имеют одного факта-источника — репейр
// затирал их текстом одного факта, стирая содержимое склеенных событий.
describe('cleanGenericEventLabels — склеенные заметки не затираются', () => {
  it('notes с «. Также: » сохраняются как есть', () => {
    const details = 'Основал первую лабораторию психологических исследований.';
    const merged = `${details}. Также: Нанял ассистента; Заказал оборудование.`;
    const cleaned = cleanGenericEventLabels({
      facts: [{
        year: 1879, age: undefined, sphere: 'career' as const, category: 'career',
        eventType: 'career' as never, labelHint: details, details, evidence: details,
        importance: 'high' as const, confidence: 'medium' as const, source: 'model' as const,
      }],
      plan: {
        subjectName: 'Вундт', canvasName: 'Вундт', currentAge: 88,
        selectedPeriodization: 'erikson', birthDetails: {},
        mainEvents: [{ age: 47, label: 'Основание лаборатории', notes: merged, sphere: 'career', isDecision: true }],
        branches: [],
      },
    });
    expect(cleaned.mainEvents[0].notes).toBe(merged);
  });
});
