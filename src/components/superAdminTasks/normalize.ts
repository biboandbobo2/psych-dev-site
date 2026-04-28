import type { ArchivedTask, TaskItem, TaskRole } from './types';

/** Возвращает crypto.randomUUID() где доступен, иначе fallback из Date+random. */
export function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Парсит сырые данные из Firestore (legacy + новый формат) в массив TaskRole.
 * Каждая роль получает id (если не было — generateId), title (или fallback
 * "Роль N"), список задач (string или { text } legacy форматы) и order.
 * Возвращает отсортированный по order массив.
 */
export function normalizeRoles(rawRoles: unknown): TaskRole[] {
  if (!Array.isArray(rawRoles)) return [];

  const roles = rawRoles.map((role, index) => {
    const roleObject = role as Partial<TaskRole> & { tasks?: unknown };
    const id = typeof roleObject.id === 'string' && roleObject.id ? roleObject.id : createId();
    const title =
      typeof roleObject.title === 'string' && roleObject.title.trim()
        ? roleObject.title.trim()
        : `Роль ${index + 1}`;
    const tasks: TaskItem[] = Array.isArray(roleObject.tasks)
      ? ((roleObject.tasks as unknown[])
          .map((task) => {
            if (typeof task === 'string') {
              const text = task.trim();
              return text ? { id: createId(), text } : null;
            }
            if (task && typeof task === 'object') {
              const taskObject = task as Partial<TaskItem>;
              const text = typeof taskObject.text === 'string' ? taskObject.text.trim() : '';
              if (!text) return null;
              return {
                id:
                  typeof taskObject.id === 'string' && taskObject.id ? taskObject.id : createId(),
                text,
              };
            }
            return null;
          })
          .filter(Boolean) as TaskItem[])
      : [];
    const order = typeof roleObject.order === 'number' ? roleObject.order : index;

    return { id, title, tasks, order };
  });

  return roles.sort((a, b) => a.order - b.order);
}

/**
 * Парсит сырые данные архива в массив ArchivedTask с защитой от
 * невалидных дат (fallback на now) и пустых записей.
 * Возвращает отсортированный по doneAt desc.
 */
export function normalizeArchive(rawArchive: unknown): ArchivedTask[] {
  if (!Array.isArray(rawArchive)) return [];

  return (
    rawArchive
      .map((entry) => {
        const item = entry as Record<string, unknown>;
        const text = typeof item.text === 'string' ? item.text.trim() : '';
        const roleTitle = typeof item.roleTitle === 'string' ? item.roleTitle.trim() : '';
        if (!text || !roleTitle) return null;
        const doneAt =
          typeof item.doneAt === 'string' && !Number.isNaN(Date.parse(item.doneAt))
            ? item.doneAt
            : new Date().toISOString();
        return {
          id: typeof item.id === 'string' && item.id ? item.id : createId(),
          text,
          roleId: typeof item.roleId === 'string' ? item.roleId : '',
          roleTitle,
          doneAt,
        };
      })
      .filter(Boolean) as ArchivedTask[]
  ).sort((a, b) => Date.parse(b.doneAt) - Date.parse(a.doneAt));
}
