import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTimelineCRUD } from '../useTimelineCRUD';
import type { NodeT, EdgeT } from '../../types';

// Mock window.alert
global.alert = vi.fn();

describe('useTimelineCRUD', () => {
  let mockNodes: NodeT[];
  let mockEdges: EdgeT[];
  let setNodes: ReturnType<typeof vi.fn<(nodes: NodeT[]) => void>>;
  let setEdges: ReturnType<typeof vi.fn<(edges: EdgeT[]) => void>>;
  let onHistoryRecord: ReturnType<typeof vi.fn<(nodes?: NodeT[], edges?: EdgeT[]) => void>>;
  let onClearForm: ReturnType<typeof vi.fn<() => void>>;
  let onSetSelectedId: ReturnType<typeof vi.fn<(id: string | null) => void>>;

  beforeEach(() => {
    mockNodes = [
      { id: 'node1', age: 20, x: 500, label: 'Событие 1', notes: '', sphere: 'career', isDecision: false },
    ];
    mockEdges = [];
    setNodes = vi.fn<(nodes: NodeT[]) => void>();
    setEdges = vi.fn<(edges: EdgeT[]) => void>();
    onHistoryRecord = vi.fn<(nodes?: NodeT[], edges?: EdgeT[]) => void>();
    onClearForm = vi.fn<() => void>();
    onSetSelectedId = vi.fn<(id: string | null) => void>();
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

    it('B10: editing the age of a branch origin slides edge.startAge/endAge by the same delta', () => {
      const nodesWithOrigin: NodeT[] = [
        { id: 'origin', age: 20, x: 2000, label: 'Origin', isDecision: false, sphere: 'career' },
      ];
      const edgesFromOrigin: EdgeT[] = [
        { id: 'e1', x: 2100, startAge: 20, endAge: 30, color: '#000', nodeId: 'origin' },
      ];

      const { result } = renderHook(() =>
        useTimelineCRUD({
          nodes: nodesWithOrigin,
          edges: edgesFromOrigin,
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
            id: 'origin',
            age: '25',
            label: 'Origin',
            notes: '',
            sphere: 'career',
            isDecision: false,
            icon: null,
          },
          null
        );
      });

      expect(setEdges).toHaveBeenCalledTimes(1);
      const edgesArg = setEdges.mock.calls[0]![0];
      expect(edgesArg[0]).toMatchObject({ id: 'e1', startAge: 25, endAge: 35 });
    });

    it('B10: clamps endAge to ageMax when origin moves close to ageMax', () => {
      const nodesWithOrigin: NodeT[] = [
        { id: 'origin', age: 90, x: 2000, label: 'Old', isDecision: false, sphere: 'career' },
      ];
      const edgesFromOrigin: EdgeT[] = [
        { id: 'e1', x: 2100, startAge: 90, endAge: 95, color: '#000', nodeId: 'origin' },
      ];

      const { result } = renderHook(() =>
        useTimelineCRUD({
          nodes: nodesWithOrigin,
          edges: edgesFromOrigin,
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
            id: 'origin',
            age: '98',
            label: 'Old',
            notes: '',
            sphere: 'career',
            isDecision: false,
            icon: null,
          },
          null
        );
      });

      const edgesArg = setEdges.mock.calls[0]![0];
      expect(edgesArg[0]).toMatchObject({ id: 'e1', startAge: 98, endAge: 100 }); // clamped
    });

    it('does NOT touch edges when editing an event that is not a branch origin', () => {
      const nodesWithChild: NodeT[] = [
        { id: 'child', age: 25, x: 2100, parentX: 2100, label: 'Child', isDecision: false, sphere: 'career' },
      ];
      const edgesUnrelated: EdgeT[] = [
        { id: 'e1', x: 2100, startAge: 20, endAge: 30, color: '#000', nodeId: 'origin' },
      ];

      const { result } = renderHook(() =>
        useTimelineCRUD({
          nodes: nodesWithChild,
          edges: edgesUnrelated,
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
            id: 'child',
            age: '27',
            label: 'Child',
            notes: '',
            sphere: 'career',
            isDecision: false,
            icon: null,
          },
          null
        );
      });

      expect(setEdges).not.toHaveBeenCalled();
    });

    it('B11: rejects an edit that pushes a branch event outside the branch range', () => {
      // Фикстура — валидный граф: origin существует, иначе ветка висячая
      // и дерево (как и normalize при загрузке) её отбрасывает.
      const nodesOnBranch: NodeT[] = [
        { id: 'origin', age: 20, x: 2000, label: 'Origin', isDecision: false },
        { id: 'b', age: 25, x: 2100, parentX: 2100, label: 'Event', isDecision: false, sphere: 'career' },
      ];
      const branchEdge: EdgeT[] = [
        { id: 'e1', x: 2100, startAge: 20, endAge: 30, color: '#000', nodeId: 'origin' },
      ];

      const { result } = renderHook(() =>
        useTimelineCRUD({
          nodes: nodesOnBranch,
          edges: branchEdge,
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
            id: 'b',
            age: '50', // outside [20, 30]
            label: 'Event',
            notes: '',
            sphere: 'career',
            isDecision: false,
            icon: null,
          },
          null
        );
      });

      expect(alert).toHaveBeenCalledWith(expect.stringContaining('вне диапазона ветки'));
      expect(setNodes).not.toHaveBeenCalled();
    });

    it('B11: allows an edit that stays within the branch range', () => {
      const nodesOnBranch: NodeT[] = [
        { id: 'b', age: 25, x: 2100, parentX: 2100, label: 'Event', isDecision: false, sphere: 'career' },
      ];
      const branchEdge: EdgeT[] = [
        { id: 'e1', x: 2100, startAge: 20, endAge: 30, color: '#000', nodeId: 'origin' },
      ];

      const { result } = renderHook(() =>
        useTimelineCRUD({
          nodes: nodesOnBranch,
          edges: branchEdge,
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
            id: 'b',
            age: '28', // inside [20, 30]
            label: 'Event',
            notes: '',
            sphere: 'career',
            isDecision: false,
            icon: null,
          },
          null
        );
      });

      expect(setNodes).toHaveBeenCalled();
    });

    it('does not call setEdges when age is unchanged', () => {
      const nodesWithOrigin: NodeT[] = [
        { id: 'origin', age: 20, x: 2000, label: 'Origin', isDecision: false, sphere: 'career' },
      ];
      const edgesFromOrigin: EdgeT[] = [
        { id: 'e1', x: 2100, startAge: 20, endAge: 30, color: '#000', nodeId: 'origin' },
      ];

      const { result } = renderHook(() =>
        useTimelineCRUD({
          nodes: nodesWithOrigin,
          edges: edgesFromOrigin,
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
            id: 'origin',
            age: '20',
            label: 'Renamed',
            notes: '',
            sphere: 'career',
            isDecision: false,
            icon: null,
          },
          null
        );
      });

      expect(setEdges).not.toHaveBeenCalled();
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
        { age: 25, x: 500, label: 'Событие A', notes: '', sphere: 'career' as const, isDecision: false },
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

  // ===== Аудит инвариантов (docs/plans/timeline-invariant-audit.md) =====

  describe('Д2: deleteNode и история', () => {
    it('передаёт в onHistoryRecord состояние ПОСЛЕ удаления', () => {
      // recordHistory в Timeline.tsx при вызове без аргументов подставляет
      // closure-состояние, а setNodes ещё не отработал — в историю попадает
      // состояние ДО удаления, и redo удаления становится невозможен (I10).
      const nodes: NodeT[] = [
        ...mockNodes,
        { id: 'node2', age: 40, x: 2000, label: 'Остаётся', isDecision: false },
      ];
      const edges: EdgeT[] = [
        { id: 'edge1', x: 500, startAge: 20, endAge: 30, color: '#000', nodeId: 'node1' },
      ];
      const { result } = renderHook(() =>
        useTimelineCRUD({
          nodes,
          edges,
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

      const remainingNodes = setNodes.mock.calls[0][0];
      const remainingEdges = setEdges.mock.calls[0][0];
      expect(remainingNodes.map((n: NodeT) => n.id)).toEqual(['node2']);
      expect(onHistoryRecord).toHaveBeenCalledWith(remainingNodes, remainingEdges);
    });
  });

  describe('Д3: B10-сдвиг окна ветки не должен осиротять события на ней', () => {
    const origin: NodeT = { id: 'o', age: 20, x: 2000, label: 'Origin', isDecision: false };
    const branchEvent: NodeT = {
      id: 'ev',
      age: 28,
      x: 2100,
      parentX: 2100,
      label: 'На ветке',
      isDecision: false,
    };
    const branch: EdgeT = { id: 'br', x: 2100, startAge: 20, endAge: 30, color: '#000', nodeId: 'o' };

    function submitOriginAge(nodes: NodeT[], edges: EdgeT[], newAge: string) {
      const { result } = renderHook(() =>
        useTimelineCRUD({
          nodes,
          edges,
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
          { id: 'o', age: newAge, label: 'Origin', notes: '', sphere: undefined, isDecision: false, icon: null },
          null
        );
      });
    }

    it('отказывает, если событие выпадает из сдвинутого окна (сдвиг вниз)', () => {
      // Окно [20,30] → [15,25]; событие ev (28) остаётся за краем.
      submitOriginAge([origin, branchEvent], [branch], '15');
      expect(alert).toHaveBeenCalledWith(expect.stringContaining('На ветке'));
      expect(setNodes).not.toHaveBeenCalled();
      expect(setEdges).not.toHaveBeenCalled();
    });

    it('отказывает, если кламп endAge к ageMax укорачивает ветку под событием', () => {
      // Окно [20,30] → [95,105] → кламп [95,100]; событие ev (28) вне окна.
      submitOriginAge([origin, branchEvent], [branch], '95');
      expect(alert).toHaveBeenCalled();
      expect(setNodes).not.toHaveBeenCalled();
      expect(setEdges).not.toHaveBeenCalled();
    });

    it('разрешает сдвиг, когда все события ветки остаются в окне', () => {
      // Окно [20,30] → [18,28]; событие ev (28) на границе — допустимо.
      submitOriginAge([origin, branchEvent], [branch], '18');
      expect(setNodes).toHaveBeenCalled();
      expect(setEdges).toHaveBeenCalled();
      const slid = setEdges.mock.calls[0][0][0];
      expect(slid).toMatchObject({ startAge: 18, endAge: 28 });
    });
  });

  describe('Д4: B11-валидатор должен согласовываться с деревом при shared-x', () => {
    it('валидирует возраст по ветке, которой событие принадлежит в дереве, а не по первой с тем же x', () => {
      // Две ветки делят x=2100. Дерево отдаёт ev ветке A (o1 раньше в
      // nodes[]), а edges.find(e => e.x === parentX) находит B (раньше в
      // edges[]) — валидатор проверяет чужое окно и ложно отклоняет.
      const o1: NodeT = { id: 'o1', age: 10, x: 2000, label: 'O1', isDecision: false };
      const o2: NodeT = { id: 'o2', age: 30, x: 2000, label: 'O2', isDecision: false };
      const ev: NodeT = { id: 'ev', age: 15, x: 2100, parentX: 2100, label: 'Ev', isDecision: false };
      const edgeB: EdgeT = { id: 'B', x: 2100, startAge: 30, endAge: 40, color: '#000', nodeId: 'o2' };
      const edgeA: EdgeT = { id: 'A', x: 2100, startAge: 10, endAge: 20, color: '#000', nodeId: 'o1' };

      const { result } = renderHook(() =>
        useTimelineCRUD({
          nodes: [o1, o2, ev],
          edges: [edgeB, edgeA],
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
          { id: 'ev', age: '18', label: 'Ev', notes: '', sphere: undefined, isDecision: false, icon: null },
          null
        );
      });

      // 18 входит в окно A [10,20] — правка должна пройти.
      expect(setNodes).toHaveBeenCalled();
      expect(setNodes.mock.calls[0][0].find((n: NodeT) => n.id === 'ev')!.age).toBe(18);
    });
  });
});
