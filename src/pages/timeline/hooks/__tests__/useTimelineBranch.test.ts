import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTimelineBranch } from '../useTimelineBranch';
import type { EdgeT, NodeT } from '../../types';

global.alert = vi.fn();

describe('useTimelineBranch', () => {
  let setNodes: ReturnType<typeof vi.fn<(nodes: NodeT[]) => void>>;
  let setEdges: ReturnType<typeof vi.fn<(edges: EdgeT[]) => void>>;
  let onHistoryRecord: ReturnType<typeof vi.fn<(nodes?: NodeT[], edges?: EdgeT[]) => void>>;
  let onClearForm: ReturnType<typeof vi.fn<() => void>>;

  beforeEach(() => {
    setNodes = vi.fn<(nodes: NodeT[]) => void>();
    setEdges = vi.fn<(edges: EdgeT[]) => void>();
    onHistoryRecord = vi.fn<(nodes?: NodeT[], edges?: EdgeT[]) => void>();
    onClearForm = vi.fn<() => void>();
    vi.clearAllMocks();
  });

  describe('extendBranch (B13)', () => {
    it('refuses to create a branch that would extend past ageMax', () => {
      const node: NodeT = {
        id: 'n1',
        age: 90,
        x: 2100,
        parentX: 2100,
        label: 'Old',
        isDecision: false,
        sphere: 'career',
      };
      const { result } = renderHook(() =>
        useTimelineBranch({
          nodes: [node],
          edges: [],
          setNodes,
          setEdges,
          ageMax: 100,
          onHistoryRecord,
          onClearForm,
        })
      );

      act(() => result.current.setBranchYears('30')); // 90 + 30 = 120 > 100
      act(() => result.current.extendBranch(node));

      expect(alert).toHaveBeenCalledWith(expect.stringContaining('не помещается'));
      expect(setEdges).not.toHaveBeenCalled();
    });

    it('B12: offsets a new branch when source event already sits on one', () => {
      // Event b lives on existing branch e1 at x=2100. Creating a new
      // branch from b should pick the next free x, not collide with e1.
      const b: NodeT = {
        id: 'b',
        age: 25,
        x: 2100,
        parentX: 2100,
        label: 'B',
        isDecision: false,
        sphere: 'career',
      };
      const existing: EdgeT = {
        id: 'e1',
        x: 2100,
        startAge: 20,
        endAge: 35,
        color: '#000',
        nodeId: 'origin',
      };
      const { result } = renderHook(() =>
        useTimelineBranch({
          nodes: [b],
          edges: [existing],
          setNodes,
          setEdges,
          ageMax: 100,
          onHistoryRecord,
          onClearForm,
        })
      );

      act(() => result.current.setBranchYears('5'));
      act(() => result.current.extendBranch(b));

      const edgesArg = setEdges.mock.calls[0]![0];
      const newBranch = edgesArg.find((edge: EdgeT) => edge.id !== 'e1')!;
      expect(newBranch.x).toBeGreaterThan(2100); // shifted away from existing
      expect(newBranch.nodeId).toBe('b');
    });

    it('creates a branch that fits within ageMax', () => {
      const node: NodeT = {
        id: 'n1',
        age: 70,
        x: 2100,
        parentX: 2100,
        label: 'X',
        isDecision: false,
        sphere: 'career',
      };
      const { result } = renderHook(() =>
        useTimelineBranch({
          nodes: [node],
          edges: [],
          setNodes,
          setEdges,
          ageMax: 100,
          onHistoryRecord,
          onClearForm,
        })
      );

      act(() => result.current.setBranchYears('20')); // 70 + 20 = 90 ≤ 100
      act(() => result.current.extendBranch(node));

      expect(setEdges).toHaveBeenCalled();
      const edgesArg = setEdges.mock.calls[0]![0];
      expect(edgesArg[0]).toMatchObject({ startAge: 70, endAge: 90, nodeId: 'n1' });
    });
  });

  describe('updateBranchLength (B14)', () => {
    it('refuses to shorten the branch past existing events on it', () => {
      const origin: NodeT = {
        id: 'origin',
        age: 20,
        x: 2000,
        label: 'Origin',
        isDecision: false,
        sphere: 'career',
      };
      const branchEvent: NodeT = {
        id: 'b',
        age: 28,
        x: 2100,
        parentX: 2100,
        label: 'Event on branch',
        isDecision: false,
        sphere: 'career',
      };
      const branch: EdgeT = {
        id: 'e1',
        x: 2100,
        startAge: 20,
        endAge: 30,
        color: '#000',
        nodeId: 'origin',
      };

      const { result } = renderHook(() =>
        useTimelineBranch({
          nodes: [origin, branchEvent],
          edges: [branch],
          setNodes,
          setEdges,
          ageMax: 100,
          onHistoryRecord,
          onClearForm,
        })
      );

      act(() => result.current.setSelectedBranchId("e1"));
      act(() => result.current.setBranchYears('5')); // new endAge = 25, but b.age = 28
      act(() => result.current.updateBranchLength());

      expect(alert).toHaveBeenCalledWith(expect.stringContaining('за пределами'));
      expect(setEdges).not.toHaveBeenCalled();
    });

    it('allows shortening that does not orphan any event', () => {
      const origin: NodeT = {
        id: 'origin',
        age: 20,
        x: 2000,
        label: 'Origin',
        isDecision: false,
        sphere: 'career',
      };
      const branch: EdgeT = {
        id: 'e1',
        x: 2100,
        startAge: 20,
        endAge: 30,
        color: '#000',
        nodeId: 'origin',
      };

      const { result } = renderHook(() =>
        useTimelineBranch({
          nodes: [origin],
          edges: [branch],
          setNodes,
          setEdges,
          ageMax: 100,
          onHistoryRecord,
          onClearForm,
        })
      );

      act(() => result.current.setSelectedBranchId("e1"));
      act(() => result.current.setBranchYears('5'));
      act(() => result.current.updateBranchLength());

      expect(setEdges).toHaveBeenCalled();
      const edgesArg = setEdges.mock.calls[0]![0];
      expect(edgesArg[0]).toMatchObject({ id: 'e1', endAge: 25 });
    });

    it('allows extending the branch (no events to orphan above current end)', () => {
      const origin: NodeT = {
        id: 'origin',
        age: 20,
        x: 2000,
        label: 'Origin',
        isDecision: false,
        sphere: 'career',
      };
      const branch: EdgeT = {
        id: 'e1',
        x: 2100,
        startAge: 20,
        endAge: 30,
        color: '#000',
        nodeId: 'origin',
      };

      const { result } = renderHook(() =>
        useTimelineBranch({
          nodes: [origin],
          edges: [branch],
          setNodes,
          setEdges,
          ageMax: 100,
          onHistoryRecord,
          onClearForm,
        })
      );

      act(() => result.current.setSelectedBranchId("e1"));
      act(() => result.current.setBranchYears('25')); // 20..45
      act(() => result.current.updateBranchLength());

      expect(setEdges).toHaveBeenCalled();
      expect(setEdges.mock.calls[0]![0][0]).toMatchObject({ endAge: 45 });
    });
  });

  // ===== Аудит инвариантов (docs/plans/timeline-invariant-audit.md) =====

  describe('Д9: B12-walk не должен парковать новую ветку на главной линии', () => {
    it('пропускает LINE_X_POSITION при поиске свободного x', () => {
      // Событие на ветке слева от главной линии (x=1900). Walk +100 от
      // занятого 1900 попадает ровно на 2000 — ветка на x главной линии
      // сделала бы свои события «root» при следующем build.
      const origin: NodeT = { id: 'o', age: 10, x: 2000, label: 'O', isDecision: false };
      const b: NodeT = {
        id: 'b', age: 15, x: 1900, parentX: 1900, label: 'B', isDecision: false, sphere: 'career',
      };
      const e0: EdgeT = { id: 'e0', x: 1900, startAge: 10, endAge: 30, color: '#000', nodeId: 'o' };

      const { result } = renderHook(() =>
        useTimelineBranch({
          nodes: [origin, b],
          edges: [e0],
          setNodes,
          setEdges,
          ageMax: 100,
          onHistoryRecord,
          onClearForm,
        })
      );

      act(() => result.current.setBranchYears('5'));
      act(() => result.current.extendBranch(b));

      expect(setEdges).toHaveBeenCalled();
      const newEdge = setEdges.mock.calls[0]![0].find((e: EdgeT) => e.id !== 'e0')!;
      expect(newEdge.x).not.toBe(2000);
    });
  });

  describe('notify вместо alert', () => {
    it('extendBranch зовёт notify, когда он передан', () => {
      const notify = vi.fn();
      const node: NodeT = {
        id: 'n1', age: 90, x: 2100, parentX: 2100, label: 'Old', isDecision: false, sphere: 'career',
      };
      const { result } = renderHook(() =>
        useTimelineBranch({
          nodes: [node],
          edges: [],
          setNodes,
          setEdges,
          ageMax: 100,
          onHistoryRecord,
          onClearForm,
          notify,
        })
      );

      act(() => result.current.setBranchYears('30')); // 90 + 30 > 100
      act(() => result.current.extendBranch(node));

      expect(notify).toHaveBeenCalledWith(expect.stringContaining('не помещается'));
      expect(alert).not.toHaveBeenCalled();
    });
  });

  describe('Д4: B14-валидатор должен согласовываться с деревом при shared-x', () => {
    it('не считает события чужой ветки с тем же x событиями укорачиваемой ветки', () => {
      // ev принадлежит (по дереву) ветке A [10,50] от o1; ветка B [30,45]
      // от o2 делит с A x=2100. Укорачивание B до 35 легитимно — но
      // x-матчинг находит ev (parentX=2100, age 45 > 35) и ложно отказывает.
      const o1: NodeT = { id: 'o1', age: 10, x: 2000, label: 'O1', isDecision: false };
      const o2: NodeT = { id: 'o2', age: 30, x: 2000, label: 'O2', isDecision: false };
      const ev: NodeT = { id: 'ev', age: 45, x: 2100, parentX: 2100, label: 'Ev', isDecision: false };
      const edgeA: EdgeT = { id: 'A', x: 2100, startAge: 10, endAge: 50, color: '#000', nodeId: 'o1' };
      const edgeB: EdgeT = { id: 'B', x: 2100, startAge: 30, endAge: 45, color: '#000', nodeId: 'o2' };

      const { result } = renderHook(() =>
        useTimelineBranch({
          nodes: [o1, o2, ev],
          edges: [edgeA, edgeB],
          setNodes,
          setEdges,
          ageMax: 100,
          onHistoryRecord,
          onClearForm,
        })
      );

      act(() => result.current.setSelectedBranchId('B'));
      act(() => result.current.setBranchYears('5')); // 30..35
      act(() => result.current.updateBranchLength());

      expect(setEdges).toHaveBeenCalled();
      expect(setEdges.mock.calls[0]![0].find((e: EdgeT) => e.id === 'B')).toMatchObject({
        endAge: 35,
      });
    });
  });

  describe('Д6b: deleteBranch не должен мигрировать события за пределы окна родительской ветки', () => {
    it('отказывает, когда возраст мигрируемого события вне окна родительской ветки', () => {
      // a (root) → e1 [10,20] → b (12) → e2 [12,40] → c (35).
      // Удаление e2 мигрирует c на линию e1, но 35 > e1.endAge=20 —
      // событие «повисло бы в воздухе» (I12).
      global.confirm = vi.fn(() => true);
      const a: NodeT = { id: 'a', age: 10, x: 2000, label: 'A', isDecision: false };
      const b: NodeT = { id: 'b', age: 12, x: 2100, parentX: 2100, label: 'B', isDecision: false };
      const c: NodeT = { id: 'c', age: 35, x: 2200, parentX: 2200, label: 'C', isDecision: false };
      const e1: EdgeT = { id: 'e1', x: 2100, startAge: 10, endAge: 20, color: '#000', nodeId: 'a' };
      const e2: EdgeT = { id: 'e2', x: 2200, startAge: 12, endAge: 40, color: '#000', nodeId: 'b' };

      const { result } = renderHook(() =>
        useTimelineBranch({
          nodes: [a, b, c],
          edges: [e1, e2],
          setNodes,
          setEdges,
          ageMax: 100,
          onHistoryRecord,
          onClearForm,
        })
      );

      act(() => result.current.setSelectedBranchId('e2'));
      act(() => result.current.deleteBranch());

      expect(alert).toHaveBeenCalledWith(expect.stringContaining('C'));
      expect(setNodes).not.toHaveBeenCalled();
      expect(setEdges).not.toHaveBeenCalled();
    });

    it('разрешает удаление, когда миграция идёт на главную линию (окна нет)', () => {
      global.confirm = vi.fn(() => true);
      const a: NodeT = { id: 'a', age: 10, x: 2000, label: 'A', isDecision: false };
      const b: NodeT = { id: 'b', age: 35, x: 2100, parentX: 2100, label: 'B', isDecision: false };
      const e1: EdgeT = { id: 'e1', x: 2100, startAge: 10, endAge: 40, color: '#000', nodeId: 'a' };

      const { result } = renderHook(() =>
        useTimelineBranch({
          nodes: [a, b],
          edges: [e1],
          setNodes,
          setEdges,
          ageMax: 100,
          onHistoryRecord,
          onClearForm,
        })
      );

      act(() => result.current.setSelectedBranchId('e1'));
      act(() => result.current.deleteBranch());

      expect(setNodes).toHaveBeenCalled();
      expect(setEdges).toHaveBeenCalled();
      const migrated = setNodes.mock.calls[0]![0].find((n: NodeT) => n.id === 'b')!;
      expect(migrated.x).toBe(2000);
      expect(migrated.parentX).toBeUndefined();
    });
  });
});
