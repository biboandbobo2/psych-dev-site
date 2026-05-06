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

      act(() => result.current.setSelectedBranchX(2100));
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

      act(() => result.current.setSelectedBranchX(2100));
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

      act(() => result.current.setSelectedBranchX(2100));
      act(() => result.current.setBranchYears('25')); // 20..45
      act(() => result.current.updateBranchLength());

      expect(setEdges).toHaveBeenCalled();
      expect(setEdges.mock.calls[0]![0][0]).toMatchObject({ endAge: 45 });
    });
  });
});
