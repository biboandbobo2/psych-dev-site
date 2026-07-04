/**
 * Интеграционные тесты связки undo/redo (I10, Д1/Д2 из
 * docs/plans/timeline-invariant-audit.md).
 *
 * Harness повторяет композицию Timeline.tsx: useTimelineUndoRedo (реальная
 * связка истории с baseline-досеиванием) + useTimelineCRUD поверх общего
 * state. Сама логика undo/redo — продакшн-код, не копия.
 */
import { useState } from 'react';
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

  const { recordHistory, undo, redo, canUndo, canRedo } = useTimelineUndoRedo({
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

  return { nodes, edges, crud, undo, redo, canUndo, canRedo };
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
