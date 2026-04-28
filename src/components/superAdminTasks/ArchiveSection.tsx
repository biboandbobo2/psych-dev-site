import type { ArchivedTask } from './types';

interface ArchiveSectionProps {
  tasks: readonly ArchivedTask[];
  onDelete: (taskId: string) => void;
  saving: boolean;
}

export function ArchiveSection({ tasks, onDelete, saving }: ArchiveSectionProps) {
  return (
    <div className="space-y-2 pt-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Архив</h3>
        <span className="text-xs text-slate-500">{tasks.length} задач</span>
      </div>
      {tasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-amber-50/40 px-3 py-3 text-xs text-slate-500">
          Выполненные задачи будут появляться здесь.
        </div>
      ) : (
        <div className="space-y-2 rounded-2xl border border-amber-200/50 bg-gradient-to-b from-amber-50/70 via-white/90 to-amber-100/50 p-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-start gap-2 rounded-2xl border border-slate-200/60 bg-white/75 px-3 py-2 text-sm text-slate-700"
            >
              <span className="mt-1 text-emerald-500">✓</span>
              <div className="flex-1">
                <div className="leading-snug">{task.text}</div>
                <div className="text-xs text-slate-500">({task.roleTitle})</div>
              </div>
              <button
                type="button"
                onClick={() => onDelete(task.id)}
                className="rounded-lg px-1 text-slate-400 hover:text-rose-500"
                aria-label="Удалить из архива"
                disabled={saving}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
