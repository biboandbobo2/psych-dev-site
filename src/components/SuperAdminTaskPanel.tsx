import { useEffect, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

import { db } from '../lib/firebase';
import { useAuth } from '../auth/AuthProvider';
import { debugError } from '../lib/debug';
import { ArchiveSection } from './superAdminTasks/ArchiveSection';
import { NewRoleForm } from './superAdminTasks/NewRoleForm';
import { SortableRole } from './superAdminTasks/SortableRole';
import { createId, normalizeArchive, normalizeRoles } from './superAdminTasks/normalize';
import type { ArchivedTask, TaskRole } from './superAdminTasks/types';

const TASK_BOARD_REF = doc(db, 'admin', 'task-board');

export default function SuperAdminTaskPanel() {
  const { isSuperAdmin } = useAuth();
  const [roles, setRoles] = useState<TaskRole[]>([]);
  const [archivedTasks, setArchivedTasks] = useState<ArchivedTask[]>([]);
  const [expandedRoles, setExpandedRoles] = useState<Record<string, boolean>>({});
  const [newRoleTitle, setNewRoleTitle] = useState('');
  const [taskDrafts, setTaskDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
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
              if (next[role.id] === undefined) next[role.id] = true;
            });
            return next;
          });
          setError(null);
        }
      } catch (err) {
        debugError('[superadmin tasks] load error', err);
        if (!cancelled) setError('Не удалось загрузить список задач.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadBoard();
    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin]);

  const saveBoard = async (
    nextRoles: TaskRole[],
    nextArchive: ArchivedTask[] = archivedTasks,
  ) => {
    setSaving(true);
    try {
      await setDoc(
        TASK_BOARD_REF,
        {
          roles: nextRoles,
          archivedTasks: nextArchive,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      setError(null);
    } catch (err) {
      debugError('[superadmin tasks] save error', err);
      setError('Не удалось сохранить изменения.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddRole = async () => {
    const title = newRoleTitle.trim();
    if (!title) return;
    const nextRole: TaskRole = { id: createId(), title, tasks: [], order: roles.length };
    const nextRoles = [...roles, nextRole];
    setRoles(nextRoles);
    setNewRoleTitle('');
    setExpandedRoles((prev) => ({ ...prev, [nextRole.id]: true }));
    await saveBoard(nextRoles);
  };

  const handleAddTask = async (roleId: string) => {
    const draft = (taskDrafts[roleId] || '').trim();
    if (!draft) return;
    const nextRoles = roles.map((role) =>
      role.id === roleId
        ? { ...role, tasks: [...role.tasks, { id: createId(), text: draft }] }
        : role,
    );
    setRoles(nextRoles);
    setTaskDrafts((prev) => ({ ...prev, [roleId]: '' }));
    await saveBoard(nextRoles);
  };

  const handleCompleteTask = async (roleId: string, taskId: string) => {
    const role = roles.find((item) => item.id === roleId);
    if (!role) return;
    const task = role.tasks.find((item) => item.id === taskId);
    if (!task) return;

    const nextRoles = roles.map((item) =>
      item.id === roleId
        ? { ...item, tasks: item.tasks.filter((t) => t.id !== taskId) }
        : item,
    );
    const nextArchive: ArchivedTask[] = [
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
      role.id === roleId
        ? { ...role, tasks: role.tasks.filter((task) => task.id !== taskId) }
        : role,
    );
    setRoles(nextRoles);
    await saveBoard(nextRoles);
  };

  const handleDeleteRole = async (roleId: string) => {
    const role = roles.find((item) => item.id === roleId);
    if (!role) return;
    const message = role.tasks.length ? 'Удалить роль и все задачи?' : 'Удалить роль?';
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

      <NewRoleForm
        value={newRoleTitle}
        onChange={setNewRoleTitle}
        onSubmit={handleAddRole}
        disabled={saving}
      />

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
          <SortableContext
            items={roles.map((role) => role.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {roles.map((role) => (
                <SortableRole
                  key={role.id}
                  role={role}
                  isExpanded={expandedRoles[role.id] ?? true}
                  taskDraft={taskDrafts[role.id] ?? ''}
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

      <ArchiveSection
        tasks={archivedTasks}
        onDelete={handleDeleteArchivedTask}
        saving={saving}
      />

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
