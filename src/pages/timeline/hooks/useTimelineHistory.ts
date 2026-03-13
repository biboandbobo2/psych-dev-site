import { useCallback, useEffect, useRef, useState } from 'react';
import type { NodeT, EdgeT, BirthDetails, HistoryState } from '../types';
import { MAX_HISTORY_LENGTH } from '../constants';

/**
 * Хук для управления историей изменений (undo/redo)
 */
export function useTimelineHistory() {
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const historyRef = useRef(history);
  const historyIndexRef = useRef(historyIndex);

  useEffect(() => {
    historyRef.current = history;
    historyIndexRef.current = historyIndex;
  }, [history, historyIndex]);

  /**
   * Сохраняет текущее состояние в историю
   */
  const saveToHistory = useCallback((nodes: NodeT[], edges: EdgeT[], birthDetails: BirthDetails) => {
    const newState: HistoryState = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
      birth: { ...birthDetails },
    };

    const currentHistory = historyRef.current;
    const currentIndex = historyIndexRef.current;
    const newHistory = currentHistory.slice(0, currentIndex + 1);
    newHistory.push(newState);

    if (newHistory.length > MAX_HISTORY_LENGTH) {
      newHistory.shift();
    }

    const nextIndex = Math.min(newHistory.length - 1, MAX_HISTORY_LENGTH - 1);
    historyRef.current = newHistory;
    historyIndexRef.current = nextIndex;
    setHistory(newHistory);
    setHistoryIndex(nextIndex);
  }, []);

  /**
   * Отменяет последнее действие
   */
  const undo = useCallback(() => {
    const currentHistory = historyRef.current;
    const currentIndex = historyIndexRef.current;
    if (currentIndex > 0) {
      return currentHistory[currentIndex - 1];
    }
    return null;
  }, []);

  /**
   * Повторяет отменённое действие
   */
  const redo = useCallback(() => {
    const currentHistory = historyRef.current;
    const currentIndex = historyIndexRef.current;
    if (currentIndex < currentHistory.length - 1) {
      return currentHistory[currentIndex + 1];
    }
    return null;
  }, []);

  /**
   * Перемещает индекс назад (для undo)
   */
  const moveBackward = useCallback(() => {
    const currentIndex = historyIndexRef.current;
    if (currentIndex > 0) {
      const nextIndex = currentIndex - 1;
      historyIndexRef.current = nextIndex;
      setHistoryIndex(nextIndex);
    }
  }, []);

  /**
   * Перемещает индекс вперёд (для redo)
   */
  const moveForward = useCallback(() => {
    const currentHistory = historyRef.current;
    const currentIndex = historyIndexRef.current;
    if (currentIndex < currentHistory.length - 1) {
      const nextIndex = currentIndex + 1;
      historyIndexRef.current = nextIndex;
      setHistoryIndex(nextIndex);
    }
  }, []);

  const resetHistory = useCallback(() => {
    historyRef.current = [];
    historyIndexRef.current = -1;
    setHistory([]);
    setHistoryIndex(-1);
  }, []);

  /**
   * Проверяет, можно ли отменить действие
   */
  const canUndo = historyIndex > 0;

  /**
   * Проверяет, можно ли повторить действие
   */
  const canRedo = historyIndex < history.length - 1;

  return {
    saveToHistory,
    undo,
    redo,
    moveBackward,
    moveForward,
    resetHistory,
    canUndo,
    canRedo,
    historyIndex,
    historyLength: history.length,
  };
}
