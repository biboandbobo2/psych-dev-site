import type { ChangeEvent } from 'react';
import type { EdgeT, NodeT } from '../types';
import { LINE_X_POSITION } from '../constants';

interface TimelineBranchContinuationProps {
  formEventId: string | null;
  selectedNode?: NodeT;
  edges: EdgeT[];
  branchYears: string;
  onBranchYearsChange: (value: string) => void;
  onExtendBranch: () => void;
  ageMax: number;
}

export function TimelineBranchContinuation({
  formEventId,
  selectedNode,
  edges,
  branchYears,
  onBranchYearsChange,
  onExtendBranch,
  ageMax,
}: TimelineBranchContinuationProps) {
  const canExtend = Boolean(
    formEventId &&
      selectedNode &&
      (selectedNode.x ?? LINE_X_POSITION) !== LINE_X_POSITION &&
      !edges.some((edge) => edge.nodeId === selectedNode.id)
  );

  if (!canExtend) return null;

  const maxYears = selectedNode ? ageMax - selectedNode.age : ageMax;

  const handleYearsChange = (event: ChangeEvent<HTMLInputElement>) => {
    onBranchYearsChange(event.target.value);
  };

  return (
    <div className="mt-3 pt-3 border-t border-green-200">
      <label className="block mb-2">
        <span className="text-xs font-medium text-slate-700 mb-1 block" style={{ fontFamily: 'Georgia, serif' }}>
          Продолжить ветку (лет)
        </span>
        <input
          type="number"
          value={branchYears}
          onChange={handleYearsChange}
          className="w-full px-3 py-2 rounded-xl border border-green-300 focus:border-green-400 focus:ring-2 focus:ring-green-100 transition text-sm bg-white"
          style={{ fontFamily: 'Georgia, serif' }}
          min={1}
          max={maxYears}
          step={1}
        />
      </label>
      <button
        type="button"
        onClick={onExtendBranch}
        className="w-full px-4 py-2.5 bg-purple-400 text-white rounded-xl hover:bg-purple-500 transition font-medium text-sm"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        ↑ Продолжить ветку
      </button>
    </div>
  );
}
