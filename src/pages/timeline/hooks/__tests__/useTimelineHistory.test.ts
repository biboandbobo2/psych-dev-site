import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useTimelineHistory } from '../useTimelineHistory';

describe('useTimelineHistory', () => {
  it('keeps handlers stable across rerenders and history updates', () => {
    const { result, rerender } = renderHook(() => useTimelineHistory());

    const initialHandlers = {
      saveToHistory: result.current.saveToHistory,
      undo: result.current.undo,
      redo: result.current.redo,
      moveBackward: result.current.moveBackward,
      moveForward: result.current.moveForward,
      resetHistory: result.current.resetHistory,
    };

    rerender();

    expect(result.current.saveToHistory).toBe(initialHandlers.saveToHistory);
    expect(result.current.undo).toBe(initialHandlers.undo);
    expect(result.current.redo).toBe(initialHandlers.redo);
    expect(result.current.moveBackward).toBe(initialHandlers.moveBackward);
    expect(result.current.moveForward).toBe(initialHandlers.moveForward);
    expect(result.current.resetHistory).toBe(initialHandlers.resetHistory);

    act(() => {
      result.current.saveToHistory([{ id: 'n1', age: 1, label: 'A', isDecision: false }], [], {});
    });

    expect(result.current.saveToHistory).toBe(initialHandlers.saveToHistory);
    expect(result.current.undo).toBe(initialHandlers.undo);
    expect(result.current.redo).toBe(initialHandlers.redo);
    expect(result.current.moveBackward).toBe(initialHandlers.moveBackward);
    expect(result.current.moveForward).toBe(initialHandlers.moveForward);
    expect(result.current.resetHistory).toBe(initialHandlers.resetHistory);
    expect(result.current.historyLength).toBe(1);
  });

  it('resets history state', () => {
    const { result } = renderHook(() => useTimelineHistory());

    act(() => {
      result.current.saveToHistory([{ id: 'n1', age: 1, label: 'A', isDecision: false }], [], {});
      result.current.saveToHistory([{ id: 'n2', age: 2, label: 'B', isDecision: false }], [], {});
    });

    expect(result.current.historyLength).toBe(2);

    act(() => {
      result.current.resetHistory();
    });

    expect(result.current.historyLength).toBe(0);
    expect(result.current.historyIndex).toBe(-1);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });
});
