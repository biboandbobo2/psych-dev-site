import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TaskRole } from './types';

interface SortableRoleProps {
  role: TaskRole;
  isExpanded: boolean;
  taskDraft: string;
  onToggle: () => void;
  onTaskDraftChange: (value: string) => void;
  onAddTask: () => void;
  onCompleteTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onDeleteRole: () => void;
  disabled: boolean;
}

const CARD_GRADIENTS = [
  'from-amber-50/90 via-white/90 to-amber-100/50 border-amber-200/60',
  'from-emerald-50/80 via-white/90 to-emerald-100/40 border-emerald-200/60',
  'from-sky-50/80 via-white/90 to-sky-100/40 border-sky-200/60',
];

const MARKER_COLORS = ['bg-amber-300/60', 'bg-emerald-300/60', 'bg-sky-300/60'];

export function SortableRole({
  role,
  isExpanded,
  taskDraft,
  onToggle,
  onTaskDraftChange,
  onAddTask,
  onCompleteTask,
  onDeleteTask,
  onDeleteRole,
  disabled,
}: SortableRoleProps) {
  const colorSeed = role.id.charCodeAt(0) % 3;
  const cardGradient = CARD_GRADIENTS[colorSeed];
  const markerColors = MARKER_COLORS[colorSeed];

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: role.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-2xl border bg-gradient-to-b px-4 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.08)] ${cardGradient} ${
        isDragging ? 'ring-2 ring-amber-200' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        <span className={`mt-1 h-6 w-1.5 rounded-full ${markerColors}`} aria-hidden />
        <button
          type="button"
          onClick={onToggle}
          className="rounded-full p-1 text-slate-500 hover:text-slate-900 hover:bg-white"
          aria-label={isExpanded ? 'Свернуть роль' : 'Развернуть роль'}
        >
          {isExpanded ? '▾' : '▸'}
        </button>
        <div className="flex-1">
          <div className="text-sm font-semibold text-slate-900">{role.title}</div>
          <div className="text-xs text-slate-500">Задач: {role.tasks.length}</div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onDeleteRole}
            className="rounded-lg p-1 text-slate-400 hover:text-rose-500 hover:bg-white"
            aria-label="Удалить роль"
            disabled={disabled}
          >
            ✕
          </button>
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            className="cursor-grab rounded-lg px-2 py-1 text-slate-400 hover:text-slate-700 hover:bg-white"
            aria-label="Изменить порядок роли"
          >
            ⋮⋮
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3 space-y-3">
          {role.tasks.length > 0 ? (
            <ul className="space-y-2">
              {role.tasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-start gap-2 rounded-xl border border-slate-200/60 bg-white/80 px-3 py-2 text-sm text-slate-800"
                >
                  <button
                    type="button"
                    onClick={() => onCompleteTask(task.id)}
                    className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-emerald-600 transition hover:border-emerald-300 hover:bg-emerald-50"
                    aria-label="Отметить задачу выполненной"
                    disabled={disabled}
                  >
                    ✓
                  </button>
                  <span className="flex-1 leading-snug">{task.text}</span>
                  <button
                    type="button"
                    onClick={() => onDeleteTask(task.id)}
                    className="rounded-lg px-1 text-slate-400 hover:text-rose-500"
                    aria-label="Удалить задачу"
                    disabled={disabled}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white/70 px-3 py-2 text-xs text-slate-500">
              Пока нет задач.
            </div>
          )}

          <div className="flex flex-col gap-2">
            <input
              value={taskDraft}
              onChange={(event) => onTaskDraftChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  onAddTask();
                }
              }}
              placeholder="Новая задача"
              className="w-full rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2 text-xs text-slate-700 placeholder:text-slate-400"
              disabled={disabled}
            />
            <button
              type="button"
              onClick={onAddTask}
              disabled={disabled}
              className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-white disabled:opacity-60"
            >
              Добавить задачу
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
