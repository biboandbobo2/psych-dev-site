import { describe, expect, it } from 'vitest';
import {
  buildTimelineTree,
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
