import { useState } from 'react';
import type { NodeT, EdgeT, BirthDetails, HistoryState } from '../types';
import { MAX_HISTORY_LENGTH } from '../constants';

/**
 * Хук для управления историей изменений (undo/redo)
 */
export function useTimelineHistory() {
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  /**
   * Сохраняет текущее состояние в историю
   */
  function saveToHistory(nodes: NodeT[], edges: EdgeT[], birthDetails: BirthDetails) {
    const newState: HistoryState = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
      birth: { ...birthDetails },
    };

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);

    if (newHistory.length > MAX_HISTORY_LENGTH) {
      newHistory.shift();
    } else {
      setHistoryIndex(historyIndex + 1);
    }

    setHistory(newHistory);
  }

  /**
   * Отменяет последнее действие
   */
  function undo() {
    if (historyIndex > 0) {
      return history[historyIndex - 1];
    }
    return null;
  }

  /**
   * Повторяет отменённое действие
   */
  function redo() {
    if (historyIndex < history.length - 1) {
      return history[historyIndex + 1];
    }
    return null;
  }

  /**
   * Перемещает индекс назад (для undo)
   */
  function moveBackward() {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
    }
  }

  /**
   * Перемещает индекс вперёд (для redo)
   */
  function moveForward() {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
    }
  }

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
    canUndo,
    canRedo,
    historyIndex,
    historyLength: history.length,
  };
}
