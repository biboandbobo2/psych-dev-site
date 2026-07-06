import { useEffect } from 'react';
import { useTimelineHistory } from './useTimelineHistory';
import type { BirthDetails, EdgeT, NodeT } from '../types';

interface UseTimelineUndoRedoOptions {
  nodes: NodeT[];
  edges: EdgeT[];
  birthDetails: BirthDetails;
  setNodes: (nodes: NodeT[]) => void;
  setEdges: (edges: EdgeT[]) => void;
  setBirthDetails: (birth: BirthDetails) => void;
}

/**
 * Связка истории undo/redo с состоянием таймлайна (вынесена из
 * Timeline.tsx, чтобы её семантику покрывали тесты — см.
 * timelineUndoIntegration.test.ts).
 *
 * Конвенция: операции записывают в историю состояние ПОСЛЕ действия
 * (через recordHistory с явными аргументами), а baseline — состояние
 * холста до первого действия — досеивается эффектом, как только история
 * пуста. Без baseline первое действие было бы неотменяемым (Д1/I10):
 * canUndo требует index > 0, а history[0] содержал бы уже изменённое
 * состояние.
 */
export function useTimelineUndoRedo({
  nodes,
  edges,
  birthDetails,
  setNodes,
  setEdges,
  setBirthDetails,
}: UseTimelineUndoRedoOptions) {
  const {
    saveToHistory,
    seedBaselineIfEmpty,
    undo: fetchUndoSnapshot,
    redo: fetchRedoSnapshot,
    moveBackward,
    moveForward,
    resetHistory,
    canUndo,
    canRedo,
    historyIndex,
    historyLength,
  } = useTimelineHistory();

  // historyLength в deps перезапускает эффект после resetHistory
  // (переключение холста, импорт биографии) — baseline досеивается
  // данными нового холста. Сам seed идемпотентен (sync-проверка по ref).
  useEffect(() => {
    seedBaselineIfEmpty(nodes, edges, birthDetails);
  }, [historyLength, nodes, edges, birthDetails, seedBaselineIfEmpty]);

  const recordHistory = (customNodes?: NodeT[], customEdges?: EdgeT[], customBirth?: BirthDetails) => {
    saveToHistory(customNodes ?? nodes, customEdges ?? edges, customBirth ?? birthDetails);
  };

  const undo = () => {
    const prev = fetchUndoSnapshot();
    if (!prev) return;
    setNodes(prev.nodes);
    setEdges(prev.edges);
    setBirthDetails(prev.birth);
    moveBackward();
  };

  const redo = () => {
    const next = fetchRedoSnapshot();
    if (!next) return;
    setNodes(next.nodes);
    setEdges(next.edges);
    setBirthDetails(next.birth);
    moveForward();
  };

  return {
    recordHistory,
    undo,
    redo,
    resetHistory,
    canUndo,
    canRedo,
    historyIndex,
    historyLength,
  };
}
