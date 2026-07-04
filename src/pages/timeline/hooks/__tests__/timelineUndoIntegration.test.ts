/**
 * Интеграционные тесты связки undo/redo (I10, Д1/Д2 из
 * docs/plans/timeline-invariant-audit.md).
 *
 * Harness повторяет композицию Timeline.tsx: useTimelineUndoRedo (реальная
 * связка истории с baseline-досеиванием) + useTimelineCRUD поверх общего
 * state. Сама логика undo/redo — продакшн-код, не копия.
 */
import { StrictMode, useState } from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useTimelineUndoRedo } from '../useTimelineUndoRedo';
import { useTimelineCRUD } from '../useTimelineCRUD';
import type { BirthDetails, EdgeT, NodeT } from '../../types';

global.alert = vi.fn();

function useHarness(initialNodes: NodeT[], initialEdges: EdgeT[] = []) {
  const [nodes, setNodes] = useState<NodeT[]>(initialNodes);
  const [edges, setEdges] = useState<EdgeT[]>(initialEdges);
  const [birthDetails, setBirthDetails] = useState<BirthDetails>({});

  const { recordHistory, undo, redo, resetHistory, canUndo, canRedo } = useTimelineUndoRedo({
    nodes,
    edges,
    birthDetails,
    setNodes,
    setEdges,
    setBirthDetails,
  });

  const crud = useTimelineCRUD({
    nodes,
    edges,
    ageMax: 100,
    setNodes,
    setEdges,
    onHistoryRecord: recordHistory,
  });

  // Как resetTransientTimelineUi + смена данных при переключении холста
  // в Timeline.tsx: данные нового холста и resetHistory в одном коммите.
  const switchCanvas = (nextNodes: NodeT[], nextEdges: EdgeT[]) => {
    setNodes(nextNodes);
    setEdges(nextEdges);
    resetHistory();
  };

  return { nodes, edges, crud, undo, redo, canUndo, canRedo, switchCanvas };
}

const nodeA: NodeT = { id: 'a', age: 10, x: 2000, label: 'A', isDecision: false };

function addEvent(result: { current: ReturnType<typeof useHarness> }, label: string, age: string) {
  act(() => {
    result.current.crud.handleFormSubmit(
      { id: null, age, label, notes: '', sphere: undefined, isDecision: false, icon: null },
      null
    );
  });
}

describe('I10: undo/redo восстанавливает точное предыдущее состояние', () => {
  it('Д1: первое действие (deleteNode) можно отменить', () => {
    const { result } = renderHook(() => useHarness([nodeA]));

    act(() => {
      result.current.crud.deleteNode('a');
    });
    expect(result.current.nodes).toEqual([]);

    expect(result.current.canUndo).toBe(true);
    act(() => {
      result.current.undo();
    });
    expect(result.current.nodes.map((n) => n.id)).toEqual(['a']);
  });

  it('Д2: redo повторно применяет удаление', () => {
    const { result } = renderHook(() => useHarness([nodeA]));

    addEvent(result, 'B', '20');
    const idB = result.current.nodes.find((n) => n.label === 'B')!.id;

    act(() => {
      result.current.crud.deleteNode(idB);
    });
    expect(result.current.nodes.map((n) => n.label)).toEqual(['A']);

    act(() => {
      result.current.undo();
    });
    expect(result.current.nodes.map((n) => n.label)).toEqual(['A', 'B']);

    act(() => {
      result.current.redo();
    });
    expect(result.current.nodes.map((n) => n.label)).toEqual(['A']);
  });

  it('переключение холста: baseline пересеивается данными нового холста', () => {
    const { result } = renderHook(() => useHarness([nodeA]));

    addEvent(result, 'B', '20');
    expect(result.current.canUndo).toBe(true);

    const canvas2: NodeT[] = [{ id: 'x', age: 50, x: 2000, label: 'X', isDecision: false }];
    act(() => {
      result.current.switchCanvas(canvas2, []);
    });

    // История нового холста чиста: отменять нечего…
    expect(result.current.canUndo).toBe(false);
    // …но первое же действие на нём отменяемо до baseline нового холста.
    act(() => {
      result.current.crud.deleteNode('x');
    });
    expect(result.current.nodes).toEqual([]);
    act(() => {
      result.current.undo();
    });
    expect(result.current.nodes.map((n) => n.id)).toEqual(['x']);
  });

  it('StrictMode: двойной mount-эффект не создаёт второй baseline (canUndo=false)', () => {
    const { result } = renderHook(() => useHarness([nodeA]), { wrapper: StrictMode });
    expect(result.current.canUndo).toBe(false);

    act(() => {
      result.current.crud.deleteNode('a');
    });
    expect(result.current.canUndo).toBe(true);
    act(() => {
      result.current.undo();
    });
    expect(result.current.nodes.map((n) => n.id)).toEqual(['a']);
    expect(result.current.canUndo).toBe(false); // ровно один baseline
  });

  it('undo → новое действие обрезает redo-хвост (стандартная семантика)', () => {
    const { result } = renderHook(() => useHarness([nodeA]));

    addEvent(result, 'B', '20');
    addEvent(result, 'C', '30');
    act(() => {
      result.current.undo();
    });
    expect(result.current.nodes.map((n) => n.label)).toEqual(['A', 'B']);

    addEvent(result, 'D', '40');
    expect(result.current.canRedo).toBe(false);
    expect(result.current.nodes.map((n) => n.label)).toEqual(['A', 'B', 'D']);
  });
});
