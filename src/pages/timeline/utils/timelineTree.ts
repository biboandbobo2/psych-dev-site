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

  // CRITICAL: every event must enter the tree exactly once. If two
  // legacy branches share the same edge.x, both nodesByParentX[edge.x]
  // lookups return the same array — without this dedup, flattenTree
  // would output the events twice, drag → flatten → setNodes
  // re-feeds the doubled state on the next move, and node count
  // explodes 2× per mousemove (real production incident:
  // ~60k events after a few seconds of dragging).
  const claimedNodeIds = new Set<string>();
  const claimedEdgeXs = new Set<number>();

  function buildEvent(node: NodeT): TimelineTreeNode {
    claimedNodeIds.add(node.id);
    const branches = (edgesByOrigin.get(node.id) ?? []).map((edge): TimelineTreeBranch => {
      claimedEdgeXs.add(edge.x);
      const candidates = nodesByParentX.get(edge.x) ?? [];
      const eventsOnBranch: TimelineTreeNode[] = [];
      for (const candidate of candidates) {
        if (claimedNodeIds.has(candidate.id)) continue;
        eventsOnBranch.push(buildEvent(candidate));
      }
      return { data: edge, events: eventsOnBranch };
    });
    return { data: node, branches };
  }

  const tree: TimelineTree = [];
  for (const root of rootNodes) {
    if (claimedNodeIds.has(root.id)) continue;
    tree.push(buildEvent(root));
  }

  // Orphan nodes whose parentX points at no existing edge — surface them
  // as extra roots so they don't silently disappear.
  for (const [parentX, orphans] of nodesByParentX) {
    if (claimedEdgeXs.has(parentX)) continue;
    for (const orphan of orphans) {
      if (claimedNodeIds.has(orphan.id)) continue;
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
 * Find the branch the event lives on, according to tree membership.
 * Returns null for root events and events not present in the tree.
 *
 * Validators (B11 age window, B14 shorten guard) must use this instead
 * of `edges.find((e) => e.x === node.parentX)`: when two branches share
 * an x, the flat lookup can pick a different branch than the tree walk
 * that drag/delete operations use, so validation and behaviour diverge.
 */
export function findParentBranch(tree: TimelineTree, eventId: string): EdgeT | null {
  for (const root of tree) {
    const hit = findParentBranchInSubtree(root, eventId);
    if (hit) return hit;
  }
  return null;
}

function findParentBranchInSubtree(event: TimelineTreeNode, eventId: string): EdgeT | null {
  for (const branch of event.branches) {
    for (const child of branch.events) {
      if (child.data.id === eventId) return branch.data;
      const hit = findParentBranchInSubtree(child, eventId);
      if (hit) return hit;
    }
  }
  return null;
}

/**
 * Apply a drag to the tree: change the dragged event's x to newSelfX,
 * and shift all of its descendants (branches + their events) by deltaX.
 *
 * Sibling events on the dragged event's parent branch DO NOT move —
 * the drag is purely a subtree operation. This is the structural
 * answer to B1 (siblings followed) and B2 (double-shift on grand-
 * branches), both of which only existed because the old implementation
 * walked the flat arrays via `parentX === fromX` matching.
 */
export function applyDragToTree(
  tree: TimelineTree,
  draggedId: string,
  newSelfX: number,
  deltaX: number
): TimelineTree {
  const transformEvent = (event: TimelineTreeNode): TimelineTreeNode => {
    if (event.data.id === draggedId) {
      return {
        ...event,
        data: { ...event.data, x: newSelfX },
        branches: event.branches.map((b) => shiftBranchSubtree(b, deltaX)),
      };
    }
    return {
      ...event,
      branches: event.branches.map((b) => ({
        ...b,
        events: b.events.map(transformEvent),
      })),
    };
  };
  return tree.map(transformEvent);
}

function shiftBranchSubtree(branch: TimelineTreeBranch, deltaX: number): TimelineTreeBranch {
  const newBranchX = branch.data.x + deltaX;
  return {
    ...branch,
    data: { ...branch.data, x: newBranchX },
    events: branch.events.map((child) => shiftEventOnShiftedBranch(child, newBranchX, deltaX)),
  };
}

function shiftEventOnShiftedBranch(
  event: TimelineTreeNode,
  newParentX: number,
  deltaX: number
): TimelineTreeNode {
  const currentX = event.data.x ?? LINE_X_POSITION;
  return {
    ...event,
    data: {
      ...event.data,
      x: currentX + deltaX, // preserve any per-node offset
      parentX: newParentX,
    },
    branches: event.branches.map((b) => shiftBranchSubtree(b, deltaX)),
  };
}

/**
 * Delete a branch and migrate every event living on it to the parent
 * line (the line where the branch's origin event sits). Each migrated
 * event also brings its own grand-branches and their events along —
 * those keep their per-event offsets relative to their own branch.
 *
 * Fixes B8 — the previous implementation only rewrote `parentX` and
 * left `node.x` on the deleted branch's coordinate, so events visually
 * "hung in the air" instead of joining the parent line.
 *
 * Returns the original arrays unchanged if the edge isn't found.
 */
export function applyBranchDeletionToFlat(
  nodes: NodeT[],
  edges: EdgeT[],
  edgeId: string
): { nodes: NodeT[]; edges: EdgeT[] } {
  const tree = buildTimelineTree(nodes, edges);

  const branchEdge = edges.find((e) => e.id === edgeId);
  if (!branchEdge) return { nodes, edges };

  const originInTree = findEventInTree(tree, branchEdge.nodeId);
  if (!originInTree) {
    // Origin event missing — drop the edge, leave events that pointed
    // at it as orphans recoverable by the next operation. Defensive.
    return { nodes, edges: edges.filter((e) => e.id !== edgeId) };
  }
  const branchInTree = originInTree.branches.find((b) => b.data.id === edgeId);
  if (!branchInTree) return { nodes, edges };

  const newParentLineX = originInTree.data.x ?? LINE_X_POSITION;
  const newAnchorParentX = originInTree.data.parentX; // where origin lives

  const updatedNodes = new Map<string, NodeT>();
  const updatedEdges = new Map<string, EdgeT>();

  // Grand-branches get new x coordinates. A migrated branch must not land
  // on the x of an unrelated surviving branch (membership is x-encoded —
  // a collision silently merges two branches, class Д5/Д6a) nor on the
  // main line itself. Track taken xs: survivors first, migrants as placed.
  const migratedEdgeIds = new Set<string>();
  const collectMigratedEdgeIds = (event: TimelineTreeNode) => {
    for (const branch of event.branches) {
      migratedEdgeIds.add(branch.data.id);
      for (const child of branch.events) collectMigratedEdgeIds(child);
    }
  };
  for (const child of branchInTree.events) collectMigratedEdgeIds(child);

  const takenXs = new Set<number>([LINE_X_POSITION]);
  for (const e of edges) {
    if (e.id === edgeId || migratedEdgeIds.has(e.id)) continue;
    takenXs.add(e.x);
  }
  const OFFSET_STEP = 100; // same step as extendBranch's B12 walk
  const claimFreeX = (proposed: number): number => {
    let x = proposed;
    while (takenXs.has(x)) x += OFFSET_STEP;
    takenXs.add(x);
    return x;
  };

  // Top-level migrant: collapses to the new parent line (no offset).
  function migrateTopLevel(event: TimelineTreeNode) {
    const oldX = event.data.x ?? LINE_X_POSITION;
    const deltaX = newParentLineX - oldX;
    updatedNodes.set(event.data.id, {
      ...event.data,
      x: newParentLineX,
      parentX: newAnchorParentX,
    });
    for (const branch of event.branches) {
      shiftBranch(branch, deltaX);
    }
  }

  // Descendant migrant: preserves its per-event offset relative to its
  // own branch — only the absolute coordinates slide by deltaX.
  function migrateDescendant(event: TimelineTreeNode, deltaX: number, newOwnParentX: number) {
    const oldX = event.data.x ?? LINE_X_POSITION;
    updatedNodes.set(event.data.id, {
      ...event.data,
      x: oldX + deltaX,
      parentX: newOwnParentX,
    });
    for (const branch of event.branches) {
      shiftBranch(branch, deltaX);
    }
  }

  function shiftBranch(branch: TimelineTreeBranch, deltaX: number) {
    const newBranchX = claimFreeX(branch.data.x + deltaX);
    const actualDelta = newBranchX - branch.data.x;
    updatedEdges.set(branch.data.id, { ...branch.data, x: newBranchX });
    for (const child of branch.events) {
      migrateDescendant(child, actualDelta, newBranchX);
    }
  }

  for (const child of branchInTree.events) migrateTopLevel(child);

  return {
    nodes: nodes.map((n) => updatedNodes.get(n.id) ?? n),
    edges: edges
      .filter((e) => e.id !== edgeId)
      .map((e) => updatedEdges.get(e.id) ?? e),
  };
}

/**
 * Collect every event id and every edge id reachable from `eventId` in
 * the tree, including `eventId` itself. Returns null if `eventId` is
 * not in the tree (caller should fall back to id-only delete).
 *
 * Used by deleteNode to drop the entire subtree of an event in one
 * pass — fixes B6 (orphan branch events left behind) and B7 (cascade
 * not going past one level).
 */
export function collectDescendantIds(
  tree: TimelineTree,
  eventId: string
): { eventIds: Set<string>; edgeIds: Set<string> } | null {
  const subtree = findEventInTree(tree, eventId);
  if (!subtree) return null;
  const eventIds = new Set<string>();
  const edgeIds = new Set<string>();
  collectSubtreeIds(subtree, eventIds, edgeIds);
  return { eventIds, edgeIds };
}

function collectSubtreeIds(
  event: TimelineTreeNode,
  eventIds: Set<string>,
  edgeIds: Set<string>
): void {
  eventIds.add(event.data.id);
  for (const branch of event.branches) {
    edgeIds.add(branch.data.id);
    for (const child of branch.events) collectSubtreeIds(child, eventIds, edgeIds);
  }
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
