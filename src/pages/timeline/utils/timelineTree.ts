/**
 * Tree representation of a timeline (events + branches).
 *
 * The Firestore wire-format keeps `nodes[]` and `edges[]` as flat arrays,
 * which makes cascade operations (drag, delete, age-edit) error-prone:
 * relationships are encoded across two fields (`node.parentX` and
 * `edge.nodeId`) and can drift out of sync. This module rebuilds the
 * intended parent → child topology in memory so operations can walk the
 * actual tree, then serialises it back to flat arrays.
 *
 * Topology:
 *   main line (LINE_X_POSITION) holds root events.
 *   every event can spawn multiple child branches (edges where
 *     edge.nodeId === event.id).
 *   every branch holds its own events (nodes where node.parentX
 *     equals branch.x), and those events can spawn deeper branches.
 *
 * Convention:
 *   - `node.parentX === LINE_X_POSITION` (or `undefined`) = root.
 *   - `node.parentX === edge.x` = node lives on `edge`.
 *   - `edge.nodeId === event.id` = branch originates from `event`.
 *
 * Orphan tolerance: a node whose `parentX` matches no existing edge is
 * treated as a root (we don't drop user data). An edge whose `nodeId`
 * matches no event is dropped — there's nothing to anchor it to.
 */
import { LINE_X_POSITION } from '../constants';
import type { EdgeT, NodeT } from '../types';

export interface TimelineTreeNode {
  data: NodeT;
  branches: TimelineTreeBranch[];
}

export interface TimelineTreeBranch {
  data: EdgeT;
  events: TimelineTreeNode[];
}

export type TimelineTree = TimelineTreeNode[];

function isRootNode(node: NodeT): boolean {
  const px = node.parentX;
  return px === undefined || px === LINE_X_POSITION;
}

export function buildTimelineTree(nodes: NodeT[], edges: EdgeT[]): TimelineTree {
  const edgesByOrigin = new Map<string, EdgeT[]>();
  for (const edge of edges) {
    const list = edgesByOrigin.get(edge.nodeId) ?? [];
    list.push(edge);
    edgesByOrigin.set(edge.nodeId, list);
  }

  const nodesByParentX = new Map<number, NodeT[]>();
  const rootNodes: NodeT[] = [];
  for (const node of nodes) {
    if (isRootNode(node)) {
      rootNodes.push(node);
    } else {
      const px = node.parentX as number;
      const list = nodesByParentX.get(px) ?? [];
      list.push(node);
      nodesByParentX.set(px, list);
    }
  }

  // Track which edge.x have been claimed by a parent so that orphan
  // detection knows what's reachable. Multiple edges can share the same
  // x (legacy bug B12): the tree picks the first one and treats the rest
  // as siblings under the same node — flattenTree preserves them.
  const claimedEdgeXs = new Set<number>();

  function buildEvent(node: NodeT): TimelineTreeNode {
    const branches = (edgesByOrigin.get(node.id) ?? []).map((edge): TimelineTreeBranch => {
      claimedEdgeXs.add(edge.x);
      const eventsOnBranch = (nodesByParentX.get(edge.x) ?? []).map(buildEvent);
      return { data: edge, events: eventsOnBranch };
    });
    return { data: node, branches };
  }

  const tree: TimelineTree = rootNodes.map(buildEvent);

  // Orphan nodes whose parentX points at no existing edge — surface them
  // as extra roots so they don't silently disappear.
  for (const [parentX, orphans] of nodesByParentX) {
    if (claimedEdgeXs.has(parentX)) continue;
    for (const orphan of orphans) {
      tree.push(buildEvent(orphan));
    }
  }

  return tree;
}

export function flattenTree(tree: TimelineTree): { nodes: NodeT[]; edges: EdgeT[] } {
  const nodes: NodeT[] = [];
  const edges: EdgeT[] = [];

  function walkEvent(event: TimelineTreeNode) {
    nodes.push(event.data);
    for (const branch of event.branches) {
      edges.push(branch.data);
      for (const child of branch.events) walkEvent(child);
    }
  }

  for (const root of tree) walkEvent(root);
  return { nodes, edges };
}

/**
 * Find the event with the given id anywhere in the tree, returning the
 * subtree rooted at that event. Returns null if not found.
 */
export function findEventInTree(tree: TimelineTree, eventId: string): TimelineTreeNode | null {
  for (const root of tree) {
    const hit = findInSubtree(root, eventId);
    if (hit) return hit;
  }
  return null;
}

function findInSubtree(event: TimelineTreeNode, eventId: string): TimelineTreeNode | null {
  if (event.data.id === eventId) return event;
  for (const branch of event.branches) {
    for (const child of branch.events) {
      const hit = findInSubtree(child, eventId);
      if (hit) return hit;
    }
  }
  return null;
}

/**
 * Map every event in the tree, optionally also transforming branches.
 * Used by drag/edit operations to produce a new tree without mutating.
 */
export function mapTree(
  tree: TimelineTree,
  mappers: {
    event?: (event: TimelineTreeNode, parentBranch: TimelineTreeBranch | null) => TimelineTreeNode;
    branch?: (branch: TimelineTreeBranch, parentEvent: TimelineTreeNode) => TimelineTreeBranch;
  }
): TimelineTree {
  const mapEvent = (event: TimelineTreeNode, parentBranch: TimelineTreeBranch | null): TimelineTreeNode => {
    const mapped = mappers.event ? mappers.event(event, parentBranch) : event;
    const mappedBranches = mapped.branches.map((branch) => {
      const branchMapped = mappers.branch ? mappers.branch(branch, mapped) : branch;
      return {
        ...branchMapped,
        events: branchMapped.events.map((child) => mapEvent(child, branchMapped)),
      };
    });
    return { ...mapped, branches: mappedBranches };
  };

  return tree.map((root) => mapEvent(root, null));
}
