import type { EdgeT } from '../types';
import { Emoji } from '../../../components/Emoji';
import type { ChangeEvent } from 'react';

interface TimelineBranchEditorProps {
  selectedEdge: EdgeT;
  branchYears: string;
  ageMax: number;
  onBranchYearsChange: (value: string) => void;
  onUpdateBranchLength: () => void;
  onDeleteBranch: () => void;
  onClose: () => void;
}

export function TimelineBranchEditor({
  selectedEdge,
  branchYears,
  ageMax,
  onBranchYearsChange,
  onUpdateBranchLength,
  onDeleteBranch,
  onClose,
}: TimelineBranchEditorProps) {
  const handleYearsChange = (event: ChangeEvent<HTMLInputElement>) => {
    onBranchYearsChange(event.target.value);
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-4 border border-purple-200 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900" style={{ fontFamily: 'Georgia, serif' }}>
          Редактор ветки
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="px-2 py-1 text-xs rounded-lg bg-white/80 text-slate-600 hover:bg-white transition"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Закрыть
        </button>
      </div>

      <div className="mb-3 p-3 bg-white/60 rounded-xl border border-purple-200">
        <div className="text-sm text-slate-700" style={{ fontFamily: 'Georgia, serif' }}>
          <div className="font-semibold mb-1">Диапазон: {selectedEdge.endAge - selectedEdge.startAge} лет</div>
          <div className="text-xs text-slate-600">({selectedEdge.startAge} - {selectedEdge.endAge} лет)</div>
        </div>
      </div>

      <div className="mb-3">
        <label className="block mb-2">
          <span className="text-xs font-medium text-slate-700 mb-1 block" style={{ fontFamily: 'Georgia, serif' }}>
            Длина ветки (лет)
          </span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={branchYears}
              onChange={handleYearsChange}
              min={1}
              max={ageMax - selectedEdge.startAge}
              step={1}
              className="flex-1 px-3 py-2 rounded-xl border border-purple-300 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition text-sm bg-white"
              style={{ fontFamily: 'Georgia, serif' }}
            />
            <button
              type="button"
              onClick={onUpdateBranchLength}
              className="px-3 py-2 bg-purple-400 hover:bg-purple-500 text-white rounded-xl transition text-xs font-medium"
              style={{ fontFamily: 'Georgia, serif' }}
              title="Применить"
            >
              <Emoji token="✓" size={12} />
            </button>
            <button
              type="button"
              onClick={onDeleteBranch}
              className="px-3 py-2 bg-red-200 hover:bg-red-300 text-red-800 rounded-xl transition text-xs font-medium"
              style={{ fontFamily: 'Georgia, serif' }}
              title="Удалить ветку"
            >
              <Emoji token="🗑️" size={12} />
            </button>
          </div>
        </label>
      </div>
    </div>
  );
}
