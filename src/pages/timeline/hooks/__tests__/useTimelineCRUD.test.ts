import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTimelineCRUD } from '../useTimelineCRUD';
import type { NodeT, EdgeT } from '../../types';

// Mock window.alert
global.alert = vi.fn();

describe('useTimelineCRUD', () => {
  let mockNodes: NodeT[];
  let mockEdges: EdgeT[];
  let setNodes: ReturnType<typeof vi.fn>;
  let setEdges: ReturnType<typeof vi.fn>;
  let onHistoryRecord: ReturnType<typeof vi.fn>;
  let onClearForm: ReturnType<typeof vi.fn>;
  let onSetSelectedId: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockNodes = [
      { id: 'node1', age: 20, x: 500, label: 'Событие 1', notes: '', sphere: 'work', isDecision: false },
    ];
    mockEdges = [];
    setNodes = vi.fn();
    setEdges = vi.fn();
    onHistoryRecord = vi.fn();
    onClearForm = vi.fn();
    onSetSelectedId = vi.fn();
    vi.clearAllMocks();
  });

  describe('handleFormSubmit', () => {
    it('создает новое событие', () => {
      const { result } = renderHook(() =>
        useTimelineCRUD({
          nodes: mockNodes,
          edges: mockEdges,
          ageMax: 100,
          setNodes,
          setEdges,
          onHistoryRecord,
          onClearForm,
          onSetSelectedId,
        })
      );

      act(() => {
        result.current.handleFormSubmit(
          {
            id: null,
            age: '25',
            label: 'Новое событие',
            notes: 'Заметки',
            sphere: 'education',
            isDecision: false,
            icon: null,
          },
          null
        );
      });

      expect(setNodes).toHaveBeenCalled();
      const newNodes = setNodes.mock.calls[0][0];
      expect(newNodes).toHaveLength(2);
      expect(newNodes[1]).toMatchObject({
        age: 25,
        label: 'Новое событие',
        notes: 'Заметки',
        sphere: 'education',
      });
      expect(onHistoryRecord).toHaveBeenCalled();
      expect(onClearForm).toHaveBeenCalled();
    });

    it('обновляет существующее событие', () => {
      const { result } = renderHook(() =>
        useTimelineCRUD({
          nodes: mockNodes,
          edges: mockEdges,
          ageMax: 100,
          setNodes,
          setEdges,
          onHistoryRecord,
          onClearForm,
          onSetSelectedId,
        })
      );

      act(() => {
        result.current.handleFormSubmit(
          {
            id: 'node1',
            age: '22',
            label: 'Обновленное событие',
            notes: 'Новые заметки',
            sphere: 'education',
            isDecision: true,
            icon: null,
          },
          null
        );
      });

      expect(setNodes).toHaveBeenCalled();
      const updatedNodes = setNodes.mock.calls[0][0];
      expect(updatedNodes[0]).toMatchObject({
        id: 'node1',
        age: 22,
        label: 'Обновленное событие',
        notes: 'Новые заметки',
        sphere: 'education',
        isDecision: true,
      });
    });

    it('отклоняет пустой label', () => {
      const { result } = renderHook(() =>
        useTimelineCRUD({
          nodes: mockNodes,
          edges: mockEdges,
          ageMax: 100,
          setNodes,
          setEdges,
          onHistoryRecord,
          onClearForm,
          onSetSelectedId,
        })
      );

      act(() => {
        result.current.handleFormSubmit(
          {
            id: null,
            age: '25',
            label: '   ',
            notes: '',
            sphere: undefined,
            isDecision: false,
            icon: null,
          },
          null
        );
      });

      expect(setNodes).not.toHaveBeenCalled();
    });

    it('показывает alert для пустого возраста', () => {
      const { result } = renderHook(() =>
        useTimelineCRUD({
          nodes: mockNodes,
          edges: mockEdges,
          ageMax: 100,
          setNodes,
          setEdges,
          onHistoryRecord,
          onClearForm,
          onSetSelectedId,
        })
      );

      act(() => {
        result.current.handleFormSubmit(
          {
            id: null,
            age: '',
            label: 'Событие',
            notes: '',
            sphere: undefined,
            isDecision: false,
            icon: null,
          },
          null
        );
      });

      expect(alert).toHaveBeenCalledWith('Пожалуйста, укажите возраст события');
      expect(setNodes).not.toHaveBeenCalled();
    });

    it('показывает alert для некорректного возраста', () => {
      const { result } = renderHook(() =>
        useTimelineCRUD({
          nodes: mockNodes,
          edges: mockEdges,
          ageMax: 100,
          setNodes,
          setEdges,
          onHistoryRecord,
          onClearForm,
          onSetSelectedId,
        })
      );

      act(() => {
        result.current.handleFormSubmit(
          {
            id: null,
            age: '150',
            label: 'Событие',
            notes: '',
            sphere: undefined,
            isDecision: false,
            icon: null,
          },
          null
        );
      });

      expect(alert).toHaveBeenCalledWith('Возраст должен быть от 0 до 100 лет');
      expect(setNodes).not.toHaveBeenCalled();
    });
  });

  describe('deleteNode', () => {
    it('удаляет ноду и её ветки', () => {
      const mockEdgesWithBranch = [
        { id: 'edge1', x: 500, startAge: 20, endAge: 30, color: '#000', nodeId: 'node1' },
      ];

      const { result } = renderHook(() =>
        useTimelineCRUD({
          nodes: mockNodes,
          edges: mockEdgesWithBranch,
          ageMax: 100,
          setNodes,
          setEdges,
          onHistoryRecord,
          onClearForm,
          onSetSelectedId,
        })
      );

      act(() => {
        result.current.deleteNode('node1');
      });

      expect(setNodes).toHaveBeenCalled();
      expect(setEdges).toHaveBeenCalled();
      const remainingNodes = setNodes.mock.calls[0][0];
      const remainingEdges = setEdges.mock.calls[0][0];
      expect(remainingNodes).toHaveLength(0);
      expect(remainingEdges).toHaveLength(0);
      expect(onClearForm).toHaveBeenCalled();
      expect(onHistoryRecord).toHaveBeenCalled();
    });
  });

  describe('handleBulkCreate', () => {
    it('создает несколько событий', () => {
      const { result } = renderHook(() =>
        useTimelineCRUD({
          nodes: mockNodes,
          edges: mockEdges,
          ageMax: 100,
          setNodes,
          setEdges,
          onHistoryRecord,
          onClearForm,
          onSetSelectedId,
        })
      );

      const newEvents = [
        { age: 25, x: 500, label: 'Событие A', notes: '', sphere: 'work' as const, isDecision: false },
        { age: 30, x: 500, label: 'Событие B', notes: '', sphere: 'education' as const, isDecision: false },
      ];

      act(() => {
        result.current.handleBulkCreate(newEvents);
      });

      expect(setNodes).toHaveBeenCalled();
      const allNodes = setNodes.mock.calls[0][0];
      expect(allNodes).toHaveLength(3); // 1 исходное + 2 новых
      expect(onHistoryRecord).toHaveBeenCalled();
    });
  });

  describe('handleClearAll', () => {
    it('очищает все события после подтверждения', () => {
      global.confirm = vi.fn(() => true);

      const { result } = renderHook(() =>
        useTimelineCRUD({
          nodes: mockNodes,
          edges: mockEdges,
          ageMax: 100,
          setNodes,
          setEdges,
          onHistoryRecord,
          onClearForm,
          onSetSelectedId,
        })
      );

      act(() => {
        result.current.handleClearAll();
      });

      expect(setNodes).toHaveBeenCalledWith([]);
      expect(setEdges).toHaveBeenCalledWith([]);
      expect(onClearForm).toHaveBeenCalled();
      expect(onHistoryRecord).toHaveBeenCalledWith([], []);
    });

    it('не очищает при отмене', () => {
      global.confirm = vi.fn(() => false);

      const { result } = renderHook(() =>
        useTimelineCRUD({
          nodes: mockNodes,
          edges: mockEdges,
          ageMax: 100,
          setNodes,
          setEdges,
          onHistoryRecord,
          onClearForm,
          onSetSelectedId,
        })
      );

      act(() => {
        result.current.handleClearAll();
      });

      expect(setNodes).not.toHaveBeenCalled();
      expect(setEdges).not.toHaveBeenCalled();
    });
  });
});
