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

  // ===== UX: быстрое создание двойным кликом =====

  describe('quickCreateEvent', () => {
    it('на главной линии: x=LINE, parentX=undefined, возраст клампится в [0, ageMax]', () => {
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
      let created: NodeT | undefined;
      act(() => {
        created = result.current.quickCreateEvent(150, null);
      });
      expect(created).toMatchObject({ age: 100, x: 2000, parentX: undefined, label: 'Новое событие' });
      expect(onSetSelectedId).toHaveBeenCalledWith(created!.id);
      const newNodes = setNodes.mock.calls[0][0];
      expect(onHistoryRecord).toHaveBeenCalledWith(newNodes, mockEdges);
    });

    it('на ветке: x/parentX = x ветки, сфера от origin, возраст в окне ветки', () => {
      const origin: NodeT = { id: 'o', age: 20, x: 2100, parentX: 2100, label: 'O', isDecision: false, sphere: 'career' };
      const edge: EdgeT = { id: 'e1', x: 2200, startAge: 20, endAge: 30, color: '#000', nodeId: 'o' };
      const { result } = renderHook(() =>
        useTimelineCRUD({
          nodes: [origin],
          edges: [edge],
          ageMax: 100,
          setNodes,
          setEdges,
          onHistoryRecord,
          onClearForm,
          onSetSelectedId,
        })
      );
      let created: NodeT | undefined;
      act(() => {
        created = result.current.quickCreateEvent(35, edge); // выше окна → кламп в 30
      });
      expect(created).toMatchObject({ age: 30, x: 2200, parentX: 2200, sphere: 'career' });
    });
  });

  // ===== UX: notify вместо alert, счётчики удаления =====

  describe('notify / deleteNode counters', () => {
    it('валидатор зовёт notify вместо alert, когда notify передан', () => {
      const notify = vi.fn();
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
          notify,
        })
      );
      act(() => {
        result.current.handleFormSubmit(
          { id: null, age: '', label: 'X', notes: '', sphere: undefined, isDecision: false, icon: null },
          null
        );
      });
      expect(notify).toHaveBeenCalledWith(expect.stringContaining('возраст'));
      expect(alert).not.toHaveBeenCalled();
    });

    it('deleteNode возвращает размер снесённого поддерева', () => {
      // origin → ветка → событие на ветке: удаление origin = 2 события + 1 ветка.
      const nodes: NodeT[] = [
        { id: 'o', age: 10, x: 2000, label: 'O', isDecision: false },
        { id: 'child', age: 15, x: 2100, parentX: 2100, label: 'C', isDecision: false },
      ];
      const edges: EdgeT[] = [
        { id: 'e1', x: 2100, startAge: 10, endAge: 20, color: '#000', nodeId: 'o' },
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
      let removed: { removedEvents: number; removedBranches: number } | undefined;
      act(() => {
        removed = result.current.deleteNode('o');
      });
      expect(removed).toEqual({ removedEvents: 2, removedBranches: 1 });
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

    it('отказывает при сдвиге вверх, когда событие остаётся ниже нового startAge', () => {
      // Окно [20,30] → [95,105] → кламп endAge [95,100]; событие ev (28)
      // ниже нового startAge. Дискриминирующий тест на сам кламп для
      // валидных данных невозможен: событие ветки всегда ≤ endAge ≤ ageMax,
      // поэтому кламп не может создать нарушителя сверху.
      submitOriginAge([origin, branchEvent], [branch], '95');
      expect(alert).toHaveBeenCalled();
      expect(setNodes).not.toHaveBeenCalled();
      expect(setEdges).not.toHaveBeenCalled();
    });

    it('Д3/startAge: сдвиг вниз не уводит startAge ветки в минус', () => {
      // Legacy-состояние после I12-healing: окно ветки начинается раньше
      // возраста origin. Сдвиг origin 8→2 даёт сырое окно [-1, 9] —
      // startAge обязан клампиться в 0 (симметрично клампу endAge).
      const o: NodeT = { id: 'o', age: 8, x: 2000, label: 'O', isDecision: false };
      const early: NodeT = { id: 'early', age: 5, x: 2100, parentX: 2100, label: 'Early', isDecision: false };
      const br: EdgeT = { id: 'br', x: 2100, startAge: 5, endAge: 15, color: '#000', nodeId: 'o' };

      const { result } = renderHook(() =>
        useTimelineCRUD({
          nodes: [o, early],
          edges: [br],
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
          { id: 'o', age: '2', label: 'O', notes: '', sphere: undefined, isDecision: false, icon: null },
          null
        );
      });

      expect(setEdges).toHaveBeenCalled();
      const slid = setEdges.mock.calls[0][0][0];
      expect(slid.startAge).toBeGreaterThanOrEqual(0);
      expect(slid.endAge).toBe(9); // сдвиг длины не искажает: 15 + (2-8)
    });

    it('Д3/startAge: окно пустой legacy-ветки не инвертируется при сдвиге целиком ниже нуля', () => {
      // Ветка [5,10] от origin(20) — только ручной JSON; сдвиг 20→2 даёт
      // сырое окно [-13,-8] → после клампов должно остаться валидным.
      const o: NodeT = { id: 'o', age: 20, x: 2000, label: 'O', isDecision: false };
      const br: EdgeT = { id: 'br', x: 2100, startAge: 5, endAge: 10, color: '#000', nodeId: 'o' };

      const { result } = renderHook(() =>
        useTimelineCRUD({
          nodes: [o],
          edges: [br],
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
          { id: 'o', age: '2', label: 'O', notes: '', sphere: undefined, isDecision: false, icon: null },
          null
        );
      });

      const slid = setEdges.mock.calls[0][0][0];
      expect(slid.startAge).toBeGreaterThanOrEqual(0);
      expect(slid.endAge).toBeGreaterThanOrEqual(slid.startAge);
    });

    it('Д3: сдвиг проверяет события на ВСЕХ ветках origin-события', () => {
      // У origin две ветки; нарушитель — на второй.
      const o: NodeT = { id: 'o', age: 20, x: 2000, label: 'O', isDecision: false };
      const ok: NodeT = { id: 'ok', age: 21, x: 2100, parentX: 2100, label: 'Ok', isDecision: false };
      const bad: NodeT = { id: 'bad', age: 29, x: 2200, parentX: 2200, label: 'Bad', isDecision: false };
      const br1: EdgeT = { id: 'br1', x: 2100, startAge: 20, endAge: 30, color: '#000', nodeId: 'o' };
      const br2: EdgeT = { id: 'br2', x: 2200, startAge: 20, endAge: 30, color: '#000', nodeId: 'o' };

      const { result } = renderHook(() =>
        useTimelineCRUD({
          nodes: [o, ok, bad],
          edges: [br1, br2],
          ageMax: 100,
          setNodes,
          setEdges,
          onHistoryRecord,
          onClearForm,
          onSetSelectedId,
        })
      );
      act(() => {
        // Окна → [15,25]: ok(21) внутри, bad(29) на br2 — снаружи.
        result.current.handleFormSubmit(
          { id: 'o', age: '15', label: 'O', notes: '', sphere: undefined, isDecision: false, icon: null },
          null
        );
      });

      expect(alert).toHaveBeenCalledWith(expect.stringContaining('Bad'));
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

    it('документированное поведение: событие на висячей ветке (edge без origin) правится без B11-проверки', () => {
      // Висячая ветка не входит в топологию (buildTimelineTree её
      // отбрасывает, normalize удаляет при загрузке), поэтому валидатор
      // её окна не видит — событие трактуется как осиротевший root.
      // До Д4-фикса x-матчинг находил такую ветку и отказывал; это
      // осознанная смена поведения.
      const ev: NodeT = { id: 'ev', age: 25, x: 2100, parentX: 2100, label: 'Ev', isDecision: false };
      const dangling: EdgeT = { id: 'D', x: 2100, startAge: 20, endAge: 30, color: '#000', nodeId: 'missing' };

      const { result } = renderHook(() =>
        useTimelineCRUD({
          nodes: [ev],
          edges: [dangling],
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
          { id: 'ev', age: '50', label: 'Ev', notes: '', sphere: undefined, isDecision: false, icon: null },
          null
        );
      });

      expect(setNodes).toHaveBeenCalled();
    });
  });
});

describe('фаза 2 branchId: создание событий пишет ссылку', () => {
  const branchEdge: EdgeT = {
    id: 'edge-1',
    x: 2100,
    startAge: 10,
    endAge: 40,
    color: '#000',
    nodeId: 'origin',
  };
  const originNode: NodeT = {
    id: 'origin',
    age: 10,
    x: 2000,
    label: 'Origin',
    isDecision: false,
    sphere: 'career',
  };

  function setup() {
    const setNodes = vi.fn<(nodes: NodeT[]) => void>();
    const setEdges = vi.fn<(edges: EdgeT[]) => void>();
    const { result } = renderHook(() =>
      useTimelineCRUD({
        nodes: [originNode],
        edges: [branchEdge],
        ageMax: 100,
        setNodes,
        setEdges,
      })
    );
    return { result, setNodes };
  }

  it('handleFormSubmit: событие на ветке получает branchId ветки', () => {
    const { result, setNodes } = setup();
    act(() => {
      result.current.handleFormSubmit(
        { id: null, age: '20', label: 'На ветке', notes: '', sphere: 'career', isDecision: false, icon: null },
        'edge-1'
      );
    });
    const created = (setNodes.mock.calls[0][0] as NodeT[]).find((n) => n.label === 'На ветке')!;
    expect(created.branchId).toBe('edge-1');
    expect(created.parentX).toBe(2100);
  });

  it('handleFormSubmit: событие на главной линии остаётся без branchId', () => {
    const { result, setNodes } = setup();
    act(() => {
      result.current.handleFormSubmit(
        { id: null, age: '20', label: 'Главная', notes: '', sphere: 'career', isDecision: false, icon: null },
        null
      );
    });
    const created = (setNodes.mock.calls[0][0] as NodeT[]).find((n) => n.label === 'Главная')!;
    expect(created.branchId).toBeUndefined();
    expect(created.parentX).toBeUndefined();
  });

  it('handleFormSubmit: возраст вне окна ветки → событие уходит на главную линию БЕЗ branchId', () => {
    const { result, setNodes } = setup();
    act(() => {
      result.current.handleFormSubmit(
        { id: null, age: '90', label: 'Вне окна', notes: '', sphere: 'career', isDecision: false, icon: null },
        'edge-1'
      );
    });
    const created = (setNodes.mock.calls[0][0] as NodeT[]).find((n) => n.label === 'Вне окна')!;
    expect(created.branchId).toBeUndefined();
    expect(created.parentX).toBeUndefined();
  });

  it('quickCreateEvent: двойной клик по ветке пишет branchId', () => {
    const { result, setNodes } = setup();
    act(() => {
      result.current.quickCreateEvent(20, branchEdge);
    });
    const created = (setNodes.mock.calls[0][0] as NodeT[]).find((n) => n.label === 'Новое событие')!;
    expect(created.branchId).toBe('edge-1');
  });

  it('quickCreateEvent: двойной клик по главной линии — без branchId', () => {
    const { result, setNodes } = setup();
    act(() => {
      result.current.quickCreateEvent(20, null);
    });
    const created = (setNodes.mock.calls[0][0] as NodeT[]).find((n) => n.label === 'Новое событие')!;
    expect(created.branchId).toBeUndefined();
  });
});
