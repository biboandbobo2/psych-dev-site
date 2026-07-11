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
