import { useState, useCallback, useEffect } from 'react';
import { LINE_X_POSITION, SPHERE_META } from '../constants';
import { applyBranchDeletionToFlat } from '../utils/timelineTree';
import type { NodeT, EdgeT } from '../types';

interface UseTimelineBranchOptions {
  nodes: NodeT[];
  edges: EdgeT[];
  setNodes: (nodes: NodeT[]) => void;
  setEdges: (edges: EdgeT[]) => void;
  ageMax: number;
  onHistoryRecord?: (nodes?: NodeT[], edges?: EdgeT[]) => void;
  onClearForm?: () => void;
}

/**
 * Hook for managing timeline branches
 */
export function useTimelineBranch({
  nodes,
  edges,
  setNodes,
  setEdges,
  ageMax,
  onHistoryRecord,
  onClearForm,
}: UseTimelineBranchOptions) {
  const [branchYears, setBranchYears] = useState<string>('5');
  const [selectedBranchX, setSelectedBranchX] = useState<number | null>(null);

  // Get currently selected edge
  const selectedEdge = selectedBranchX !== null
    ? edges.find((e) => e.x === selectedBranchX) ?? null
    : null;

  /**
   * Auto-set branch length when selecting a branch
   */
  useEffect(() => {
    if (selectedEdge) {
      const length = selectedEdge.endAge - selectedEdge.startAge;
      setBranchYears(length.toString());
    }
  }, [selectedEdge]);

  /**
   * Create a new branch from selected node
   */
  const extendBranch = useCallback(
    (selectedNode: NodeT | null) => {
      if (!selectedNode || !selectedNode.sphere) return;

      const nodeX = selectedNode.x ?? LINE_X_POSITION;
      if (nodeX === LINE_X_POSITION) {
        alert('Событие должно быть не на основной линии жизни');
        return;
      }

      const years = parseFloat(branchYears);
      if (isNaN(years) || years <= 0) {
        alert('Введите корректное количество лет');
        return;
      }

      const meta = SPHERE_META[selectedNode.sphere];
      const edge: EdgeT = {
        id: crypto.randomUUID(),
        x: nodeX,
        startAge: selectedNode.age,
        endAge: selectedNode.age + years,
        color: meta.color,
        nodeId: selectedNode.id,
      };

      const newEdges = [...edges, edge];
      setEdges(newEdges);
      onHistoryRecord?.(nodes, newEdges);

      // Clear form and deselect
      onClearForm?.();
      setSelectedBranchX(null);
    },
    [branchYears, edges, nodes, setEdges, onHistoryRecord, onClearForm]
  );

  /**
   * Update length of existing branch
   */
  const updateBranchLength = useCallback(() => {
    if (!selectedEdge) return;

    const years = parseFloat(branchYears);
    if (isNaN(years) || years <= 0) {
      alert('Введите корректное количество лет');
      return;
    }

    const newEndAge = selectedEdge.startAge + years;

    // Check maximum age
    if (newEndAge > ageMax) {
      alert(`Максимальный возраст: ${ageMax} лет`);
      return;
    }

    // Update branch
    const updatedEdges = edges.map((e) =>
      e.id === selectedEdge.id ? { ...e, endAge: newEndAge } : e
    );
    setEdges(updatedEdges);
    onHistoryRecord?.(nodes, updatedEdges);
  }, [selectedEdge, branchYears, ageMax, edges, nodes, setEdges, onHistoryRecord]);

  /**
   * Delete branch and migrate every event on it (with its grand-branches)
   * to the parent line. The actual topology walk lives in
   * applyBranchDeletionToFlat — fixes B8 by also moving node.x, not just
   * parentX, so migrated events end up on the line and not in midair.
   */
  const deleteBranch = useCallback(() => {
    if (!selectedEdge) return;

    const confirmed = window.confirm(
      'Удалить эту ветку? Все события на ней будут перенесены на родительскую линию.'
    );
    if (!confirmed) return;

    const { nodes: updatedNodes, edges: updatedEdges } = applyBranchDeletionToFlat(
      nodes,
      edges,
      selectedEdge.id
    );

    setNodes(updatedNodes);
    setEdges(updatedEdges);
    setSelectedBranchX(null); // Deselect
    onHistoryRecord?.(updatedNodes, updatedEdges);
  }, [selectedEdge, nodes, edges, setNodes, setEdges, onHistoryRecord]);

  /**
   * Extend branch for bulk event creation
   */
  const handleExtendBranchForBulk = useCallback(
    (newEndAge: number) => {
      if (!selectedEdge) return;

      const updatedEdges = edges.map((e) =>
        e.id === selectedEdge.id ? { ...e, endAge: newEndAge } : e
      );
      setEdges(updatedEdges);
      onHistoryRecord?.(nodes, updatedEdges);
    },
    [selectedEdge, edges, nodes, setEdges, onHistoryRecord]
  );

  /**
   * Select a branch for editing
   */
  const handleSelectBranch = useCallback((x: number) => {
    setSelectedBranchX(x);
  }, []);

  /**
   * Deselect branch
   */
  const handleHideBranchEditor = useCallback(() => {
    setSelectedBranchX(null);
  }, []);

  return {
    // State
    branchYears,
    selectedBranchX,
    selectedEdge,

    // Setters
    setBranchYears,
    setSelectedBranchX,

    // Handlers
    extendBranch,
    updateBranchLength,
    deleteBranch,
    handleExtendBranchForBulk,
    handleSelectBranch,
    handleHideBranchEditor,
  };
}
