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
  /** Неблокирующее уведомление (toast); по умолчанию — alert. */
  notify?: (message: string) => void;
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
  notify,
}: UseTimelineBranchOptions) {
  const warn = notify ?? ((message: string) => alert(message));
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
      if (!selectedNode) return;
      if (!selectedNode.sphere) {
        // Раньше — молчаливый return: пользователь жал кнопку без эффекта.
        warn('Сначала укажите сферу события — из неё берётся цвет ветки.');
        return;
      }

      const nodeX = selectedNode.x ?? LINE_X_POSITION;
      if (nodeX === LINE_X_POSITION) {
        warn('Ветка растёт из смещённого события: сначала потяните событие в сторону от главной линии.');
        return;
      }

      const years = parseFloat(branchYears);
      if (isNaN(years) || years <= 0) {
        warn('Введите корректное количество лет');
        return;
      }

      // B13: clamp endAge to ageMax — отказ вместо тихого создания
      // ветки за пределами холста.
      const proposedEndAge = selectedNode.age + years;
      if (proposedEndAge > ageMax) {
        warn(
          `Ветка не помещается на холсте. Максимальная длина — ${ageMax - selectedNode.age} лет (до ${ageMax}-летия).`
        );
        return;
      }

      // Новая ветка всегда смещается от события наружу (от главной
      // линии): между событием и веткой появляется соединитель с дугой
      // уже у ПЕРВОЙ ветки, и ветка не накладывается на линию события.
      // B12-walk по занятым x — с фазы 2 branchId это чистая ПРЕЗЕНТАЦИЯ
      // (совпадение x не сливает ветки), но визуально наложенные ветки
      // нечитаемы. LINE_X_POSITION пропускаем — ветка на x главной линии
      // сделала бы legacy-события без ссылки «root» при build (Д9).
      const OFFSET_STEP = 100;
      const outwardDir = nodeX >= LINE_X_POSITION ? 1 : -1;
      let proposedBranchX = nodeX + outwardDir * OFFSET_STEP;
      while (
        proposedBranchX === LINE_X_POSITION ||
        edges.some((e) => e.x === proposedBranchX)
      ) {
        proposedBranchX += outwardDir * OFFSET_STEP;
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
    [branchYears, edges, nodes, setEdges, onHistoryRecord, onClearForm, warn]
  );

  /**
   * Update length of existing branch
   */
  const updateBranchLength = useCallback(() => {
    if (!selectedEdge) return;

    const years = parseFloat(branchYears);
    if (isNaN(years) || years <= 0) {
      warn('Введите корректное количество лет');
      return;
    }

    const newEndAge = selectedEdge.startAge + years;

    // Check maximum age
    if (newEndAge > ageMax) {
      warn(`Максимальный возраст: ${ageMax} лет`);
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
        warn(
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
  }, [selectedEdge, branchYears, ageMax, edges, nodes, setEdges, onHistoryRecord, warn]);

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
        warn(
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
  }, [selectedEdge, nodes, edges, setNodes, setEdges, onHistoryRecord, warn]);

  /**
   * Переименовать выбранную ветку. Пустая строка сбрасывает название —
   * тогда на холсте показывается название origin-события (дефолт).
   */
  const renameBranch = useCallback(
    (rawLabel: string) => {
      if (!selectedEdge) return;
      const label = rawLabel.trim() || undefined;
      if ((selectedEdge.label ?? undefined) === label) return;
      const updatedEdges = edges.map((e) =>
        e.id === selectedEdge.id ? { ...e, label } : e
      );
      setEdges(updatedEdges);
      onHistoryRecord?.(nodes, updatedEdges);
    },
    [selectedEdge, edges, nodes, setEdges, onHistoryRecord]
  );

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
    renameBranch,
    deleteBranch,
    handleExtendBranchForBulk,
    handleSelectBranch,
    handleHideBranchEditor,
  };
}
