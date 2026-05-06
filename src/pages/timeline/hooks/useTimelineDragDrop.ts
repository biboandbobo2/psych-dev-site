import { useState, useCallback } from 'react';
import { screenToWorld } from '../utils';
import { LINE_X_POSITION } from '../constants';
import { applyDragToTree, buildTimelineTree, flattenTree } from '../utils/timelineTree';
import type { NodeT, EdgeT, Transform } from '../types';

interface UseTimelineDragDropOptions {
  nodes: NodeT[];
  edges: EdgeT[];
  setNodes: (nodes: NodeT[]) => void;
  setEdges: (edges: EdgeT[]) => void;
  transform: Transform;
  svgRef: React.RefObject<SVGSVGElement>;
  onHistoryRecord?: () => void;
}

/**
 * Hook for managing drag & drop of timeline events.
 * Cascade logic walks the actual parent→child topology via
 * applyDragToTree (see timelineTree.ts) so siblings on the same branch
 * stay put when one of them moves, and grand-branches don't get a
 * double shift.
 */
export function useTimelineDragDrop({
  nodes,
  edges,
  setNodes,
  setEdges,
  transform,
  svgRef,
  onHistoryRecord,
}: UseTimelineDragDropOptions) {
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [dragStartNodeX, setDragStartNodeX] = useState<number>(LINE_X_POSITION);

  /**
   * Start dragging a node
   */
  const handleNodeDragStart = useCallback(
    (e: React.PointerEvent, nodeId: string) => {
      e.stopPropagation();
      const worldPoint = screenToWorld(e, svgRef.current, transform);
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

      setDraggingNodeId(nodeId);
      setDragStartX(worldPoint.x);
      setDragStartNodeX(node.x ?? LINE_X_POSITION);
    },
    [nodes, svgRef, transform]
  );

  /**
   * Handle node drag movement
   */
  const handleNodeDragMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingNodeId) return;

      e.stopPropagation();
      const worldPoint = screenToWorld(e, svgRef.current, transform);
      const node = nodes.find((n) => n.id === draggingNodeId);
      if (!node) return;

      const newX = worldPoint.x;
      const oldX = node.x ?? LINE_X_POSITION; // CURRENT coordinate
      const deltaX = newX - oldX;
      if (deltaX === 0) return;

      const tree = buildTimelineTree(nodes, edges);
      const nextTree = applyDragToTree(tree, draggingNodeId, newX, deltaX);
      const result = flattenTree(nextTree);

      setNodes(result.nodes);
      setEdges(result.edges);
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
    }
  }, [draggingNodeId, onHistoryRecord]);

  return {
    // State
    draggingNodeId,
    dragStartX,
    dragStartNodeX,

    // Handlers
    handleNodeDragStart,
    handleNodeDragMove,
    handleNodeDragEnd,
  };
}
