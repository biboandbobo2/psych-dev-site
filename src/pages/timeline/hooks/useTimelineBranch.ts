import { useState, useCallback, useEffect } from 'react';
import { LINE_X_POSITION, SPHERE_META } from '../constants';
import {
  applyBranchDeletionToFlat,
  buildTimelineTree,
  findEventInTree,
  findParentBranch,
} from '../utils/timelineTree';
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
  // B15: identify the current selection by edge.id, not by x — two
  // branches can legitimately share an x-coord (legacy data) and id
  // is the actual primary key.
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

  const selectedEdge = selectedBranchId
    ? edges.find((e) => e.id === selectedBranchId) ?? null
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

      // B13: clamp endAge to ageMax — отказ вместо тихого создания
      // ветки за пределами холста.
      const proposedEndAge = selectedNode.age + years;
      if (proposedEndAge > ageMax) {
        alert(
          `Ветка не помещается на холсте. Максимальная длина — ${ageMax - selectedNode.age} лет (до ${ageMax}-летия).`
        );
        return;
      }

      // B12: if the source event already sits on a branch, its x
      // collides with the existing branch — offset the new branch
      // to the nearest free x so the two don't visually overlap and
      // selection-by-x in the UI doesn't get confused.
      let proposedBranchX = nodeX;
      const OFFSET_STEP = 100;
      while (edges.some((e) => e.x === proposedBranchX)) {
        proposedBranchX += OFFSET_STEP;
      }

      const meta = SPHERE_META[selectedNode.sphere];
      const edge: EdgeT = {
        id: crypto.randomUUID(),
        x: proposedBranchX,
        startAge: selectedNode.age,
        endAge: proposedEndAge,
        color: meta.color,
        nodeId: selectedNode.id,
      };

      const newEdges = [...edges, edge];
      setEdges(newEdges);
      onHistoryRecord?.(nodes, newEdges);

      // Clear form and deselect
      onClearForm?.();
      setSelectedBranchId(null);
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

    // B14: refuse to shorten the branch past events that already live
    // on it — those events would silently orphan above the new endAge.
    // Membership comes from the tree, not `parentX === x`: with shared-x
    // branches the flat filter would also count events of the other
    // branch and refuse a legitimate shorten (Д4).
    if (newEndAge < selectedEdge.endAge) {
      const tree = buildTimelineTree(nodes, edges);
      const origin = findEventInTree(tree, selectedEdge.nodeId);
      const branchInTree = origin?.branches.find((b) => b.data.id === selectedEdge.id);
      const eventsBeyond = (branchInTree?.events ?? []).filter((ev) => ev.data.age > newEndAge);
      if (eventsBeyond.length > 0) {
        const sample = eventsBeyond
          .slice(0, 3)
          .map((ev) => `«${ev.data.label}» (${ev.data.age} лет)`)
          .join(', ');
        const more = eventsBeyond.length > 3 ? ` и ещё ${eventsBeyond.length - 3}` : '';
        alert(
          `На ветке есть события за пределами новой длины: ${sample}${more}. Сначала перенесите их или удалите.`
        );
        return;
      }
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

    // Д6b: события удаляемой ветки мигрируют на линию её origin-события.
    // Если origin сам живёт на ветке, у той есть возрастное окно —
    // мигрант с возрастом вне окна «повис бы в воздухе» (I12). Отказ с
    // подсказкой, как и B11/B14.
    const tree = buildTimelineTree(nodes, edges);
    const parentBranch = findParentBranch(tree, selectedEdge.nodeId);
    if (parentBranch) {
      const origin = findEventInTree(tree, selectedEdge.nodeId);
      const branchInTree = origin?.branches.find((b) => b.data.id === selectedEdge.id);
      const misfits = (branchInTree?.events ?? []).filter(
        (ev) => ev.data.age < parentBranch.startAge || ev.data.age > parentBranch.endAge
      );
      if (misfits.length > 0) {
        const sample = misfits
          .slice(0, 3)
          .map((ev) => `«${ev.data.label}» (${ev.data.age} лет)`)
          .join(', ');
        const more = misfits.length > 3 ? ` и ещё ${misfits.length - 3}` : '';
        alert(
          `События ${sample}${more} не попадают в диапазон родительской ветки (${parentBranch.startAge}–${parentBranch.endAge} лет). Сначала продлите родительскую ветку или перенесите события.`
        );
        return;
      }
    }

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
    setSelectedBranchId(null); // Deselect
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
   * Select a branch for editing — by edge.id, the primary key.
   */
  const handleSelectBranch = useCallback((edgeId: string) => {
    setSelectedBranchId(edgeId);
  }, []);

  /**
   * Deselect branch
   */
  const handleHideBranchEditor = useCallback(() => {
    setSelectedBranchId(null);
  }, []);

  return {
    // State
    branchYears,
    selectedBranchId,
    selectedEdge,

    // Setters
    setBranchYears,
    setSelectedBranchId,

    // Handlers
    extendBranch,
    updateBranchLength,
    deleteBranch,
    handleExtendBranchForBulk,
    handleSelectBranch,
    handleHideBranchEditor,
  };
}
