import { useState, useRef, useCallback } from 'react';
import { screenToWorld } from '../utils';
import { LINE_X_POSITION, YEAR_PX } from '../constants';
import {
  applyDragToTree,
  buildTimelineTree,
  findEventInTree,
  findParentBranch,
  flattenTree,
} from '../utils/timelineTree';
import type { NodeT, EdgeT, Transform } from '../types';

interface UseTimelineDragDropOptions {
  nodes: NodeT[];
  edges: EdgeT[];
  setNodes: (nodes: NodeT[]) => void;
  setEdges: (edges: EdgeT[]) => void;
  transform: Transform;
  svgRef: React.RefObject<SVGSVGElement>;
  ageMax?: number;
  onHistoryRecord?: () => void;
}

interface DragInfo {
  startWorld: { x: number; y: number };
  startAge: number;
  /** Ось фиксируется по первому заметному движению. */
  axis: 'none' | 'x' | 'y';
  /** Origin ветки двигается только вбок: его возраст тянет за собой окно ветки. */
  canVertical: boolean;
  ageBounds: [number, number];
}

// Порог (в мировых координатах), после которого фиксируется ось drag'а.
const AXIS_LOCK_THRESHOLD = 8;

const roundAge = (age: number) => Math.round(age * 10) / 10;

/**
 * Drag & drop на холсте:
 * - горизонтально — перемещение события с поддеревом (через дерево
 *   топологии, B1/B2);
 * - вертикально — смена возраста события (ось блокируется по первому
 *   движению; origin ветки вертикально не двигается; возраст клампится
 *   в окно своей ветки или [0, ageMax]);
 * - «хвостик» ветки — изменение её длины (не ниже последнего события).
 */
export function useTimelineDragDrop({
  nodes,
  edges,
  setNodes,
  setEdges,
  transform,
  svgRef,
  ageMax = 100,
  onHistoryRecord,
}: UseTimelineDragDropOptions) {
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [dragStartNodeX, setDragStartNodeX] = useState<number>(LINE_X_POSITION);
  const dragInfoRef = useRef<DragInfo | null>(null);

  const [resizingEdgeId, setResizingEdgeId] = useState<string | null>(null);
  const resizeInfoRef = useRef<{ minEnd: number } | null>(null);

  const worldHeight = ageMax * YEAR_PX + 500;

  /**
   * Start dragging a node
   */
  const handleNodeDragStart = useCallback(
    (e: React.PointerEvent, nodeId: string) => {
      e.stopPropagation();
      const worldPoint = screenToWorld(e, svgRef.current, transform);
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

      const isBranchOrigin = edges.some((edge) => edge.nodeId === nodeId);
      const parentBranch = findParentBranch(buildTimelineTree(nodes, edges), nodeId);

      setDraggingNodeId(nodeId);
      setDragStartX(worldPoint.x);
      setDragStartNodeX(node.x ?? LINE_X_POSITION);
      dragInfoRef.current = {
        startWorld: worldPoint,
        startAge: node.age,
        axis: 'none',
        canVertical: !isBranchOrigin,
        ageBounds: parentBranch
          ? [parentBranch.startAge, parentBranch.endAge]
          : [0, ageMax],
      };
    },
    [nodes, edges, ageMax, svgRef, transform]
  );

  /**
   * Handle node drag movement
   */
  const handleNodeDragMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingNodeId) return;
      const info = dragInfoRef.current;
      if (!info) return;

      e.stopPropagation();
      const worldPoint = screenToWorld(e, svgRef.current, transform);
      const node = nodes.find((n) => n.id === draggingNodeId);
      if (!node) return;

      if (info.axis === 'none') {
        const dx = Math.abs(worldPoint.x - info.startWorld.x);
        const dy = Math.abs(worldPoint.y - info.startWorld.y);
        if (Math.max(dx, dy) < AXIS_LOCK_THRESHOLD) return;
        info.axis = !info.canVertical || dx >= dy ? 'x' : 'y';
      }

      if (info.axis === 'x') {
        const newX = worldPoint.x;
        const oldX = node.x ?? LINE_X_POSITION; // CURRENT coordinate
        const deltaX = newX - oldX;
        if (deltaX === 0) return;

        const tree = buildTimelineTree(nodes, edges);
        const nextTree = applyDragToTree(tree, draggingNodeId, newX, deltaX);
        const result = flattenTree(nextTree);

        setNodes(result.nodes);
        setEdges(result.edges);
        return;
      }

      // Вертикаль: меняется только возраст (x заморожен).
      const rawAge = info.startAge - (worldPoint.y - info.startWorld.y) / YEAR_PX;
      const age = roundAge(Math.min(Math.max(rawAge, info.ageBounds[0]), info.ageBounds[1]));
      if (node.age === age) return;
      setNodes(nodes.map((n) => (n.id === draggingNodeId ? { ...n, age } : n)));
    },
    [draggingNodeId, nodes, edges, svgRef, transform, setNodes, setEdges]
  );

  /**
   * End dragging
   */
  const handleNodeDragEnd = useCallback(() => {
    if (draggingNodeId) {
      onHistoryRecord?.();
      setDraggingNodeId(null);
      dragInfoRef.current = null;
    }
  }, [draggingNodeId, onHistoryRecord]);

  /**
   * «Хвостик» ветки: начало изменения длины.
   */
  const handleBranchResizeStart = useCallback(
    (e: React.PointerEvent, edgeId: string) => {
      e.stopPropagation();
      const edge = edges.find((ed) => ed.id === edgeId);
      if (!edge) return;

      // Нижний предел: не короче 1 года и не ниже последнего события
      // на ветке (принадлежность — по дереву, как у всех операций).
      const origin = findEventInTree(buildTimelineTree(nodes, edges), edge.nodeId);
      const branchInTree = origin?.branches.find((b) => b.data.id === edgeId);
      const maxEventAge = Math.max(
        edge.startAge + 1,
        ...(branchInTree?.events.map((ev) => ev.data.age) ?? [])
      );

      setResizingEdgeId(edgeId);
      resizeInfoRef.current = { minEnd: maxEventAge };
    },
    [nodes, edges]
  );

  const handleBranchResizeMove = useCallback(
    (e: React.PointerEvent) => {
      if (!resizingEdgeId || !resizeInfoRef.current) return;
      e.stopPropagation();
      const edge = edges.find((ed) => ed.id === resizingEdgeId);
      if (!edge) return;

      const worldPoint = screenToWorld(e, svgRef.current, transform);
      const rawEnd = (worldHeight - worldPoint.y) / YEAR_PX;
      const newEnd = roundAge(
        Math.min(Math.max(rawEnd, resizeInfoRef.current.minEnd), ageMax)
      );
      if (edge.endAge === newEnd) return;
      setEdges(edges.map((ed) => (ed.id === resizingEdgeId ? { ...ed, endAge: newEnd } : ed)));
    },
    [resizingEdgeId, edges, svgRef, transform, worldHeight, ageMax, setEdges]
  );

  const handleBranchResizeEnd = useCallback(() => {
    if (resizingEdgeId) {
      onHistoryRecord?.();
      setResizingEdgeId(null);
      resizeInfoRef.current = null;
    }
  }, [resizingEdgeId, onHistoryRecord]);

  return {
    // State
    draggingNodeId,
    dragStartX,
    dragStartNodeX,
    resizingEdgeId,

    // Handlers
    handleNodeDragStart,
    handleNodeDragMove,
    handleNodeDragEnd,
    handleBranchResizeStart,
    handleBranchResizeMove,
    handleBranchResizeEnd,
  };
}
