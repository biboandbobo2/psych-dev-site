import { useCallback } from 'react';
import { LINE_X_POSITION } from '../constants';
import { parseAge } from '../utils';
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
}: UseTimelineCRUDOptions) {
  /**
   * Create or update an event
   */
  const handleFormSubmit = useCallback(
    (formData: FormEventData, selectedBranchX: number | null) => {
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
        onHistoryRecord?.(updatedNodes, edges);
      } else {
        // Add new event
        let eventX = LINE_X_POSITION;
        let eventSphere = formData.sphere;

        // If branch is selected, check if age falls within its range
        if (selectedBranchX !== null) {
          // Find edge with matching X that covers the specified age
          const selectedEdge = edges.find(
            (e) => e.x === selectedBranchX && parsedAge >= e.startAge && parsedAge <= e.endAge
          );

          if (selectedEdge) {
            // Age falls within branch range
            eventX = selectedBranchX;

            // Take sphere from branch origin node (always, if not manually specified)
            if (!eventSphere) {
              const originNode = nodes.find((n) => n.id === selectedEdge.nodeId);
              if (originNode && originNode.sphere) {
                eventSphere = originNode.sphere;
              }
            }
          } else {
            // If no exact match, try to find any branch with this X
            // and take sphere from its origin node (for auto-pickup)
            const anyEdgeAtX = edges.find((e) => e.x === selectedBranchX);
            if (anyEdgeAtX) {
              // Auto-pickup sphere even if age not in range
              if (!eventSphere) {
                const originNode = nodes.find((n) => n.id === anyEdgeAtX.nodeId);
                if (originNode && originNode.sphere) {
                  eventSphere = originNode.sphere;
                }
              }

              alert(
                `Возраст события (${parsedAge} лет) не попадает в диапазон выбранной ветки (${anyEdgeAtX.startAge}-${anyEdgeAtX.endAge} лет). Событие будет добавлено на основную линию жизни.`
              );
            }
          }
        }

        const node: NodeT = {
          id: crypto.randomUUID(),
          age: parsedAge,
          x: eventX,
          parentX: selectedBranchX ?? undefined, // Remember parent line
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
   * Delete a node and all its branches
   */
  const deleteNode = useCallback(
    (id: string) => {
      setNodes(nodes.filter((n) => n.id !== id));
      // Also delete all branches connected to this event
      setEdges(edges.filter((e) => e.nodeId !== id));
      onClearForm?.();
      onHistoryRecord?.();
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
    if (confirm('Удалить все события? Это действие нельзя отменить.')) {
      onClearForm?.();
      setNodes([]);
      setEdges([]);
      onHistoryRecord?.([], []);
    }
  }, [setNodes, setEdges, onClearForm, onHistoryRecord]);

  return {
    handleFormSubmit,
    updateNode,
    deleteNode,
    handleBulkCreate,
    handleClearAll,
  };
}
