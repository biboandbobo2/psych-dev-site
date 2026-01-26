import { useEffect, useState } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

import { db } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";
import { debugError } from "../lib/debug";

type TaskItem = {
  id: string;
  text: string;
};

type ArchivedTask = {
  id: string;
  text: string;
  roleId: string;
  roleTitle: string;
  doneAt: string;
};

type TaskRole = {
  id: string;
  title: string;
  tasks: TaskItem[];
  order: number;
};

const TASK_BOARD_REF = doc(db, "admin", "task-board");

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

function normalizeRoles(rawRoles: unknown): TaskRole[] {
  if (!Array.isArray(rawRoles)) return [];

  const roles = rawRoles.map((role, index) => {
    const roleObject = role as Partial<TaskRole> & { tasks?: unknown };
    const id = typeof roleObject.id === "string" && roleObject.id ? roleObject.id : createId();
    const title =
      typeof roleObject.title === "string" && roleObject.title.trim()
        ? roleObject.title.trim()
        : `Роль ${index + 1}`;
    const tasks = Array.isArray(roleObject.tasks)
      ? roleObject.tasks
          .map((task) => {
            if (typeof task === "string") {
              const text = task.trim();
              return text ? { id: createId(), text } : null;
            }
            if (task && typeof task === "object") {
              const taskObject = task as Partial<TaskItem>;
              const text = typeof taskObject.text === "string" ? taskObject.text.trim() : "";
              if (!text) return null;
              return {
                id: typeof taskObject.id === "string" && taskObject.id ? taskObject.id : createId(),
                text,
              };
            }
            return null;
          })
          .filter(Boolean) as TaskItem[]
      : [];
    const order = typeof roleObject.order === "number" ? roleObject.order : index;

    return { id, title, tasks, order };
  });

  return roles.sort((a, b) => a.order - b.order);
}

function normalizeArchive(rawArchive: unknown): ArchivedTask[] {
  if (!Array.isArray(rawArchive)) return [];

  return rawArchive
    .map((entry) => {
      const item = entry as Partial<ArchivedTask>;
      const text = typeof item.text === "string" ? item.text.trim() : "";
      const roleTitle = typeof item.roleTitle === "string" ? item.roleTitle.trim() : "";
      if (!text || !roleTitle) return null;
      const doneAt =
        typeof item.doneAt === "string" && !Number.isNaN(Date.parse(item.doneAt))
          ? item.doneAt
          : new Date().toISOString();
      return {
        id: typeof item.id === "string" && item.id ? item.id : createId(),
        text,
        roleId: typeof item.roleId === "string" ? item.roleId : "",
        roleTitle,
        doneAt,
      };
    })
    .filter(Boolean)
    .sort((a, b) => Date.parse(b.doneAt) - Date.parse(a.doneAt)) as ArchivedTask[];
}

function SortableRole({
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
}: {
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
}) {
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
      className={`rounded-2xl border border-slate-200/70 bg-gradient-to-b from-white/95 to-slate-50/80 px-4 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.08)] ${
        isDragging ? "ring-2 ring-amber-200" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={onToggle}
          className="rounded-full p-1 text-slate-500 hover:text-slate-900 hover:bg-white"
          aria-label={isExpanded ? "Свернуть роль" : "Развернуть роль"}
        >
          {isExpanded ? "▾" : "▸"}
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
                if (event.key === "Enter") {
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

export default function SuperAdminTaskPanel() {
  const { isSuperAdmin } = useAuth();
  const [roles, setRoles] = useState<TaskRole[]>([]);
  const [archivedTasks, setArchivedTasks] = useState<ArchivedTask[]>([]);
  const [expandedRoles, setExpandedRoles] = useState<Record<string, boolean>>({});
  const [newRoleTitle, setNewRoleTitle] = useState("");
  const [taskDrafts, setTaskDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    let cancelled = false;

    async function loadBoard() {
      if (!isSuperAdmin) {
        setRoles([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const snap = await getDoc(TASK_BOARD_REF);
        const data = snap.exists() ? snap.data() : {};
        const nextRoles = normalizeRoles((data as { roles?: unknown }).roles);
        const nextArchived = normalizeArchive((data as { archivedTasks?: unknown }).archivedTasks);
        if (!cancelled) {
          setRoles(nextRoles);
          setArchivedTasks(nextArchived);
          setExpandedRoles((prev) => {
            const next = { ...prev };
            nextRoles.forEach((role) => {
              if (next[role.id] === undefined) {
                next[role.id] = true;
              }
            });
            return next;
          });
          setError(null);
        }
      } catch (err) {
        debugError("[superadmin tasks] load error", err);
        if (!cancelled) {
          setError("Не удалось загрузить список задач.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadBoard();
    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin]);

  const saveBoard = async (nextRoles: TaskRole[], nextArchive: ArchivedTask[] = archivedTasks) => {
    setSaving(true);
    try {
      await setDoc(
        TASK_BOARD_REF,
        {
          roles: nextRoles,
          archivedTasks: nextArchive,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setError(null);
    } catch (err) {
      debugError("[superadmin tasks] save error", err);
      setError("Не удалось сохранить изменения.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddRole = async () => {
    const title = newRoleTitle.trim();
    if (!title) return;
    const nextRole: TaskRole = {
      id: createId(),
      title,
      tasks: [],
      order: roles.length,
    };
    const nextRoles = [...roles, nextRole];
    setRoles(nextRoles);
    setNewRoleTitle("");
    setExpandedRoles((prev) => ({ ...prev, [nextRole.id]: true }));
    await saveBoard(nextRoles);
  };

  const handleAddTask = async (roleId: string) => {
    const draft = (taskDrafts[roleId] || "").trim();
    if (!draft) return;
    const nextRoles = roles.map((role) =>
      role.id === roleId
        ? {
            ...role,
            tasks: [...role.tasks, { id: createId(), text: draft }],
          }
        : role
    );
    setRoles(nextRoles);
    setTaskDrafts((prev) => ({ ...prev, [roleId]: "" }));
    await saveBoard(nextRoles);
  };

  const handleCompleteTask = async (roleId: string, taskId: string) => {
    const role = roles.find((item) => item.id === roleId);
    if (!role) return;
    const task = role.tasks.find((item) => item.id === taskId);
    if (!task) return;

    const nextRoles = roles.map((item) =>
      item.id === roleId
        ? {
            ...item,
            tasks: item.tasks.filter((t) => t.id !== taskId),
          }
        : item
    );
    const nextArchive = [
      {
        id: createId(),
        text: task.text,
        roleId: role.id,
        roleTitle: role.title,
        doneAt: new Date().toISOString(),
      },
      ...archivedTasks,
    ];
    setRoles(nextRoles);
    setArchivedTasks(nextArchive);
    await saveBoard(nextRoles, nextArchive);
  };

  const handleDeleteTask = async (roleId: string, taskId: string) => {
    const nextRoles = roles.map((role) =>
      role.id === roleId ? { ...role, tasks: role.tasks.filter((task) => task.id !== taskId) } : role
    );
    setRoles(nextRoles);
    await saveBoard(nextRoles);
  };

  const handleDeleteRole = async (roleId: string) => {
    const role = roles.find((item) => item.id === roleId);
    if (!role) return;
    const message = role.tasks.length
      ? "Удалить роль и все задачи?"
      : "Удалить роль?";
    if (!window.confirm(message)) return;
    const nextRoles = roles
      .filter((item) => item.id !== roleId)
      .map((item, index) => ({ ...item, order: index }));
    setRoles(nextRoles);
    await saveBoard(nextRoles);
  };

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = roles.findIndex((role) => role.id === active.id);
    const newIndex = roles.findIndex((role) => role.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(roles, oldIndex, newIndex).map((role, index) => ({
      ...role,
      order: index,
    }));
    setRoles(reordered);
    await saveBoard(reordered);
  };

  const handleDeleteArchivedTask = async (taskId: string) => {
    const nextArchive = archivedTasks.filter((task) => task.id !== taskId);
    setArchivedTasks(nextArchive);
    await saveBoard(roles, nextArchive);
  };

  return (
    <div className="rounded-[28px] border border-slate-200/70 bg-white/80 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-md space-y-5">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Меню задач</p>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Роли и задачи</h2>
            <p className="text-xs text-slate-500">
              Добавляйте роли, фиксируйте задачи и меняйте порядок.
            </p>
          </div>
          {saving && <span className="text-[10px] uppercase text-amber-600">Сохраняю…</span>}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Новая роль
        </label>
        <div className="flex flex-col gap-2">
          <input
            value={newRoleTitle}
            onChange={(event) => setNewRoleTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleAddRole();
              }
            }}
            placeholder="Например: Контент-редактор"
            className="w-full rounded-2xl border border-slate-200/70 bg-white/90 px-3 py-2 text-xs text-slate-700 placeholder:text-slate-400"
            disabled={saving}
          />
          <button
            type="button"
            onClick={handleAddRole}
            disabled={saving}
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-white/90 disabled:opacity-60"
          >
            Добавить роль
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200/60 bg-white/70 px-3 py-4 text-sm text-slate-500">
          Загружаем роли...
        </div>
      ) : roles.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/60 bg-white/70 px-3 py-4 text-sm text-slate-500">
          Пока нет ролей. Добавьте первую роль.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={roles.map((role) => role.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {roles.map((role) => (
                <SortableRole
                  key={role.id}
                  role={role}
                  isExpanded={expandedRoles[role.id] ?? true}
                  taskDraft={taskDrafts[role.id] ?? ""}
                  onToggle={() =>
                    setExpandedRoles((prev) => ({ ...prev, [role.id]: !(prev[role.id] ?? true) }))
                  }
                  onTaskDraftChange={(value) =>
                    setTaskDrafts((prev) => ({ ...prev, [role.id]: value }))
                  }
                  onAddTask={() => handleAddTask(role.id)}
                  onCompleteTask={(taskId) => handleCompleteTask(role.id, taskId)}
                  onDeleteTask={(taskId) => handleDeleteTask(role.id, taskId)}
                  onDeleteRole={() => handleDeleteRole(role.id)}
                  disabled={saving}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Архив</h3>
          <span className="text-xs text-slate-500">
            {archivedTasks.length} задач
          </span>
        </div>
        {archivedTasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-3 py-3 text-xs text-slate-500">
            Выполненные задачи будут появляться здесь.
          </div>
        ) : (
          <div className="space-y-2">
            {archivedTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-2 rounded-2xl border border-slate-200/60 bg-white/75 px-3 py-2 text-sm text-slate-700"
              >
                <span className="mt-1 text-emerald-500">✓</span>
                <div className="flex-1">
                  <div className="leading-snug">{task.text}</div>
                  <div className="text-xs text-slate-500">
                    ({task.roleTitle})
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteArchivedTask(task.id)}
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

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
