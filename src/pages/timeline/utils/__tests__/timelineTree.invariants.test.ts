/**
 * Property-style тесты инвариантов Timeline-дерева
 * (I1–I3, I5–I8 из docs/plans/timeline-invariant-audit.md).
 *
 * Графы генерируются детерминированно (graphGen.ts, фиксированные seed),
 * поэтому падение всегда воспроизводимо: seed входит в текст ассерта.
 */
import { describe, expect, it } from 'vitest';
import {
  applyBranchDeletionToFlat,
  applyDragToTree,
  buildTimelineTree,
  collectDescendantIds,
  flattenTree,
} from '../timelineTree';
import { LINE_X_POSITION } from '../../constants';
import {
  ageById,
  canonical,
  duplicateIds,
  g,
  genTimeline,
  mulberry32,
  randInt,
  referentialViolations,
  type FlatGraph,
} from './graphGen';

const SEEDS = Array.from({ length: 120 }, (_, i) => i + 1);

const roundTrip = (flat: FlatGraph) => flattenTree(buildTimelineTree(flat.nodes, flat.edges));

describe('graphGen: генератор детерминирован', () => {
  it('одинаковый seed даёт одинаковый граф', () => {
    expect(genTimeline(42, { sharedXChance: 0.3, brokenParentXCount: 1 })).toEqual(
      genTimeline(42, { sharedXChance: 0.3, brokenParentXCount: 1 })
    );
  });

  it('чистые графы проходят собственную проверку целостности', () => {
    for (const seed of SEEDS) {
      const flat = genTimeline(seed);
      expect(referentialViolations(flat), `seed=${seed}`).toEqual([]);
      expect(duplicateIds(flat.nodes), `seed=${seed}`).toEqual([]);
      expect(duplicateIds(flat.edges), `seed=${seed}`).toEqual([]);
    }
  });
});

describe('I1+I3: flatten(buildTree(x)) не теряет и не дублирует', () => {
  it('на чистых графах round-trip сохраняет данные с точностью до порядка', () => {
    for (const seed of SEEDS) {
      const flat = genTimeline(seed);
      const out = roundTrip(flat);
      expect(canonical(out), `seed=${seed}`).toBe(canonical(flat));
    }
  });

  it('на графах c shared-x и битыми parentX round-trip сохраняет ВСЕ данные (nodes и edges)', () => {
    for (const seed of SEEDS) {
      const flat = genTimeline(seed, { sharedXChance: 0.4, brokenParentXCount: 2 });
      const out = roundTrip(flat);
      expect(duplicateIds(out.nodes), `seed=${seed}`).toEqual([]);
      // Полное каноническое равенство: и события, и ветки, и все поля.
      expect(canonical(out), `seed=${seed}`).toBe(canonical(flat));
    }
  });

  it('I3-fixed-point: повторный round-trip — тождество (нет дрейфа при drag)', () => {
    for (const seed of SEEDS) {
      const flat = genTimeline(seed, { sharedXChance: 0.4, brokenParentXCount: 2 });
      const once = roundTrip(flat);
      const twice = roundTrip(once);
      expect(canonical(twice), `seed=${seed}`).toBe(canonical(once));
    }
  });
});

describe('I7: drag сохраняет семантику данных', () => {
  it('drag не меняет age, id и ссылочную целостность (чистые графы)', () => {
    for (const seed of SEEDS) {
      const flat = genTimeline(seed);
      const rng = mulberry32(seed * 7919);
      const dragged = flat.nodes[randInt(rng, 0, flat.nodes.length - 1)];
      const deltaX = randInt(rng, -300, 300);
      const newSelfX = (dragged.x ?? LINE_X_POSITION) + deltaX;

      const tree = buildTimelineTree(flat.nodes, flat.edges);
      const out = flattenTree(applyDragToTree(tree, dragged.id, newSelfX, deltaX));

      expect(ageById(out), `seed=${seed}`).toEqual(ageById(flat));
      expect(new Set(out.nodes.map((n) => n.id)), `seed=${seed}`).toEqual(
        new Set(flat.nodes.map((n) => n.id))
      );
      expect(new Set(out.edges.map((e) => e.id)), `seed=${seed}`).toEqual(
        new Set(flat.edges.map((e) => e.id))
      );
      expect(referentialViolations(out), `seed=${seed}`).toEqual([]);
    }
  });

  it('drag не трогает узлы и ветки вне поддерева (чистые графы)', () => {
    for (const seed of SEEDS) {
      const flat = genTimeline(seed);
      const rng = mulberry32(seed * 104729);
      const dragged = flat.nodes[randInt(rng, 0, flat.nodes.length - 1)];
      const deltaX = 37;

      const tree = buildTimelineTree(flat.nodes, flat.edges);
      const inSubtree = collectDescendantIds(tree, dragged.id)!;
      const out = flattenTree(applyDragToTree(tree, dragged.id, (dragged.x ?? LINE_X_POSITION) + deltaX, deltaX));

      const outNodes = new Map(out.nodes.map((n) => [n.id, n]));
      const outEdges = new Map(out.edges.map((e) => [e.id, e]));
      for (const node of flat.nodes) {
        if (inSubtree.eventIds.has(node.id)) continue;
        expect(outNodes.get(node.id), `seed=${seed}, node=${node.id}`).toEqual(node);
      }
      for (const edge of flat.edges) {
        if (inSubtree.edgeIds.has(edge.id)) continue;
        expect(outEdges.get(edge.id), `seed=${seed}, edge=${edge.id}`).toEqual(edge);
      }
    }
  });

  it('drag на повреждённых графах (shared-x, битые parentX) не теряет id, age и не плодит дубли', () => {
    for (const seed of SEEDS) {
      const flat = genTimeline(seed, { sharedXChance: 0.4, brokenParentXCount: 2 });
      const rng = mulberry32(seed * 31337);
      const dragged = flat.nodes[randInt(rng, 0, flat.nodes.length - 1)];
      const deltaX = randInt(rng, -300, 300);

      const tree = buildTimelineTree(flat.nodes, flat.edges);
      const out = flattenTree(
        applyDragToTree(tree, dragged.id, (dragged.x ?? LINE_X_POSITION) + deltaX, deltaX)
      );

      expect(duplicateIds(out.nodes), `seed=${seed}`).toEqual([]);
      expect(ageById(out), `seed=${seed}`).toEqual(ageById(flat));
      expect(new Set(out.nodes.map((n) => n.id)), `seed=${seed}`).toEqual(
        new Set(flat.nodes.map((n) => n.id))
      );
      expect(new Set(out.edges.map((e) => e.id)), `seed=${seed}`).toEqual(
        new Set(flat.edges.map((e) => e.id))
      );
    }
  });

  it('многократный мелкий drag эквивалентен одному большому (нет накопления ошибок)', () => {
    for (const seed of SEEDS.slice(0, 40)) {
      const flat = genTimeline(seed);
      const dragged = flat.nodes[0];
      const startX = dragged.x ?? LINE_X_POSITION;

      // 10 шагов по +5, как mousemove: каждый шаг — build → drag → flatten.
      let state = flat;
      for (let step = 1; step <= 10; step++) {
        const tree = buildTimelineTree(state.nodes, state.edges);
        state = flattenTree(applyDragToTree(tree, dragged.id, startX + step * 5, 5));
      }

      const oneShot = flattenTree(
        applyDragToTree(buildTimelineTree(flat.nodes, flat.edges), dragged.id, startX + 50, 50)
      );
      expect(canonical(state), `seed=${seed}`).toBe(canonical(oneShot));
    }
  });
});

describe('I6: удаление события удаляет ровно его поддерево', () => {
  it('после удаления собранных id не остаётся висячих ссылок (чистые графы)', () => {
    for (const seed of SEEDS) {
      const flat = genTimeline(seed);
      for (const node of flat.nodes) {
        const tree = buildTimelineTree(flat.nodes, flat.edges);
        const collected = collectDescendantIds(tree, node.id)!;
        const remaining: FlatGraph = {
          nodes: flat.nodes.filter((n) => !collected.eventIds.has(n.id)),
          edges: flat.edges.filter((e) => !collected.edgeIds.has(e.id)),
        };
        expect(referentialViolations(remaining), `seed=${seed}, delete=${node.id}`).toEqual([]);
      }
    }
  });

  it('на повреждённых графах удаление не добавляет НОВЫХ висячих ссылок', () => {
    for (const seed of SEEDS.slice(0, 40)) {
      const flat = genTimeline(seed, { sharedXChance: 0.4, brokenParentXCount: 2 });
      const preExisting = new Set(referentialViolations(flat));
      for (const node of flat.nodes) {
        const tree = buildTimelineTree(flat.nodes, flat.edges);
        const collected = collectDescendantIds(tree, node.id)!;
        const remaining: FlatGraph = {
          nodes: flat.nodes.filter((n) => !collected.eventIds.has(n.id)),
          edges: flat.edges.filter((e) => !collected.edgeIds.has(e.id)),
        };
        const fresh = referentialViolations(remaining).filter((v) => !preExisting.has(v));
        expect(fresh, `seed=${seed}, delete=${node.id}`).toEqual([]);
      }
    }
  });
});

describe('I5: удаление ветви', () => {
  it('сохраняет все события, удаляет ровно одну ветку, не рвёт ссылки (чистые графы)', () => {
    for (const seed of SEEDS) {
      const flat = genTimeline(seed);
      for (const edge of flat.edges) {
        const out = applyBranchDeletionToFlat(flat.nodes, flat.edges, edge.id);
        expect(new Set(out.nodes.map((n) => n.id)), `seed=${seed}, edge=${edge.id}`).toEqual(
          new Set(flat.nodes.map((n) => n.id))
        );
        expect(out.edges.map((e) => e.id).sort(), `seed=${seed}, edge=${edge.id}`).toEqual(
          flat.edges.filter((e) => e.id !== edge.id).map((e) => e.id).sort()
        );
        expect(referentialViolations(out), `seed=${seed}, edge=${edge.id}`).toEqual([]);
        // Д6a: на входе x веток уникальны — уникальность не должна теряться.
        expect(new Set(out.edges.map((e) => e.x)).size, `seed=${seed}, edge=${edge.id}`).toBe(
          out.edges.length
        );
      }
    }
  });

  it('на повреждённых графах (shared-x) удаление ветви сохраняет события и не рвёт новые ссылки', () => {
    for (const seed of SEEDS.slice(0, 40)) {
      const flat = genTimeline(seed, { sharedXChance: 0.4 });
      const preExisting = new Set(referentialViolations(flat));
      for (const edge of flat.edges) {
        const out = applyBranchDeletionToFlat(flat.nodes, flat.edges, edge.id);
        expect(new Set(out.nodes.map((n) => n.id)), `seed=${seed}, edge=${edge.id}`).toEqual(
          new Set(flat.nodes.map((n) => n.id))
        );
        expect(duplicateIds(out.nodes), `seed=${seed}, edge=${edge.id}`).toEqual([]);
        const fresh = referentialViolations(out).filter((v) => !preExisting.has(v));
        expect(fresh, `seed=${seed}, edge=${edge.id}`).toEqual([]);
      }
    }
  });

  it('Д6a: мигрированная ветка не занимает x главной линии', () => {
    // b сидит на e1 с offset +100 (x=2200); внучатая e2 (x=2200) при
    // удалении e1 сдвигается на delta = 2000 - 2200 = -200 → ровно на
    // LINE_X_POSITION. Ветка на x главной линии сделала бы свои события
    // «root» при следующем build — walk обязан пропустить 2000.
    const flat = g()
      .root('a', 10)
      .branch('e1', 'a', { x: 2100, startAge: 10, endAge: 30 })
      .event('b', 'e1', 12, { offsetX: 100 })
      .branch('e2', 'b', { x: 2200, startAge: 12, endAge: 25 })
      .event('c', 'e2', 15)
      .build();

    const out = applyBranchDeletionToFlat(flat.nodes, flat.edges, 'e1');
    const e2 = out.edges.find((e) => e.id === 'e2')!;
    expect(e2.x).not.toBe(LINE_X_POSITION);
    // Событие c переанкерено на фактический новый x ветки.
    expect(out.nodes.find((n) => n.id === 'c')!.parentX).toBe(e2.x);
  });

  it('Д6a: миграция внучатой ветки не должна припарковать её на x чужой ветки', () => {
    // a (root) → e1(x=2100) → b (x=2150, offset +50) → e2(x=2200) → c
    // Чужая ветка e3(x=2050) из root2.
    // Удаление e1: b мигрирует на главную линию (delta = 2000 - 2150 = -150),
    // e2 сдвигается на 2200-150 = 2050 → коллизия с e3 → membership
    // событий обеих веток становится неоднозначным (класс Д5).
    const flat = g()
      .root('a', 10)
      .branch('e1', 'a', { x: 2100, startAge: 10, endAge: 30 })
      .event('b', 'e1', 12, { offsetX: 50 })
      .branch('e2', 'b', { x: 2200, startAge: 12, endAge: 25 })
      .event('c', 'e2', 15)
      .root('root2', 40)
      .branch('e3', 'root2', { x: 2050, startAge: 40, endAge: 50 })
      .build();

    const out = applyBranchDeletionToFlat(flat.nodes, flat.edges, 'e1');
    const e2 = out.edges.find((e) => e.id === 'e2')!;
    const e3 = out.edges.find((e) => e.id === 'e3')!;
    expect(e2.x).not.toBe(e3.x);
  });
});

describe('I2+I8: совпадение x разных ветвей (документированные ограничения)', () => {
  // Плоский формат кодирует принадлежность события ветке через
  // node.parentX === edge.x. Если две ветки разных родителей делят x,
  // принадлежность ПРИНЦИПИАЛЬНО неразличима: дерево детерминированно
  // отдаёт события первой встреченной ветке (защита от дублей — I1),
  // но «намерение пользователя» восстановить нельзя без смены wire
  // format (id-ссылка вместо координаты) — вне scope этого аудита.
  // it.fails фиксирует ограничение: если тест внезапно пройдёт,
  // значит поведение изменилось и доку/план надо пересмотреть.
  function sharedXFixture() {
    // ev создан на ветке B (второй по порядку обхода), но x обеих веток = 2100.
    return g()
      .root('o1', 10)
      .root('o2', 20)
      .branch('A', 'o1', { x: 2100, startAge: 10, endAge: 30 })
      .branch('B', 'o2', { x: 2100, startAge: 20, endAge: 40 })
      .event('ev', 'B', 25)
      .build();
  }

  it.fails('Д5: drag origin ветки A не должен переписывать parentX события ветки B', () => {
    const flat = sharedXFixture();
    const tree = buildTimelineTree(flat.nodes, flat.edges);
    const out = flattenTree(applyDragToTree(tree, 'o1', 2030, 30));
    // Дерево отдало ev ветке A (o1 раньше в nodes[]), drag o1 уносит ev
    // и переписывает его parentX — событие «чужой» ветки повреждено.
    expect(out.nodes.find((n) => n.id === 'ev')!.parentX).toBe(2100);
  });

  it.fails('Д5: удаление origin ветки A не должно удалять событие ветки B', () => {
    const flat = sharedXFixture();
    const tree = buildTimelineTree(flat.nodes, flat.edges);
    const collected = collectDescendantIds(tree, 'o1')!;
    expect(collected.eventIds.has('ev')).toBe(false);
  });

  it('членство при shared-x детерминировано: повторный build даёт то же дерево', () => {
    const flat = sharedXFixture();
    const once = roundTrip(flat);
    const twice = roundTrip(once);
    expect(canonical(once)).toBe(canonical(flat));
    expect(canonical(twice)).toBe(canonical(once));
  });
});
