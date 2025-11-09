import { useState, useCallback } from 'react';
import { screenToWorld } from '../utils';
import { LINE_X_POSITION } from '../constants';
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
 * Hook for managing drag & drop of timeline events
 * Includes recursive update logic for branches
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
   * Recursively update child nodes and edges when parent is moved
   */
  const updateRecursively = useCallback(
    (
      currentNodes: NodeT[],
      currentEdges: EdgeT[],
      fromX: number,
      toX: number,
      deltaX: number
    ): { nodes: NodeT[]; edges: EdgeT[] } => {
      let updatedNodes = [...currentNodes];
      let updatedEdges = [...currentEdges];

      // Find node IDs with parentX === fromX (before update)
      const childNodeIds = updatedNodes.filter((n) => n.parentX === fromX).map((n) => n.id);

      // Update parentX and x for these nodes
      updatedNodes = updatedNodes.map((n) => {
        if (n.parentX === fromX) {
          // Determine current position of node
          const currentX = n.x ?? LINE_X_POSITION;

          // If node is on parent line (not offset), move to new line
          // If node is offset, preserve the offset
          const newX = currentX === fromX ? toX : currentX + deltaX;

          return { ...n, x: newX, parentX: toX };
        }
        return n;
      });

      // For each child node, update its branches and recursively process
      for (const childNodeId of childNodeIds) {
        // Find branches from this node
        const childEdges = updatedEdges.filter((e) => e.nodeId === childNodeId);

        for (const childEdge of childEdges) {
          const oldEdgeX = childEdge.x;
          const newEdgeX = oldEdgeX + deltaX;

          // Update x-coordinate of branch
          updatedEdges = updatedEdges.map((e) =>
            e.id === childEdge.id ? { ...e, x: newEdgeX } : e
          );

          // Recursively update descendants on this branch
          const result = updateRecursively(updatedNodes, updatedEdges, oldEdgeX, newEdgeX, deltaX);
          updatedNodes = result.nodes;
          updatedEdges = result.edges;
        }
      }

      return { nodes: updatedNodes, edges: updatedEdges };
    },
    []
  );

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
      const oldX = node.x ?? LINE_X_POSITION; // Use CURRENT coordinate
      const deltaX = newX - oldX;

      // Update x-coordinate of the dragged node
      let updatedNodes = nodes.map((n) => (n.id === draggingNodeId ? { ...n, x: newX } : n));

      // Update x-coordinate of all branches connected to dragged node
      let updatedEdges = edges.map((edge) =>
        edge.nodeId === draggingNodeId ? { ...edge, x: newX } : edge
      );

      // Recursively update all children
      const result = updateRecursively(updatedNodes, updatedEdges, oldX, newX, deltaX);

      setNodes(result.nodes);
      setEdges(result.edges);
    },
    [draggingNodeId, nodes, edges, svgRef, transform, setNodes, setEdges, updateRecursively]
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
