import { useState, useCallback } from 'react';
import { makeUserAdmin, removeAdmin, updateCourseAccess, setUserRole } from '../../../../lib/adminFunctions';
import type { CourseAccessMap } from '../../../../types/user';
import type { UserRecord } from '../../../../hooks/useAllUsers';

interface UseUserManagementOptions {
  isSuperAdmin: boolean;
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
  handleRowClick: (user: UserRecord) => void;
  handleCourseAccessChange: (course: keyof CourseAccessMap, value: boolean) => void;
  handleSaveCourseAccess: (targetUid: string) => Promise<void>;
}

/**
 * Хук для управления пользователями в админ-панели
 * Инкапсулирует всю логику работы с ролями и доступом к курсам
 */
export function useUserManagement({ isSuperAdmin }: UseUserManagementOptions): UseUserManagementReturn {
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

  const handleRowClick = useCallback((user: UserRecord) => {
    if (expandedUserId === user.uid) {
      // Закрываем
      setExpandedUserId(null);
      setEditingCourseAccess(null);
    } else {
      // Открываем
      setExpandedUserId(user.uid);
      setEditingCourseAccess(user.courseAccess ?? {
        development: false,
        clinical: false,
        general: false,
      });
    }
  }, [expandedUserId]);

  const handleCourseAccessChange = useCallback((course: keyof CourseAccessMap, value: boolean) => {
    setEditingCourseAccess((prev) => {
      if (!prev) return null;
      return { ...prev, [course]: value };
    });
  }, []);

  const handleSaveCourseAccess = useCallback(async (targetUid: string) => {
    if (!editingCourseAccess) return;

    setCourseAccessSaving(true);
    try {
      await updateCourseAccess({
        targetUid,
        courseAccess: editingCourseAccess,
      });
      window.alert('Доступ к курсам обновлён');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка обновления доступа';
      window.alert(message);
    } finally {
      setCourseAccessSaving(false);
    }
  }, [editingCourseAccess]);

  return {
    actionLoading,
    courseAccessSaving,
    expandedUserId,
    editingCourseAccess,
    handleMakeAdmin,
    handleRemoveAdmin,
    handleSetRole,
    handleRowClick,
    handleCourseAccessChange,
    handleSaveCourseAccess,
  };
}
