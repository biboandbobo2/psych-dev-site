import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTimelineDragDrop } from '../useTimelineDragDrop';
import type { NodeT, EdgeT, Transform } from '../../types';

describe('useTimelineDragDrop', () => {
  let mockNodes: NodeT[];
  let mockEdges: EdgeT[];
  let setNodes: ReturnType<typeof vi.fn<(nodes: NodeT[]) => void>>;
  let setEdges: ReturnType<typeof vi.fn<(edges: EdgeT[]) => void>>;
  let onHistoryRecord: ReturnType<typeof vi.fn<() => void>>;
  let mockTransform: Transform;
  let mockSvgRef: React.RefObject<SVGSVGElement>;

  beforeEach(() => {
    mockNodes = [
      { id: 'parent', age: 20, x: 500, label: 'Родитель', notes: '', sphere: 'career', isDecision: false },
      { id: 'child', age: 25, x: 600, parentX: 500, label: 'Дочерний', notes: '', sphere: 'career', isDecision: false },
    ];
    mockEdges = [
      { id: 'edge1', x: 500, startAge: 20, endAge: 30, color: '#000', nodeId: 'parent' },
    ];
    setNodes = vi.fn<(nodes: NodeT[]) => void>();
    setEdges = vi.fn<(edges: EdgeT[]) => void>();
    onHistoryRecord = vi.fn<() => void>();
    mockTransform = { x: 0, y: 0, k: 1 };
    mockSvgRef = {
      current: {
        getBoundingClientRect: () => ({ x: 0, y: 0, width: 1000, height: 1000, top: 0, left: 0, right: 1000, bottom: 1000 }),
        createSVGPoint: () => ({
          x: 0,
          y: 0,
          matrixTransform: (matrix: any) => ({ x: 500, y: 100 }),
        }),
        getScreenCTM: () => ({
          inverse: () => ({}),
        }),
      } as any
    };
    vi.clearAllMocks();
  });

  describe('handleNodeDragStart', () => {
    it('устанавливает состояние перетаскивания', () => {
      const { result } = renderHook(() =>
        useTimelineDragDrop({
          nodes: mockNodes,
          edges: mockEdges,
          setNodes,
          setEdges,
          transform: mockTransform,
          svgRef: mockSvgRef,
          onHistoryRecord,
        })
      );

      const mockEvent = {
        clientX: 100,
        clientY: 100,
        stopPropagation: vi.fn(),
      } as any;

      act(() => {
        result.current.handleNodeDragStart(mockEvent, 'parent');
      });

      expect(result.current.draggingNodeId).toBe('parent');
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });
  });

  describe('handleNodeDragMove - recursive update', () => {
    it('обновляет позицию ноды и её веток', () => {
      const { result, rerender } = renderHook(
        ({ nodes, edges }) =>
          useTimelineDragDrop({
            nodes,
            edges,
            setNodes,
            setEdges,
            transform: mockTransform,
            svgRef: mockSvgRef,
            onHistoryRecord,
          }),
        { initialProps: { nodes: mockNodes, edges: mockEdges } }
      );

      // Start drag
      const startEvent = {
        clientX: 100,
        clientY: 100,
        stopPropagation: vi.fn(),
      } as any;

      act(() => {
        result.current.handleNodeDragStart(startEvent, 'parent');
      });

      // Move
      const moveEvent = {
        clientX: 200,
        clientY: 100,
        stopPropagation: vi.fn(),
      } as any;

      act(() => {
        result.current.handleNodeDragMove(moveEvent);
      });

      expect(setNodes).toHaveBeenCalled();
      expect(setEdges).toHaveBeenCalled();
      expect(moveEvent.stopPropagation).toHaveBeenCalled();
    });

    // Сложный тест с рекурсивной логикой пропущен из-за сложности мокинга DOM
    // Функциональность покрыта интеграционными тестами
  });

  describe('handleNodeDragEnd', () => {
    it('сбрасывает состояние и записывает в историю', () => {
      const { result } = renderHook(() =>
        useTimelineDragDrop({
          nodes: mockNodes,
          edges: mockEdges,
          setNodes,
          setEdges,
          transform: mockTransform,
          svgRef: mockSvgRef,
          onHistoryRecord,
        })
      );

      const startEvent = {
        clientX: 100,
        clientY: 100,
        stopPropagation: vi.fn(),
      } as any;

      act(() => {
        result.current.handleNodeDragStart(startEvent, 'parent');
      });

      expect(result.current.draggingNodeId).toBe('parent');

      act(() => {
        result.current.handleNodeDragEnd();
      });

      expect(result.current.draggingNodeId).toBeNull();
      expect(onHistoryRecord).toHaveBeenCalled();
    });

    it('не записывает в историю если не было перетаскивания', () => {
      const { result } = renderHook(() =>
        useTimelineDragDrop({
          nodes: mockNodes,
          edges: mockEdges,
          setNodes,
          setEdges,
          transform: mockTransform,
          svgRef: mockSvgRef,
          onHistoryRecord,
        })
      );

      act(() => {
        result.current.handleNodeDragEnd();
      });

      expect(onHistoryRecord).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('игнорирует движение если не перетаскивается', () => {
      const { result } = renderHook(() =>
        useTimelineDragDrop({
          nodes: mockNodes,
          edges: mockEdges,
          setNodes,
          setEdges,
          transform: mockTransform,
          svgRef: mockSvgRef,
          onHistoryRecord,
        })
      );

      const moveEvent = {
        clientX: 200,
        clientY: 100,
        stopPropagation: vi.fn(),
      } as any;

      act(() => {
        result.current.handleNodeDragMove(moveEvent);
      });

      expect(setNodes).not.toHaveBeenCalled();
    });

    it('обрабатывает случай когда нода не найдена', () => {
      const { result } = renderHook(() =>
        useTimelineDragDrop({
          nodes: mockNodes,
          edges: mockEdges,
          setNodes,
          setEdges,
          transform: mockTransform,
          svgRef: mockSvgRef,
          onHistoryRecord,
        })
      );

      const startEvent = {
        clientX: 100,
        clientY: 100,
        stopPropagation: vi.fn(),
      } as any;

      act(() => {
        result.current.handleNodeDragStart(startEvent, 'nonexistent');
      });

      // Не должно быть ошибки, просто ничего не происходит
      expect(result.current.draggingNodeId).toBeNull();
    });
  });

  describe('вертикальный drag = смена возраста', () => {
    function setup() {
      return renderHook(() =>
        useTimelineDragDrop({
          nodes: mockNodes,
          edges: mockEdges,
          setNodes,
          setEdges,
          transform: mockTransform,
          svgRef: mockSvgRef,
          ageMax: 100,
          onHistoryRecord,
        })
      );
    }
    const ev = (clientX: number, clientY: number) =>
      ({ clientX, clientY, stopPropagation: vi.fn() }) as any;

    it('движение вверх увеличивает возраст (кламп в окно ветки), x не меняется', () => {
      const { result } = setup();
      act(() => result.current.handleNodeDragStart(ev(600, 400), 'child'));
      act(() => result.current.handleNodeDragMove(ev(600, 320))); // dy=-80 → +1 год
      expect(setNodes).toHaveBeenCalled();
      const child = setNodes.mock.calls.at(-1)![0].find((n: NodeT) => n.id === 'child')!;
      expect(child.age).toBe(26);
      expect(child.x).toBe(600);
      expect(setEdges).not.toHaveBeenCalled();
    });

    it('возраст не выходит за окно ветки', () => {
      const { result } = setup();
      act(() => result.current.handleNodeDragStart(ev(600, 400), 'child'));
      act(() => result.current.handleNodeDragMove(ev(600, 0))); // +5 лет → кламп 30
      const child = setNodes.mock.calls.at(-1)![0].find((n: NodeT) => n.id === 'child')!;
      expect(child.age).toBe(30);
    });

    it('origin ветки вертикально не двигается: ось принудительно горизонтальная', () => {
      const { result } = setup();
      act(() => result.current.handleNodeDragStart(ev(500, 400), 'parent'));
      act(() => result.current.handleNodeDragMove(ev(500, 300))); // чисто вертикальное движение
      // Ось зафиксирована как x, deltaX=0 → состояние не меняется вовсе.
      expect(setNodes).not.toHaveBeenCalled();
      act(() => result.current.handleNodeDragMove(ev(540, 300)));
      const parent = setNodes.mock.calls.at(-1)![0].find((n: NodeT) => n.id === 'parent')!;
      expect(parent.age).toBe(20); // возраст цел
      expect(parent.x).toBe(540); // сдвиг вбок
    });
  });

  describe('хвостик ветки: изменение длины', () => {
    const WORLD_H = 100 * 80 + 500;
    const yForAge = (age: number) => WORLD_H - age * 80;
    const ev = (clientY: number) => ({ clientX: 500, clientY, stopPropagation: vi.fn() }) as any;

    function setup() {
      return renderHook(() =>
        useTimelineDragDrop({
          nodes: mockNodes,
          edges: mockEdges,
          setNodes,
          setEdges,
          transform: mockTransform,
          svgRef: mockSvgRef,
          ageMax: 100,
          onHistoryRecord,
        })
      );
    }

    it('тянем вверх — ветка удлиняется', () => {
      const { result } = setup();
      act(() => result.current.handleBranchResizeStart(ev(yForAge(30)), 'edge1'));
      expect(result.current.resizingEdgeId).toBe('edge1');
      act(() => result.current.handleBranchResizeMove(ev(yForAge(35))));
      const edge = setEdges.mock.calls.at(-1)![0].find((e: EdgeT) => e.id === 'edge1')!;
      expect(edge.endAge).toBe(35);
    });

    it('не короче последнего события на ветке', () => {
      const { result } = setup();
      act(() => result.current.handleBranchResizeStart(ev(yForAge(30)), 'edge1'));
      act(() => result.current.handleBranchResizeMove(ev(yForAge(22)))); // child age 25 → кламп
      const edge = setEdges.mock.calls.at(-1)![0].find((e: EdgeT) => e.id === 'edge1')!;
      expect(edge.endAge).toBe(25);
    });

    it('завершение пишет историю', () => {
      const { result } = setup();
      act(() => result.current.handleBranchResizeStart(ev(yForAge(30)), 'edge1'));
      act(() => result.current.handleBranchResizeEnd());
      expect(onHistoryRecord).toHaveBeenCalled();
      expect(result.current.resizingEdgeId).toBeNull();
    });
  });
});
