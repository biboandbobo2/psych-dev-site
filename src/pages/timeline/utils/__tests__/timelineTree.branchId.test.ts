/**
 * Фаза 2 branchId (docs/plans/timeline-branch-id-rfc.md): членство события
 * в ветке определяется ССЫЛКОЙ node.branchId === edge.id; координата
 * parentX === edge.x остаётся fallback'ом для legacy-узлов без ссылки.
 *
 * Именно эти тесты закрывают класс Д5: при shared-x ветках членство
 * больше не зависит от порядка обхода — drag/delete не трогают чужие
 * события. Legacy-вариант (без branchId) остаётся документированным
 * ограничением в timelineTree.invariants.test.ts (it.fails).
 */
import { describe, expect, it } from 'vitest';
import {
  applyBranchDeletionToFlat,
  applyDragToTree,
  buildTimelineTree,
  collectDescendantIds,
  findParentBranch,
  flattenTree,
} from '../timelineTree';
import { g, genTimeline } from './graphGen';

/** Две ветки разных родителей на ОДНОМ x; событие ev принадлежит B по ссылке. */
function sharedXWithRefs() {
  return g({ branchIds: true })
    .root('o1', 10)
    .root('o2', 20)
    .branch('A', 'o1', { x: 2100, startAge: 10, endAge: 30 })
    .branch('B', 'o2', { x: 2100, startAge: 20, endAge: 40 })
    .event('ev', 'B', 25)
    .build();
}

describe('членство по ссылке: shared-x ветки различимы (Д5 закрыт для branchId-данных)', () => {
  it('дерево отдаёт событие ветке из branchId, а не первой встреченной по координате', () => {
    const flat = sharedXWithRefs();
    const tree = buildTimelineTree(flat.nodes, flat.edges);
    expect(findParentBranch(tree, 'ev')?.id).toBe('B');
  });

  it('Д5-drag: drag origin ветки A не переписывает parentX события ветки B', () => {
    const flat = sharedXWithRefs();
    const tree = buildTimelineTree(flat.nodes, flat.edges);
    const out = flattenTree(applyDragToTree(tree, 'o1', 2030, 30));
    expect(out.nodes.find((n) => n.id === 'ev')!.parentX).toBe(2100);
  });

  it('Д5-delete: поддерево origin ветки A не содержит событие ветки B', () => {
    const flat = sharedXWithRefs();
    const tree = buildTimelineTree(flat.nodes, flat.edges);
    const collected = collectDescendantIds(tree, 'o1')!;
    expect(collected.eventIds.has('ev')).toBe(false);
    expect(collected.edgeIds.has('A')).toBe(true);
    expect(collected.edgeIds.has('B')).toBe(false);
  });

  it('branchId сильнее координаты: parentX указывает на x ветки A, ссылка — на B', () => {
    const flat = g({ branchIds: true })
      .root('o1', 10)
      .root('o2', 20)
      .branch('A', 'o1', { x: 2100, startAge: 10, endAge: 30 })
      .branch('B', 'o2', { x: 2200, startAge: 20, endAge: 40 })
      .event('ev', 'A', 25, { branchId: 'B' }) // координата от A, ссылка на B
      .build();
    const tree = buildTimelineTree(flat.nodes, flat.edges);
    expect(findParentBranch(tree, 'ev')?.id).toBe('B');
  });
});

describe('устойчивость к битой ссылке (дерево не теряет данные)', () => {
  it('висячий branchId (ветки нет) → координатный fallback', () => {
    const flat = g()
      .root('o1', 10)
      .branch('A', 'o1', { x: 2100, startAge: 10, endAge: 30 })
      .event('ev', 'A', 15, { branchId: 'no-such-edge' })
      .build();
    const tree = buildTimelineTree(flat.nodes, flat.edges);
    expect(findParentBranch(tree, 'ev')?.id).toBe('A');
  });

  it('ветка недостижима (origin удалён) → её события всплывают корнями, flatten без потерь', () => {
    const flat = g({ branchIds: true })
      .root('o1', 10)
      .branch('A', 'o1', { x: 2100, startAge: 10, endAge: 30 })
      .event('ev', 'A', 15)
      .build();
    // Повреждение: origin исчез, edge A держится за несуществующий узел.
    const nodes = flat.nodes.filter((n) => n.id !== 'o1');
    const tree = buildTimelineTree(nodes, flat.edges);
    const out = flattenTree(tree);
    expect(out.nodes.map((n) => n.id)).toContain('ev');
    expect(out.nodes).toHaveLength(nodes.length);
  });
});

describe('I1+I3 на смешанных графах (часть узлов со ссылкой, часть legacy)', () => {
  const SEEDS = Array.from({ length: 60 }, (_, i) => i + 1);

  it('flatten(buildTree(x)) не теряет и не дублирует узлы/ветки', () => {
    for (const seed of SEEDS) {
      const flat = genTimeline(seed, {
        sharedXChance: 0.4,
        emptyBranchChance: 0.3,
        brokenParentXCount: 2,
        branchIdChance: 0.5,
      });
      const out = flattenTree(buildTimelineTree(flat.nodes, flat.edges));
      expect(out.nodes, `seed=${seed} nodes`).toHaveLength(flat.nodes.length);
      expect(new Set(out.nodes.map((n) => n.id)).size, `seed=${seed} nodeIds`).toBe(flat.nodes.length);
      expect(new Set(out.edges.map((e) => e.id)).size, `seed=${seed} edgeIds`).toBe(flat.edges.length);
    }
  });

  it('узел со ссылкой всегда оказывается на своей ветке, независимо от shared-x', () => {
    let checked = 0;
    for (const seed of SEEDS) {
      const flat = genTimeline(seed, { sharedXChance: 0.6, branchIdChance: 1 });
      const tree = buildTimelineTree(flat.nodes, flat.edges);
      for (const node of flat.nodes) {
        if (node.branchId === undefined) continue;
        checked += 1;
        expect(findParentBranch(tree, node.id)?.id, `seed=${seed} node=${node.id}`).toBe(node.branchId);
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});

describe('операции сохраняют/проставляют ссылку', () => {
  it('drag не меняет branchId (drag — чистая презентация)', () => {
    const flat = g({ branchIds: true })
      .root('o1', 10)
      .branch('A', 'o1', { x: 2100, startAge: 10, endAge: 30 })
      .event('ev', 'A', 15)
      .build();
    const tree = buildTimelineTree(flat.nodes, flat.edges);
    const out = flattenTree(applyDragToTree(tree, 'o1', 2050, 50));
    expect(out.nodes.find((n) => n.id === 'ev')!.branchId).toBe('A');
  });

  it('удаление ветки: мигранты на родительскую линию получают branchId линии origin', () => {
    // origin живёт на ветке P; удаляем его ветку A — события A мигрируют
    // на P и обязаны получить branchId=P (не остаться со ссылкой на мёртвую A).
    const flat = g({ branchIds: true })
      .root('r', 5)
      .branch('P', 'r', { x: 2100, startAge: 5, endAge: 40 })
      .event('origin', 'P', 10)
      .branch('A', 'origin', { x: 2200, startAge: 10, endAge: 30 })
      .event('ev', 'A', 15)
      .build();
    const out = applyBranchDeletionToFlat(flat.nodes, flat.edges, 'A');
    const ev = out.nodes.find((n) => n.id === 'ev')!;
    expect(ev.branchId).toBe('P');
    expect(out.edges.some((e) => e.id === 'A')).toBe(false);
  });

  it('удаление ветки: мигрант на главную линию остаётся без branchId', () => {
    const flat = g({ branchIds: true })
      .root('origin', 10)
      .branch('A', 'origin', { x: 2100, startAge: 10, endAge: 30 })
      .event('ev', 'A', 15)
      .build();
    const out = applyBranchDeletionToFlat(flat.nodes, flat.edges, 'A');
    expect(out.nodes.find((n) => n.id === 'ev')!.branchId).toBeUndefined();
  });

  it('удаление ветки: событие внучатой ветки сохраняет ссылку на СВОЮ (выжившую) ветку', () => {
    const flat = g({ branchIds: true })
      .root('r', 5)
      .branch('A', 'r', { x: 2100, startAge: 5, endAge: 40 })
      .event('mid', 'A', 10)
      .branch('G', 'mid', { x: 2200, startAge: 10, endAge: 30 })
      .event('deep', 'G', 15)
      .build();
    const out = applyBranchDeletionToFlat(flat.nodes, flat.edges, 'A');
    expect(out.nodes.find((n) => n.id === 'deep')!.branchId).toBe('G');
    expect(out.edges.some((e) => e.id === 'G')).toBe(true);
  });
});
