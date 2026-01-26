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

function SortableRole({
  role,
  isExpanded,
  taskDraft,
  onToggle,
  onTaskDraftChange,
  onAddTask,
  disabled,
}: {
  role: TaskRole;
  isExpanded: boolean;
  taskDraft: string;
  onToggle: () => void;
  onTaskDraftChange: (value: string) => void;
  onAddTask: () => void;
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
      className={`rounded-xl border border-border/60 bg-card2 px-3 py-3 shadow-sm ${
        isDragging ? "ring-2 ring-amber-300" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggle}
          className="rounded-full p-1 text-muted hover:text-fg hover:bg-card"
          aria-label={isExpanded ? "Свернуть роль" : "Развернуть роль"}
        >
          {isExpanded ? "▾" : "▸"}
        </button>
        <div className="flex-1">
          <div className="text-sm font-semibold text-fg">{role.title}</div>
          <div className="text-xs text-muted">Задач: {role.tasks.length}</div>
        </div>
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="cursor-grab rounded px-2 py-1 text-muted hover:text-fg hover:bg-card"
          aria-label="Изменить порядок роли"
        >
          ⋮⋮
        </button>
      </div>

      {isExpanded && (
        <div className="mt-3 space-y-3">
          {role.tasks.length > 0 ? (
            <ul className="space-y-1 text-sm text-fg">
              {role.tasks.map((task) => (
                <li key={task.id} className="flex items-start gap-2">
                  <span className="mt-1 text-muted">•</span>
                  <span>{task.text}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-xs text-muted">Пока нет задач.</div>
          )}

          <div className="flex items-center gap-2">
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
              className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-xs text-fg"
              disabled={disabled}
            />
            <button
              type="button"
              onClick={onAddTask}
              disabled={disabled}
              className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-fg hover:bg-card disabled:opacity-60"
            >
              Добавить
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
        if (!cancelled) {
          setRoles(nextRoles);
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

  const saveRoles = async (nextRoles: TaskRole[]) => {
    setSaving(true);
    try {
      await setDoc(
        TASK_BOARD_REF,
        {
          roles: nextRoles,
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
    await saveRoles(nextRoles);
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
    await saveRoles(nextRoles);
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
    await saveRoles(reordered);
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-brand p-4 space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Меню задач</p>
        <h2 className="mt-2 text-lg font-semibold text-fg">Роли и задачи</h2>
        <p className="text-xs text-muted">Добавляйте роли, фиксируйте задачи и меняйте порядок.</p>
      </div>

      <div className="flex items-center gap-2">
        <input
          value={newRoleTitle}
          onChange={(event) => setNewRoleTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleAddRole();
            }
          }}
          placeholder="Новая роль"
          className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-xs text-fg"
          disabled={saving}
        />
        <button
          type="button"
          onClick={handleAddRole}
          disabled={saving}
          className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-fg hover:bg-card disabled:opacity-60"
        >
          Добавить
        </button>
      </div>

      {loading ? (
        <div className="rounded-xl border border-border/60 bg-card2 px-3 py-4 text-sm text-muted">
          Загружаем роли...
        </div>
      ) : roles.length === 0 ? (
        <div className="rounded-xl border border-border/60 bg-card2 px-3 py-4 text-sm text-muted">
          Пока нет ролей. Добавьте первую роль.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={roles.map((role) => role.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
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
                  disabled={saving}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
