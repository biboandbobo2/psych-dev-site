import { describe, expect, it } from 'vitest';
import { buildTimelineDataFromBiographyPlan } from '../../server/api/timelineBiographyQuality.js';
import type { BiographyTimelinePlan } from '../../server/api/timelineBiographyTypes.js';
import { referentialViolations, duplicateIds } from '../../src/pages/timeline/utils/__tests__/graphGen';

function makePlan(overrides: Partial<BiographyTimelinePlan> = {}): BiographyTimelinePlan {
  return {
    subjectName: 'Тест',
    canvasName: 'Тест',
    currentAge: 80,
    selectedPeriodization: 'erikson',
    birthDetails: { date: '1900' },
    mainEvents: [
      { age: 20, label: 'Учёба', notes: 'Поступил в университет', sphere: 'education', isDecision: true },
      { age: 40, label: 'Кафедра', notes: 'Возглавил кафедру', sphere: 'career', isDecision: false },
      { age: 79, label: 'Смерть', notes: 'Скончался', sphere: 'health', isDecision: false },
    ],
    branches: [],
    ...overrides,
  };
}

describe('buildTimelineDataFromBiographyPlan — структурные инварианты (I13)', () => {
  // Д-B1: два события одного возраста на ветке порождают spur-edge с
  // nodeId = crypto.randomUUID(), не указывающим ни на один node.
  // normalizeImportedTimelineData молча дропает такой edge при следующей
  // загрузке — pipeline не имеет права полагаться на это «лечение».
  it('spur-события одного возраста не создают edge с несуществующим nodeId', () => {
    const plan = makePlan({
      branches: [
        {
          label: 'Научная работа',
          sphere: 'career',
          sourceMainEventIndex: 0,
          events: [
            { age: 25, label: 'Первая статья', notes: 'Публикация', sphere: 'career', isDecision: false },
            { age: 30, label: 'Доклад', notes: 'Доклад на съезде', sphere: 'career', isDecision: false },
            { age: 30, label: 'Монография', notes: 'Вышла монография', sphere: 'career', isDecision: false },
          ],
        },
      ],
    });

    const timeline = buildTimelineDataFromBiographyPlan(plan);

    // Spur-событие должно присутствовать
    expect(timeline.nodes.map((n) => n.label)).toContain('Монография');
    // и не ломать ссылочную целостность
    expect(referentialViolations(timeline as never)).toEqual([]);
    expect(duplicateIds(timeline.edges)).toEqual([]);
  });

  it('каждое событие ветки лежит в возрастном окне своей ветки (I12)', () => {
    const plan = makePlan({
      branches: [
        {
          label: 'Ветка',
          sphere: 'career',
          sourceMainEventIndex: 0,
          events: [
            { age: 25, label: 'Событие А', notes: 'а', sphere: 'career', isDecision: false },
            { age: 30, label: 'Событие Б', notes: 'б', sphere: 'career', isDecision: false },
            { age: 30, label: 'Событие В (spur)', notes: 'в', sphere: 'career', isDecision: false },
          ],
        },
      ],
    });

    const timeline = buildTimelineDataFromBiographyPlan(plan);
    const edgeByX = new Map(timeline.edges.map((e) => [e.x, e]));

    for (const node of timeline.nodes) {
      if (node.parentX === undefined || node.parentX === 2000) continue;
      const edge = edgeByX.get(node.parentX);
      expect(edge, `node "${node.label}" ссылается на ветку x=${node.parentX}`).toBeDefined();
      expect(node.age).toBeGreaterThanOrEqual(edge!.startAge);
      expect(node.age).toBeLessThanOrEqual(edge!.endAge);
    }
  });
});

// Д-B4 (интеграционно): spur-ветка (второе событие того же возраста) занимает
// x, о котором pickBranchX не знает — следующая ветка той же сферы может
// сесть на x спура с пересекающимся окном.
describe('buildTimelineDataFromBiographyPlan — уникальность x веток', () => {
  it('spur-ветка и обычная ветка не делят один x при пересекающихся окнах', () => {
    const plan = makePlan({
      branches: [
        {
          label: 'Карьера А',
          sphere: 'career',
          sourceMainEventIndex: 0,
          events: [
            { age: 30, label: 'Событие 1', notes: 'а', sphere: 'career', isDecision: false },
            { age: 30, label: 'Событие 2 (spur)', notes: 'б', sphere: 'career', isDecision: false },
          ],
        },
        {
          label: 'Карьера Б',
          sphere: 'career',
          sourceMainEventIndex: 0,
          events: [
            { age: 25, label: 'Событие 3', notes: 'в', sphere: 'career', isDecision: false },
            { age: 35, label: 'Событие 4', notes: 'г', sphere: 'career', isDecision: false },
          ],
        },
        {
          label: 'Карьера В',
          sphere: 'career',
          sourceMainEventIndex: 0,
          events: [
            { age: 26, label: 'Событие 5', notes: 'д', sphere: 'career', isDecision: false },
            { age: 34, label: 'Событие 6', notes: 'е', sphere: 'career', isDecision: false },
          ],
        },
      ],
    });

    const timeline = buildTimelineDataFromBiographyPlan(plan);
    const xs = timeline.edges.map((e) => e.x);
    expect(new Set(xs).size, `edge x: ${xs.join(', ')}`).toBe(xs.length);
  });
});

// Д-B7 (найден baseline-бенчмарком, lazursky): pickBranchX переиспользует
// один x для веток с непересекающимися окнами («лейн-шеринг»), но
// buildTimelineTree и normalizeImportedTimelineData определяют принадлежность
// события ТОЛЬКО по x — при первой же загрузке все события обеих веток
// достаются одной из них, а её окно «лечится» расширением (normalizeEdits>0).
// Wire-формат не позволяет двум веткам делить x — даже с разными окнами.
describe('buildTimelineDataFromBiographyPlan — лейн-шеринг запрещён (Д-B7)', () => {
  // TODO(Д-B7): перевести в обычный it() при применении фикса pickBranchX —
  // фикс отложен до завершения baseline-прогона (код замера заморожен).
  it.fails('две ветки одной сферы с непересекающимися окнами получают разные x', () => {
    const plan = makePlan({
      branches: [
        {
          label: 'Ранний период',
          sphere: 'career',
          sourceMainEventIndex: 0,
          events: [
            { age: 22, label: 'Событие А', notes: 'а', sphere: 'career', isDecision: false },
            { age: 25, label: 'Событие Б', notes: 'б', sphere: 'career', isDecision: false },
          ],
        },
        {
          label: 'Поздний период',
          sphere: 'career',
          sourceMainEventIndex: 1,
          events: [
            { age: 45, label: 'Событие В', notes: 'в', sphere: 'career', isDecision: false },
            { age: 50, label: 'Событие Г', notes: 'г', sphere: 'career', isDecision: false },
          ],
        },
      ],
    });

    const timeline = buildTimelineDataFromBiographyPlan(plan);
    const xs = timeline.edges.map((e) => e.x);
    expect(new Set(xs).size, `edge x: ${xs.join(', ')}`).toBe(xs.length);
    // и normalize не должна вносить ни одной правки
    expect(referentialViolations(timeline as never)).toEqual([]);
  });
});
