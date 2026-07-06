import { useCallback } from 'react';
import { LINE_X_POSITION } from '../constants';
import { parseAge } from '../utils';
import {
  buildTimelineTree,
  collectDescendantIds,
  findEventInTree,
  findParentBranch,
} from '../utils/timelineTree';
import type { NodeT, EdgeT, Sphere, EventIconId } from '../types';

interface UseTimelineCRUDOptions {
  nodes: NodeT[];
  edges: EdgeT[];
  ageMax: number;
  setNodes: (nodes: NodeT[]) => void;
  setEdges: (edges: EdgeT[]) => void;
  onHistoryRecord?: (nodes?: NodeT[], edges?: EdgeT[]) => void;
  onClearForm?: () => void;
  onSetSelectedId?: (id: string | null) => void;
  onAfterClearAll?: () => void;
}

interface FormEventData {
  id: string | null;
  age: string;
  label: string;
  notes: string;
  sphere: Sphere | undefined;
  isDecision: boolean;
  icon: EventIconId | null;
}

/**
 * Hook for CRUD operations on timeline events
 */
export function useTimelineCRUD({
  nodes,
  edges,
  ageMax,
  setNodes,
  setEdges,
  onHistoryRecord,
  onClearForm,
  onSetSelectedId,
  onAfterClearAll,
}: UseTimelineCRUDOptions) {
  /**
   * Create or update an event
   */
  const handleFormSubmit = useCallback(
    (formData: FormEventData, selectedBranchId: string | null) => {
      if (!formData.label.trim()) return;

      if (!formData.age.trim()) {
        alert('Пожалуйста, укажите возраст события');
        return;
      }

      const parsedAge = parseAge(formData.age);
      if (isNaN(parsedAge) || parsedAge < 0 || parsedAge > ageMax) {
        alert(`Возраст должен быть от 0 до ${ageMax} лет`);
        return;
      }

      if (formData.id) {
        // Edit existing event
        const original = nodes.find((n) => n.id === formData.id);
        const oldAge = original?.age;
        const tree = buildTimelineTree(nodes, edges);

        // B11: if the edited event lives on a branch, the new age must
        // stay within that branch's age window — otherwise it would
        // visually orphan above/below the line that anchors it.
        // Membership comes from the tree (not `edge.x === parentX`):
        // with shared-x branches the flat lookup can validate against a
        // different branch than the one operations actually use (Д4).
        const parentBranch = findParentBranch(tree, formData.id);
        if (
          parentBranch &&
          (parsedAge < parentBranch.startAge || parsedAge > parentBranch.endAge)
        ) {
          alert(
            `Возраст ${parsedAge} вне диапазона ветки (${parentBranch.startAge}–${parentBranch.endAge} лет). Сначала измените длину ветки или перенесите событие на главную линию.`
          );
          return;
        }

        // B10: if the edited event is the origin of one or more branches,
        // slide each branch's age window by the same delta so the branch
        // stays attached to its origin event. Length is preserved (except
        // the ageMax clamp). Д3: refuse when an event already on such a
        // branch would fall outside the slid window — otherwise it ends
        // up visually orphaned beyond the branch segment.
        const ageChanged = oldAge !== undefined && oldAge !== parsedAge;
        let updatedEdges = edges;
        if (ageChanged) {
          const deltaAge = parsedAge - oldAge!;
          const slidWindows = new Map<string, { startAge: number; endAge: number }>();
          for (const e of edges) {
            if (e.nodeId !== formData.id) continue;
            // Кламп с обеих сторон: endAge не выше ageMax, startAge не
            // ниже 0 (legacy-окна после I12-healing могут начинаться
            // раньше возраста origin — сдвиг вниз ушёл бы в минус).
            const startAge = Math.max(e.startAge + deltaAge, 0);
            slidWindows.set(e.id, {
              startAge,
              // Не даём окну инвертироваться, когда пустая legacy-ветка
              // целиком ниже нуля после сдвига (ручной JSON).
              endAge: Math.max(Math.min(e.endAge + deltaAge, ageMax), startAge),
            });
          }
          if (slidWindows.size > 0) {
            const eventInTree = findEventInTree(tree, formData.id);
            const offenders =
              eventInTree?.branches.flatMap((branch) => {
                const window = slidWindows.get(branch.data.id);
                if (!window) return [];
                return branch.events.filter(
                  (ev) => ev.data.age < window.startAge || ev.data.age > window.endAge
                );
              }) ?? [];
            if (offenders.length > 0) {
              const sample = offenders
                .slice(0, 3)
                .map((ev) => `«${ev.data.label}» (${ev.data.age} лет)`)
                .join(', ');
              const more = offenders.length > 3 ? ` и ещё ${offenders.length - 3}` : '';
              alert(
                `На ветке есть события, которые выпадут из нового диапазона: ${sample}${more}. Сначала перенесите их или удалите.`
              );
              return;
            }
            updatedEdges = edges.map((e) => {
              const window = slidWindows.get(e.id);
              return window ? { ...e, ...window } : e;
            });
            setEdges(updatedEdges);
          }
        }

        const updatedNodes = nodes.map((n) =>
          n.id === formData.id
            ? {
                ...n,
                age: parsedAge,
                label: formData.label,
                notes: formData.notes,
                sphere: formData.sphere,
                isDecision: formData.isDecision,
                iconId: formData.icon ?? undefined,
                x: n.x ?? LINE_X_POSITION,
                parentX: n.parentX,
              }
            : n
        );

        setNodes(updatedNodes);
        onHistoryRecord?.(updatedNodes, updatedEdges);
      } else {
        // Add new event
        let eventX = LINE_X_POSITION;
        let eventParentX: number | undefined = undefined;
        let eventSphere = formData.sphere;

        if (selectedBranchId !== null) {
          const selectedEdge = edges.find((e) => e.id === selectedBranchId);
          if (selectedEdge) {
            const inRange = parsedAge >= selectedEdge.startAge && parsedAge <= selectedEdge.endAge;
            if (inRange) {
              eventX = selectedEdge.x;
              eventParentX = selectedEdge.x;
            } else {
              alert(
                `Возраст события (${parsedAge} лет) не попадает в диапазон выбранной ветки (${selectedEdge.startAge}-${selectedEdge.endAge} лет). Событие будет добавлено на основную линию жизни.`
              );
            }
            // Auto-pickup sphere from branch origin even if age out of range.
            if (!eventSphere) {
              const originNode = nodes.find((n) => n.id === selectedEdge.nodeId);
              if (originNode && originNode.sphere) {
                eventSphere = originNode.sphere;
              }
            }
          }
        }

        const node: NodeT = {
          id: crypto.randomUUID(),
          age: parsedAge,
          x: eventX,
          parentX: eventParentX, // Branch x (or undefined for main line)
          label: formData.label,
          notes: formData.notes,
          sphere: eventSphere,
          isDecision: formData.isDecision,
          iconId: formData.icon ?? undefined,
        };
        const newNodes = [...nodes, node];
        setNodes(newNodes);
        onSetSelectedId?.(node.id);
        onHistoryRecord?.(newNodes, edges);
      }

      // Clear form
      onClearForm?.();
    },
    [nodes, edges, ageMax, setNodes, onHistoryRecord, onSetSelectedId, onClearForm]
  );

  /**
   * Update specific fields of a node
   */
  const updateNode = useCallback(
    (id: string, updates: Partial<NodeT>) => {
      setNodes(nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)));
    },
    [nodes, setNodes]
  );

  /**
   * Delete a node and the entire subtree rooted at it: every direct
   * branch from the event, every event living on those branches, and
   * (recursively) any branches and events those carry. Walks the
   * topology tree so nothing is left orphaned in Firestore — fixes
   * B6 (events on deleted branches) and B7 (cascade past one level).
   */
  const deleteNode = useCallback(
    (id: string) => {
      const tree = buildTimelineTree(nodes, edges);
      const collected = collectDescendantIds(tree, id);

      let nextNodes: NodeT[];
      let nextEdges: EdgeT[];
      if (!collected) {
        // Event isn't in the tree (orphan with broken parentX, or
        // already gone). Defensive single-id delete.
        nextNodes = nodes.filter((n) => n.id !== id);
        nextEdges = edges.filter((e) => e.nodeId !== id);
      } else {
        const { eventIds, edgeIds } = collected;
        nextNodes = nodes.filter((n) => !eventIds.has(n.id));
        nextEdges = edges.filter((e) => !edgeIds.has(e.id));
      }
      setNodes(nextNodes);
      setEdges(nextEdges);

      onClearForm?.();
      // Д2: передаём состояние явно — вызов без аргументов заставил бы
      // recordHistory в Timeline.tsx записать в историю closure-состояние
      // ДО удаления, и redo удаления стало бы невозможным (I10).
      onHistoryRecord?.(nextNodes, nextEdges);
    },
    [nodes, edges, setNodes, setEdges, onClearForm, onHistoryRecord]
  );

  /**
   * Bulk create multiple events
   */
  const handleBulkCreate = useCallback(
    (events: Omit<NodeT, 'id'>[]) => {
      const newNodes: NodeT[] = events.map((event) => ({
        ...event,
        id: crypto.randomUUID(),
      }));

      const updatedNodes = [...nodes, ...newNodes];
      setNodes(updatedNodes);
      onHistoryRecord?.(updatedNodes, edges);
    },
    [nodes, edges, setNodes, onHistoryRecord]
  );

  /**
   * Clear all events
   */
  const handleClearAll = useCallback(() => {
    if (confirm('Очистить весь холст? Это действие нельзя отменить.')) {
      onClearForm?.();
      setNodes([]);
      setEdges([]);
      onHistoryRecord?.([], []);
      onAfterClearAll?.();
    }
  }, [setNodes, setEdges, onClearForm, onHistoryRecord, onAfterClearAll]);

  return {
    handleFormSubmit,
    updateNode,
    deleteNode,
    handleBulkCreate,
    handleClearAll,
  };
}
