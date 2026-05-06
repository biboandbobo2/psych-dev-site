import { describe, expect, it } from 'vitest';
import {
  applyBranchDeletionToFlat,
  applyDragToTree,
  buildTimelineTree,
  collectDescendantIds,
  findEventInTree,
  flattenTree,
  mapTree,
  type TimelineTreeNode,
} from '../timelineTree';
import { LINE_X_POSITION } from '../../constants';
import type { EdgeT, NodeT } from '../../types';

function n(
  id: string,
  age: number,
  overrides: Partial<NodeT> = {}
): NodeT {
  return {
    id,
    age,
    label: id,
    isDecision: false,
    x: LINE_X_POSITION,
    ...overrides,
  };
}

function e(id: string, x: number, nodeId: string, overrides: Partial<EdgeT> = {}): EdgeT {
  return {
    id,
    x,
    nodeId,
    startAge: 18,
    endAge: 30,
    color: '#000',
    ...overrides,
  };
}

describe('buildTimelineTree', () => {
  it('places main-line events as roots', () => {
    const nodes = [
      n('a', 10, { x: LINE_X_POSITION }),
      n('b', 20, { x: LINE_X_POSITION }),
    ];
    const tree = buildTimelineTree(nodes, []);
    expect(tree).toHaveLength(2);
    expect(tree.map((t) => t.data.id)).toEqual(['a', 'b']);
    expect(tree[0].branches).toEqual([]);
  });

  it('treats parentX === undefined as a root', () => {
    const nodes = [n('a', 5, { x: LINE_X_POSITION, parentX: undefined })];
    expect(buildTimelineTree(nodes, [])[0].data.id).toBe('a');
  });

  it('attaches a branch to its origin event', () => {
    const nodes = [n('a', 10, { x: LINE_X_POSITION })];
    const edges = [e('e1', 2100, 'a')];
    const tree = buildTimelineTree(nodes, edges);
    expect(tree[0].branches).toHaveLength(1);
    expect(tree[0].branches[0].data.id).toBe('e1');
    expect(tree[0].branches[0].events).toEqual([]);
  });

  it('places branch events under the right branch', () => {
    const nodes = [
      n('a', 10, { x: LINE_X_POSITION }),
      n('b', 20, { x: 2100, parentX: 2100 }),
      n('c', 25, { x: 2100, parentX: 2100 }),
    ];
    const edges = [e('e1', 2100, 'a')];
    const tree = buildTimelineTree(nodes, edges);
    const branch = tree[0].branches[0];
    expect(branch.events.map((ev) => ev.data.id)).toEqual(['b', 'c']);
  });

  it('handles a deep branch (root → branch → event → branch → event)', () => {
    const nodes = [
      n('a', 10, { x: LINE_X_POSITION }),
      n('b', 20, { x: 2100, parentX: 2100 }),
      n('c', 30, { x: 2200, parentX: 2200 }),
    ];
    const edges = [e('e1', 2100, 'a'), e('e2', 2200, 'b')];
    const tree = buildTimelineTree(nodes, edges);
    expect(tree[0].branches[0].events[0].branches[0].events[0].data.id).toBe('c');
  });

  it('keeps multiple branches from one event', () => {
    const nodes = [n('a', 10, { x: LINE_X_POSITION })];
    const edges = [e('e1', 2100, 'a'), e('e2', 2200, 'a')];
    const tree = buildTimelineTree(nodes, edges);
    expect(tree[0].branches.map((b) => b.data.id)).toEqual(['e1', 'e2']);
  });

  it('drops edges whose origin node is missing', () => {
    const nodes = [n('a', 10, { x: LINE_X_POSITION })];
    const edges = [e('e1', 2100, 'a'), e('orphan', 2300, 'missing')];
    const { edges: out } = flattenTree(buildTimelineTree(nodes, edges));
    expect(out.map((x) => x.id)).toEqual(['e1']);
  });

  it('rescues orphan nodes (parentX with no matching edge) as roots', () => {
    const nodes = [
      n('a', 10, { x: LINE_X_POSITION }),
      n('orphan', 20, { x: 9999, parentX: 9999 }),
    ];
    const tree = buildTimelineTree(nodes, []);
    expect(tree.map((t) => t.data.id)).toContain('orphan');
  });
});

describe('flattenTree', () => {
  it('round-trips through buildTimelineTree → flattenTree', () => {
    const nodes = [
      n('a', 10, { x: LINE_X_POSITION }),
      n('b', 20, { x: 2100, parentX: 2100 }),
      n('c', 25, { x: 2100, parentX: 2100 }),
      n('d', 30, { x: 2200, parentX: 2200 }),
    ];
    const edges = [e('e1', 2100, 'a'), e('e2', 2200, 'b')];
    const out = flattenTree(buildTimelineTree(nodes, edges));
    expect(new Set(out.nodes.map((x) => x.id))).toEqual(new Set(['a', 'b', 'c', 'd']));
    expect(new Set(out.edges.map((x) => x.id))).toEqual(new Set(['e1', 'e2']));
  });

  it('preserves node fields (label, age, sphere, x, parentX)', () => {
    const nodes = [
      n('a', 10, { x: LINE_X_POSITION, sphere: 'education', label: 'Школа' }),
    ];
    const out = flattenTree(buildTimelineTree(nodes, []));
    expect(out.nodes[0]).toMatchObject({
      id: 'a',
      age: 10,
      sphere: 'education',
      label: 'Школа',
    });
  });
});

describe('findEventInTree', () => {
  it('finds a deeply nested event', () => {
    const nodes = [
      n('a', 10, { x: LINE_X_POSITION }),
      n('b', 20, { x: 2100, parentX: 2100 }),
      n('c', 30, { x: 2200, parentX: 2200 }),
    ];
    const edges = [e('e1', 2100, 'a'), e('e2', 2200, 'b')];
    const tree = buildTimelineTree(nodes, edges);
    expect(findEventInTree(tree, 'c')?.data.age).toBe(30);
  });

  it('returns null for unknown id', () => {
    const tree = buildTimelineTree([n('a', 10, { x: LINE_X_POSITION })], []);
    expect(findEventInTree(tree, 'missing')).toBeNull();
  });
});

describe('mapTree', () => {
  it('lets you transform every event without mutating original', () => {
    const nodes = [
      n('a', 10, { x: LINE_X_POSITION }),
      n('b', 20, { x: 2100, parentX: 2100 }),
    ];
    const edges = [e('e1', 2100, 'a')];
    const tree = buildTimelineTree(nodes, edges);
    const bumped = mapTree(tree, {
      event: (ev: TimelineTreeNode) => ({
        ...ev,
        data: { ...ev.data, age: ev.data.age + 100 },
      }),
    });
    const flat = flattenTree(bumped);
    expect(flat.nodes.map((x) => x.age).sort()).toEqual([110, 120]);
    // Original tree untouched
    expect(tree[0].data.age).toBe(10);
  });

  it('lets you transform branches (e.g. shift edge.x)', () => {
    const nodes = [n('a', 10, { x: LINE_X_POSITION })];
    const edges = [e('e1', 2100, 'a')];
    const tree = buildTimelineTree(nodes, edges);
    const shifted = mapTree(tree, {
      branch: (b) => ({ ...b, data: { ...b.data, x: b.data.x + 50 } }),
    });
    expect(flattenTree(shifted).edges[0].x).toBe(2150);
  });
});

describe('applyDragToTree (B1 + B2 regression)', () => {
  // Topology used across these tests:
  //   ROOT (a, x=2000)
  //     └─ branch e1 (x=2100)
  //         ├─ b (x=2100, parentX=2100)   ← sibling on the branch
  //         ├─ c (x=2100, parentX=2100)   ← sibling on the branch
  //         └─ b: branch e2 (x=2200)      ← grand-branch from b
  //             └─ d (x=2200, parentX=2200)
  function setup() {
    const nodes = [
      n('a', 10, { x: LINE_X_POSITION }),
      n('b', 20, { x: 2100, parentX: 2100 }),
      n('c', 25, { x: 2100, parentX: 2100 }),
      n('d', 30, { x: 2200, parentX: 2200 }),
    ];
    const edges = [e('e1', 2100, 'a'), e('e2', 2200, 'b')];
    return { tree: buildTimelineTree(nodes, edges), nodes, edges };
  }

  it('B1: dragging a sibling event (b) does NOT move other siblings (c)', () => {
    const { tree } = setup();
    const next = applyDragToTree(tree, 'b', 2050, -50); // b moves left by 50
    const flat = flattenTree(next);
    const c = flat.nodes.find((x) => x.id === 'c')!;
    expect(c.x).toBe(2100); // unchanged
    expect(c.parentX).toBe(2100); // still on the same branch e1
  });

  it('B1: parent branch e1 stays put when one of its events moves', () => {
    const { tree } = setup();
    const next = applyDragToTree(tree, 'b', 2050, -50);
    const flat = flattenTree(next);
    expect(flat.edges.find((x) => x.id === 'e1')!.x).toBe(2100); // unchanged
  });

  it("B2: child branch e2 from b shifts by exactly deltaX (not 2×deltaX)", () => {
    const { tree } = setup();
    const next = applyDragToTree(tree, 'b', 2050, -50);
    const flat = flattenTree(next);
    expect(flat.edges.find((x) => x.id === 'e2')!.x).toBe(2150); // 2200 + (-50)
  });

  it('B2: event on grand-branch (d) shifts by exactly deltaX, parentX rebound', () => {
    const { tree } = setup();
    const next = applyDragToTree(tree, 'b', 2050, -50);
    const flat = flattenTree(next);
    const d = flat.nodes.find((x) => x.id === 'd')!;
    expect(d.x).toBe(2150); // 2200 - 50
    expect(d.parentX).toBe(2150); // re-anchored to the moved e2
  });

  it('preserves per-node offset on shifted descendants', () => {
    // Like setup() but d sits 30px to the right of its branch e2
    const nodes = [
      n('a', 10, { x: LINE_X_POSITION }),
      n('b', 20, { x: 2100, parentX: 2100 }),
      n('d', 30, { x: 2230, parentX: 2200 }), // +30 offset
    ];
    const edges = [e('e1', 2100, 'a'), e('e2', 2200, 'b')];
    const next = applyDragToTree(buildTimelineTree(nodes, edges), 'b', 2050, -50);
    const d = flattenTree(next).nodes.find((x) => x.id === 'd')!;
    expect(d.x).toBe(2180); // 2230 - 50, offset preserved
    expect(d.parentX).toBe(2150); // re-anchored to the new branch x
  });

  it('dragging the root event moves its branches AND their events together', () => {
    const { tree } = setup();
    const next = applyDragToTree(tree, 'a', 2030, 30); // root moves right by 30
    const flat = flattenTree(next);
    expect(flat.nodes.find((x) => x.id === 'a')!.x).toBe(2030);
    expect(flat.edges.find((x) => x.id === 'e1')!.x).toBe(2130); // 2100 + 30
    expect(flat.nodes.find((x) => x.id === 'b')!.x).toBe(2130); // followed e1
    expect(flat.nodes.find((x) => x.id === 'b')!.parentX).toBe(2130);
    expect(flat.edges.find((x) => x.id === 'e2')!.x).toBe(2230); // grand-branch
    expect(flat.nodes.find((x) => x.id === 'd')!.x).toBe(2230);
  });

  it('returns tree unchanged when dragged id is not found', () => {
    const { tree } = setup();
    const next = applyDragToTree(tree, 'no-such-id', 9999, 100);
    expect(flattenTree(next)).toEqual(flattenTree(tree));
  });
});

describe('collectDescendantIds (B6 + B7 regression)', () => {
  // Same topology as applyDragToTree tests:
  //   ROOT a → branch e1 → b, c → b's branch e2 → d
  function setup() {
    const nodes = [
      n('a', 10, { x: LINE_X_POSITION }),
      n('b', 20, { x: 2100, parentX: 2100 }),
      n('c', 25, { x: 2100, parentX: 2100 }),
      n('d', 30, { x: 2200, parentX: 2200 }),
    ];
    const edges = [e('e1', 2100, 'a'), e('e2', 2200, 'b')];
    return { tree: buildTimelineTree(nodes, edges) };
  }

  it('B6: deleting the root collects every descendant event AND edge', () => {
    const { tree } = setup();
    const collected = collectDescendantIds(tree, 'a');
    expect(collected).not.toBeNull();
    expect([...collected!.eventIds].sort()).toEqual(['a', 'b', 'c', 'd']);
    expect([...collected!.edgeIds].sort()).toEqual(['e1', 'e2']);
  });

  it('B7: deleting an event on a branch cascades into its grand-branch', () => {
    const { tree } = setup();
    const collected = collectDescendantIds(tree, 'b');
    expect([...collected!.eventIds].sort()).toEqual(['b', 'd']);
    expect([...collected!.edgeIds]).toEqual(['e2']);
  });

  it('deleting a leaf event has no descendants beyond itself', () => {
    const { tree } = setup();
    const collected = collectDescendantIds(tree, 'd');
    expect([...collected!.eventIds]).toEqual(['d']);
    expect([...collected!.edgeIds]).toEqual([]);
  });

  it('deleting a sibling does NOT collect the other sibling', () => {
    const { tree } = setup();
    const collected = collectDescendantIds(tree, 'c');
    expect([...collected!.eventIds]).toEqual(['c']); // no 'b'
    expect([...collected!.edgeIds]).toEqual([]);
  });

  it('returns null when the event is not in the tree', () => {
    const { tree } = setup();
    expect(collectDescendantIds(tree, 'no-such-id')).toBeNull();
  });
});

describe('applyBranchDeletionToFlat (B8 regression)', () => {
  // Topology:
  //   ROOT a (x=2000) on main line
  //     └─ branch e1 (x=2100)
  //         └─ b (x=2100, parentX=2100)
  //             └─ branch e2 (x=2200)
  //                 └─ c (x=2230, parentX=2200, +30 offset)
  // Deleting e1 should:
  //  - move b to the main line (x=2000), parentX=undefined (since a is root)
  //  - shift e2 to x=2100 (delta = -100), c follows to x=2130 (offset preserved)
  function setup() {
    const nodes = [
      n('a', 10, { x: LINE_X_POSITION }),
      n('b', 20, { x: 2100, parentX: 2100 }),
      n('c', 30, { x: 2230, parentX: 2200 }),
    ];
    const edges = [e('e1', 2100, 'a'), e('e2', 2200, 'b')];
    return { nodes, edges };
  }

  it('B8: migrates events to the parent line (node.x updated, not just parentX)', () => {
    const { nodes, edges } = setup();
    const out = applyBranchDeletionToFlat(nodes, edges, 'e1');
    const b = out.nodes.find((x) => x.id === 'b')!;
    expect(b.x).toBe(LINE_X_POSITION); // collapsed onto main line
    expect(b.parentX).toBeUndefined(); // origin a is root → migrant becomes root
  });

  it('drops the deleted branch from edges', () => {
    const { nodes, edges } = setup();
    const out = applyBranchDeletionToFlat(nodes, edges, 'e1');
    expect(out.edges.find((x) => x.id === 'e1')).toBeUndefined();
  });

  it('drags grand-branch e2 with the migrated event b', () => {
    const { nodes, edges } = setup();
    const out = applyBranchDeletionToFlat(nodes, edges, 'e1');
    const e2 = out.edges.find((x) => x.id === 'e2')!;
    expect(e2.x).toBe(2100); // 2200 + (2000 - 2100)
  });

  it('preserves per-event offset on grand-branch descendants', () => {
    const { nodes, edges } = setup();
    const out = applyBranchDeletionToFlat(nodes, edges, 'e1');
    const c = out.nodes.find((x) => x.id === 'c')!;
    expect(c.x).toBe(2130); // 2230 + delta(-100), offset of +30 preserved
    expect(c.parentX).toBe(2100); // re-anchored to the moved e2
  });

  it('migrates onto a non-root line when origin event lives on another branch', () => {
    // a (root) → branch e1 → b on e1 → branch e2 → c on e2 → branch e3 → d on e3
    // delete e3 → d should move to b's line (x=2100, parentX=undefined? no — parent of d is c, which lives on e2)
    // After deletion, d should sit at c.x with parentX=e2.x.
    const nodes = [
      n('a', 10, { x: LINE_X_POSITION }),
      n('b', 20, { x: 2100, parentX: 2100 }),
      n('c', 30, { x: 2200, parentX: 2200 }),
      n('d', 40, { x: 2300, parentX: 2300 }),
    ];
    const edges = [
      e('e1', 2100, 'a'),
      e('e2', 2200, 'b'),
      e('e3', 2300, 'c'),
    ];
    const out = applyBranchDeletionToFlat(nodes, edges, 'e3');
    const d = out.nodes.find((x) => x.id === 'd')!;
    expect(d.x).toBe(2200); // c's x
    expect(d.parentX).toBe(2200); // c lives on e2 (x=2200)
  });

  it('returns input unchanged when edge id is unknown', () => {
    const { nodes, edges } = setup();
    const out = applyBranchDeletionToFlat(nodes, edges, 'no-such-edge');
    expect(out.nodes).toEqual(nodes);
    expect(out.edges).toEqual(edges);
  });
});
