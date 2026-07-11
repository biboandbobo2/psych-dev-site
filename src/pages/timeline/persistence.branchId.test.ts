/**
 * Фаза 1 branchId (docs/plans/timeline-branch-id-rfc.md): нормализация
 * досеивает node.branchId из детерминированного дерева, если поля нет, и
 * уважает уже заданный branchId (чтение по ссылке, а не по координате).
 * Поведение отрисовки (x/parentX) не меняется — это отдельно проверяют
 * I4/I9-инварианты в persistence.invariants.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { normalizeImportedTimelineData } from './persistence';
import type { TimelineData } from './types';
import { buildTimelineTree, findParentBranch } from './utils/timelineTree';
import { g, genTimeline, type FlatGraph } from './utils/__tests__/graphGen';

function asTimelineData(flat: FlatGraph, extra: Partial<TimelineData> = {}): TimelineData {
  return {
    currentAge: 30,
    ageMax: 100,
    nodes: flat.nodes,
    edges: flat.edges,
    birthDetails: {},
    selectedPeriodization: null,
    ...extra,
  };
}

const SEEDS = Array.from({ length: 60 }, (_, i) => i + 1);

describe('branchId: досев из дерева на загрузке (legacy-документы)', () => {
  it('каждый node получает branchId, равный id ветки-родителя по дереву (undefined для главной линии)', () => {
    for (const seed of SEEDS) {
      const flat = genTimeline(seed, { sharedXChance: 0.4, emptyBranchChance: 0.3, brokenParentXCount: 2 });
      const normalized = normalizeImportedTimelineData(asTimelineData(flat));
      // Дерево строим по нормализованному выходу — членство совпадает с тем,
      // из которого досеивался branchId (оконное лечение членство не меняет).
      const tree = buildTimelineTree(normalized.nodes, normalized.edges);
      for (const node of normalized.nodes) {
        const branch = findParentBranch(tree, node.id);
        expect(node.branchId, `seed=${seed} node=${node.id}`).toBe(branch ? branch.id : undefined);
      }
    }
  });

  it('branchId консистентен с parentX: если задан — ветка с таким id существует и её x равен parentX', () => {
    let checked = 0;
    for (const seed of SEEDS) {
      const flat = genTimeline(seed, { sharedXChance: 0.5 });
      const normalized = normalizeImportedTimelineData(asTimelineData(flat));
      const edgeById = new Map(normalized.edges.map((e) => [e.id, e]));
      for (const node of normalized.nodes) {
        if (node.branchId === undefined) continue;
        checked += 1;
        const edge = edgeById.get(node.branchId);
        expect(edge, `seed=${seed} node=${node.id} branchId=${node.branchId}`).toBeDefined();
        expect(node.parentX, `seed=${seed} node=${node.id}`).toBe(edge!.x);
      }
    }
    // Не даём тесту стать вакуумно-истинным: досев обязан был что-то проставить.
    expect(checked).toBeGreaterThan(0);
  });

  it('легаси-документ с реальной веткой обогащается branchId без изменения отрисовки', () => {
    const flat = g()
      .root('r', 0)
      .branch('e1', 'r', { x: 2100, startAge: 0, endAge: 20 })
      .event('n1', 'e1', 10)
      .build();
    // Легаси: branchId нигде не задан.
    expect(flat.nodes.every((n) => n.branchId === undefined)).toBe(true);

    const normalized = normalizeImportedTimelineData(asTimelineData(flat));
    const n1 = normalized.nodes.find((n) => n.id === 'n1')!;
    const root = normalized.nodes.find((n) => n.id === 'r')!;

    expect(n1.branchId).toBe('e1'); // досеяно из дерева
    expect(n1.parentX).toBe(2100); // презентация не тронута
    expect(root.branchId).toBeUndefined(); // главная линия
  });
});

describe('branchId: уважение уже заданного значения (fallback только при отсутствии)', () => {
  it('заданный branchId сохраняется, даже если дерево по координате указало бы иную ветку', () => {
    const flat = g()
      .root('r', 0)
      .branch('e1', 'r', { x: 2100, startAge: 0, endAge: 20 })
      .branch('e2', 'r', { x: 2200, startAge: 0, endAge: 20 })
      .event('n', 'e1', 10) // по координате принадлежит e1 (parentX=2100)
      .build();
    // Документ уже несёт ссылку на e2 — читаем по ссылке, не по координате.
    flat.nodes.find((n) => n.id === 'n')!.branchId = 'e2';

    const normalized = normalizeImportedTimelineData(asTimelineData(flat));
    const n = normalized.nodes.find((n) => n.id === 'n')!;

    expect(n.branchId).toBe('e2'); // существующая ссылка не переписана досевом
  });
});

describe('branchId: идемпотентность досева (I4)', () => {
  it('повторная нормализация не меняет branchId', () => {
    let sawBranchId = false;
    for (const seed of SEEDS) {
      const flat = genTimeline(seed, { sharedXChance: 0.4, brokenParentXCount: 1 });
      const once = normalizeImportedTimelineData(asTimelineData(flat));
      const twice = normalizeImportedTimelineData(once);
      const onceById = new Map(once.nodes.map((n) => [n.id, n.branchId]));
      if (once.nodes.some((n) => n.branchId !== undefined)) sawBranchId = true;
      for (const node of twice.nodes) {
        expect(node.branchId, `seed=${seed} node=${node.id}`).toBe(onceById.get(node.id));
      }
    }
    // Не вакуум: хотя бы часть прогонов реально несла досеянный branchId.
    expect(sawBranchId).toBe(true);
  });
});

describe('фаза 2: лечение ссылки на загрузке', () => {
  it('висячий branchId (ветки с таким id нет) снимается, узел лечится координатно', () => {
    const flat = g()
      .root('r', 0)
      .branch('e1', 'r', { x: 2100, startAge: 0, endAge: 20 })
      .event('n1', 'e1', 10, { branchId: 'ghost-edge' })
      .build();
    const normalized = normalizeImportedTimelineData(asTimelineData(flat));
    const n1 = normalized.nodes.find((n) => n.id === 'n1')!;
    // Координата валидна (parentX=2100 → e1) → после снятия висячей ссылки
    // узел досеивается ссылкой на реальную ветку.
    expect(n1.branchId).toBe('e1');
    expect(n1.parentX).toBe(2100);
  });

  it('висячий branchId + битая координата → главная линия (B5), без ссылки', () => {
    const flat = g()
      .root('r', 0)
      .build();
    flat.nodes.push({
      id: 'lost',
      age: 5,
      x: 3333,
      parentX: 3333,
      branchId: 'ghost-edge',
      label: 'lost',
      isDecision: false,
    });
    const normalized = normalizeImportedTimelineData(asTimelineData(flat));
    const lost = normalized.nodes.find((n) => n.id === 'lost')!;
    expect(lost.branchId).toBeUndefined();
    expect(lost.parentX).toBeUndefined();
  });

  it('валидный branchId с разъехавшимся parentX: презентация подтягивается к ветке (смещение сохраняется)', () => {
    const flat = g()
      .root('r', 0)
      .branch('e1', 'r', { x: 2100, startAge: 0, endAge: 20 })
      .branch('e2', 'r', { x: 2400, startAge: 0, endAge: 20 })
      .build();
    // Узел ссылается на e2, но координаты остались от e1 (+30 офсет).
    flat.nodes.push({
      id: 'n',
      age: 10,
      x: 2130,
      parentX: 2100,
      branchId: 'e2',
      label: 'n',
      isDecision: false,
    });
    const normalized = normalizeImportedTimelineData(asTimelineData(flat));
    const n = normalized.nodes.find((n2) => n2.id === 'n')!;
    expect(n.branchId).toBe('e2');
    expect(n.parentX).toBe(2400);
    expect(n.x).toBe(2430); // офсет +30 сохранён
  });

  it('лечение идемпотентно (I4): второй проход ничего не меняет', () => {
    const flat = g()
      .root('r', 0)
      .branch('e1', 'r', { x: 2100, startAge: 0, endAge: 20 })
      .branch('e2', 'r', { x: 2400, startAge: 0, endAge: 20 })
      .event('ok', 'e1', 5)
      .build();
    flat.nodes.push(
      { id: 'mismatch', age: 10, x: 2130, parentX: 2100, branchId: 'e2', label: 'm', isDecision: false },
      { id: 'dangling', age: 15, x: 2100, parentX: 2100, branchId: 'ghost', label: 'd', isDecision: false }
    );
    const once = normalizeImportedTimelineData(asTimelineData(flat));
    const twice = normalizeImportedTimelineData(once);
    expect(JSON.stringify(twice)).toBe(JSON.stringify(once));
  });

  it('членство операций совпадает со ссылкой даже при shared-x (Д5 в normalize-контуре)', () => {
    const flat = g({ branchIds: true })
      .root('o1', 10)
      .root('o2', 20)
      .branch('A', 'o1', { x: 2100, startAge: 10, endAge: 30 })
      .branch('B', 'o2', { x: 2100, startAge: 20, endAge: 40 })
      .event('ev', 'B', 25)
      .build();
    const normalized = normalizeImportedTimelineData(asTimelineData(flat));
    const tree = buildTimelineTree(normalized.nodes, normalized.edges);
    expect(findParentBranch(tree, 'ev')?.id).toBe('B');
  });
});
