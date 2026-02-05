import { useState, useCallback } from 'react';
import { makeUserAdmin, removeAdmin, updateCourseAccess, setUserRole, toggleUserDisabled } from '../../../../lib/adminFunctions';
import type { CourseAccessMap } from '../../../../types/user';
import type { UserRecord } from '../../../../hooks/useAllUsers';

interface UseUserManagementOptions {
  isSuperAdmin: boolean;
  availableCourseIds: string[];
}

interface UseUserManagementReturn {
  // Loading states
  actionLoading: string | null;
  courseAccessSaving: boolean;

  // Expanded row state
  expandedUserId: string | null;
  editingCourseAccess: CourseAccessMap | null;

  // Handlers
  handleMakeAdmin: (uid: string) => Promise<void>;
  handleRemoveAdmin: (uid: string) => Promise<void>;
  handleSetRole: (targetUid: string, newRole: 'guest' | 'student') => Promise<void>;
  handleToggleDisabled: (uid: string, currentDisabled: boolean) => Promise<void>;
  handleRowClick: (user: UserRecord) => void;
  handleCourseAccessChange: (courseId: string, value: boolean) => void;
  handleSaveCourseAccess: (targetUid: string) => Promise<void>;
}

/**
 * Хук для управления пользователями в админ-панели
 * Инкапсулирует всю логику работы с ролями и доступом к курсам
 */
export function useUserManagement({
  isSuperAdmin,
  availableCourseIds,
}: UseUserManagementOptions): UseUserManagementReturn {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [editingCourseAccess, setEditingCourseAccess] = useState<CourseAccessMap | null>(null);
  const [courseAccessSaving, setCourseAccessSaving] = useState(false);

  const handleMakeAdmin = useCallback(async (uid: string) => {
    if (!isSuperAdmin) return;
    if (!window.confirm('Назначить этого пользователя администратором?')) return;

    setActionLoading(uid);
    try {
      await makeUserAdmin({ targetUid: uid });
      window.alert('Пользователь назначен администратором');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка назначения администратора';
      window.alert(message);
    } finally {
      setActionLoading(null);
    }
  }, [isSuperAdmin]);

  const handleRemoveAdmin = useCallback(async (uid: string) => {
    if (!isSuperAdmin) return;
    if (!window.confirm('Снять права администратора?')) return;

    setActionLoading(uid);
    try {
      await removeAdmin(uid);
      window.alert('Права администратора сняты');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка снятия прав администратора';
      window.alert(message);
    } finally {
      setActionLoading(null);
    }
  }, [isSuperAdmin]);

  const handleSetRole = useCallback(async (targetUid: string, newRole: 'guest' | 'student') => {
    const roleLabel = newRole === 'guest' ? 'гостем' : 'студентом';
    if (!window.confirm(`Сделать этого пользователя ${roleLabel}?`)) return;

    setActionLoading(targetUid);
    try {
      await setUserRole({ targetUid, role: newRole });
      window.alert(`Пользователь теперь ${roleLabel}. Изменения вступят в силу после перелогина.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка смены роли';
      window.alert(message);
    } finally {
      setActionLoading(null);
    }
  }, []);

  const handleToggleDisabled = useCallback(async (uid: string, currentDisabled: boolean) => {
    if (!isSuperAdmin) return;

    const action = currentDisabled ? 'включить' : 'отключить';
    const confirmMessage = currentDisabled
      ? 'Включить пользователя? Он сможет снова войти.'
      : 'Отключить пользователя? Он не сможет войти, но все данные сохранятся.';

    if (!window.confirm(confirmMessage)) return;

    setActionLoading(uid);
    try {
      const result = await toggleUserDisabled({ targetUid: uid, disabled: !currentDisabled });
      window.alert(result.message);
    } catch (err) {
      const message = err instanceof Error ? err.message : `Ошибка: не удалось ${action} пользователя`;
      window.alert(message);
    } finally {
      setActionLoading(null);
    }
  }, [isSuperAdmin]);

  const handleRowClick = useCallback((user: UserRecord) => {
    if (expandedUserId === user.uid) {
      // Закрываем
      setExpandedUserId(null);
      setEditingCourseAccess(null);
    } else {
      // Открываем
      setExpandedUserId(user.uid);
      const currentAccess = user.courseAccess ?? {};
      const mergedAccess: CourseAccessMap = { ...currentAccess };
      for (const courseId of availableCourseIds) {
        if (typeof mergedAccess[courseId] !== 'boolean') {
          mergedAccess[courseId] = false;
        }
      }
      setEditingCourseAccess(mergedAccess);
    }
  }, [expandedUserId, availableCourseIds]);

  const handleCourseAccessChange = useCallback((courseId: string, value: boolean) => {
    setEditingCourseAccess((prev) => {
      if (!prev) return null;
      return { ...prev, [courseId]: value };
    });
  }, []);

  const handleSaveCourseAccess = useCallback(async (targetUid: string) => {
    if (!editingCourseAccess) return;

    const normalizedAccess: CourseAccessMap = {};
    const allKnownCourseIds = new Set<string>([
      ...availableCourseIds,
      ...Object.keys(editingCourseAccess),
    ]);
    for (const courseId of allKnownCourseIds) {
      normalizedAccess[courseId] = Boolean(editingCourseAccess[courseId]);
    }

    setCourseAccessSaving(true);
    try {
      await updateCourseAccess({
        targetUid,
        courseAccess: normalizedAccess,
      });
      window.alert('Доступ к курсам обновлён');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка обновления доступа';
      window.alert(message);
    } finally {
      setCourseAccessSaving(false);
    }
  }, [editingCourseAccess, availableCourseIds]);

  return {
    actionLoading,
    courseAccessSaving,
    expandedUserId,
    editingCourseAccess,
    handleMakeAdmin,
    handleRemoveAdmin,
    handleSetRole,
    handleToggleDisabled,
    handleRowClick,
    handleCourseAccessChange,
    handleSaveCourseAccess,
  };
}
