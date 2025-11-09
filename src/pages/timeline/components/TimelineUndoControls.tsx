import type { ReactNode } from 'react';

interface TimelineUndoControlsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export function TimelineUndoControls({ canUndo, canRedo, onUndo, onRedo }: TimelineUndoControlsProps) {
  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-3 border border-amber-200 shadow-sm">
      <div className="flex gap-2">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="flex-1 px-3 py-2 text-sm rounded-xl border border-amber-300 bg-white hover:bg-amber-50 transition disabled:opacity-40 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-1"
          style={{ fontFamily: 'Georgia, serif' }}
          title="Отменить (Cmd+Z)"
        >
          <span>←</span>
          <span>Отменить</span>
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="flex-1 px-3 py-2 text-sm rounded-xl border border-amber-300 bg-white hover:bg-amber-50 transition disabled:opacity-40 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-1"
          style={{ fontFamily: 'Georgia, serif' }}
          title="Повторить (Cmd+Shift+Z)"
        >
          <span>Повторить</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
