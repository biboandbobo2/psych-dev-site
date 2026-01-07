import { useState } from "react";
import { useAllUsers, type UserRecord } from "../hooks/useAllUsers";
import { useAuth } from "../auth/AuthProvider";
import { makeUserAdmin, removeAdmin, updateCourseAccess } from "../lib/adminFunctions";
import { AddAdminModal } from "../components/AddAdminModal";
import { SuperAdminBadge } from "../components/SuperAdminBadge";
import type { CourseAccessMap, UserRole } from "../types/user";
import { ALL_COURSE_TYPES, COURSE_LABELS } from "../types/user";

/**
 * Возвращает читаемое название роли
 */
function getRoleLabel(role: UserRole): string {
  switch (role) {
    case 'super-admin':
      return 'Супер-админ';
    case 'admin':
      return 'Админ';
    case 'student':
      return 'Студент';
    case 'guest':
      return 'Гость';
    default:
      return role;
  }
}

/**
 * Возвращает CSS классы для бейджа роли
 */
function getRoleBadgeClasses(role: UserRole): string {
  switch (role) {
    case 'super-admin':
      return 'bg-purple-100 text-purple-800';
    case 'admin':
      return 'bg-blue-100 text-blue-800';
    case 'student':
      return 'bg-green-100 text-green-800';
    case 'guest':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export default function AdminUsers() {
  const { users, loading, error } = useAllUsers();
  const { user: currentUser, isSuperAdmin } = useAuth();
  const [filter, setFilter] = useState<'all' | 'students' | 'admins' | 'guests'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [editingCourseAccess, setEditingCourseAccess] = useState<CourseAccessMap | null>(null);
  const [courseAccessSaving, setCourseAccessSaving] = useState(false);

  if (!isSuperAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center">
        <div className="max-w-md space-y-3">
          <h1 className="text-2xl font-semibold text-gray-900">Доступ запрещён</h1>
          <p className="text-gray-600">
            Управление пользователями доступно только владельцу проекта (super-admin).
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl">Загрузка пользователей...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-red-500">Ошибка: {error}</div>
      </div>
    );
  }

  const filteredUsers = users.filter((user) => {
    if (filter === 'all') return true;
    if (filter === 'admins') return user.role === 'admin' || user.role === 'super-admin';
    if (filter === 'students') return user.role === 'student';
    if (filter === 'guests') return user.role === 'guest';
    return true;
  });

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === 'admin' || u.role === 'super-admin').length,
    students: users.filter((u) => u.role === 'student').length,
    guests: users.filter((u) => u.role === 'guest').length,
  };

  const handleMakeAdmin = async (uid: string) => {
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
  };

  const handleRemoveAdmin = async (uid: string) => {
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
  };

  const handleRowClick = (user: UserRecord) => {
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
  };

  const handleCourseAccessChange = (course: keyof CourseAccessMap, value: boolean) => {
    if (!editingCourseAccess) return;
    setEditingCourseAccess({
      ...editingCourseAccess,
      [course]: value,
    });
  };

  const handleSaveCourseAccess = async (targetUid: string) => {
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
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-2 text-3xl font-bold">Управление пользователями</h1>
          <p className="text-gray-600">
            Всего: {stats.total} (Админов: {stats.admins}, Студентов: {stats.students}, Гостей: {stats.guests})
          </p>
        </div>

        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
          >
            + Добавить админа
          </button>
        )}
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`rounded px-4 py-2 ${
              filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Все ({stats.total})
          </button>
          <button
            onClick={() => setFilter('guests')}
            className={`rounded px-4 py-2 ${
              filter === 'guests' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Гости ({stats.guests})
          </button>
          <button
            onClick={() => setFilter('students')}
            className={`rounded px-4 py-2 ${
              filter === 'students' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Студенты ({stats.students})
          </button>
          <button
            onClick={() => setFilter('admins')}
            className={`rounded px-4 py-2 ${
              filter === 'admins' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Администраторы ({stats.admins})
          </button>
        </div>
        <SuperAdminBadge />
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Пользователь
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Роль
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Доступ к курсам
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Последний вход
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {filteredUsers.map((user) => (
              <UserRow
                key={user.uid}
                user={user}
                currentUserUid={currentUser?.uid}
                isSuperAdmin={isSuperAdmin}
                isExpanded={expandedUserId === user.uid}
                actionLoading={actionLoading}
                editingCourseAccess={expandedUserId === user.uid ? editingCourseAccess : null}
                courseAccessSaving={courseAccessSaving}
                onRowClick={() => handleRowClick(user)}
                onMakeAdmin={() => handleMakeAdmin(user.uid)}
                onRemoveAdmin={() => handleRemoveAdmin(user.uid)}
                onCourseAccessChange={handleCourseAccessChange}
                onSaveCourseAccess={() => handleSaveCourseAccess(user.uid)}
              />
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="py-12 text-center text-gray-500">Пользователи не найдены</div>
        )}
      </div>

      <AddAdminModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => window.alert('Администратор добавлен!')}
      />
    </div>
  );
}

interface UserRowProps {
  user: UserRecord;
  currentUserUid: string | undefined;
  isSuperAdmin: boolean;
  isExpanded: boolean;
  actionLoading: string | null;
  editingCourseAccess: CourseAccessMap | null;
  courseAccessSaving: boolean;
  onRowClick: () => void;
  onMakeAdmin: () => void;
  onRemoveAdmin: () => void;
  onCourseAccessChange: (course: keyof CourseAccessMap, value: boolean) => void;
  onSaveCourseAccess: () => void;
}

function UserRow({
  user,
  currentUserUid,
  isSuperAdmin,
  isExpanded,
  actionLoading,
  editingCourseAccess,
  courseAccessSaving,
  onRowClick,
  onMakeAdmin,
  onRemoveAdmin,
  onCourseAccessChange,
  onSaveCourseAccess,
}: UserRowProps) {
  const isCurrentUser = user.uid === currentUserUid;
  const hasFullAccess = user.role === 'student' || user.role === 'admin' || user.role === 'super-admin';

  // Подсчитываем количество открытых курсов для guest
  const openCoursesCount = user.role === 'guest'
    ? ALL_COURSE_TYPES.filter((c) => user.courseAccess?.[c]).length
    : ALL_COURSE_TYPES.length;

  return (
    <>
      <tr
        className={`cursor-pointer transition-colors ${
          isCurrentUser ? 'bg-blue-50' : isExpanded ? 'bg-gray-50' : 'hover:bg-gray-50'
        }`}
        onClick={onRowClick}
      >
        <td className="whitespace-nowrap px-6 py-4">
          <div className="flex items-center">
            {user.photoURL && (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="mr-3 h-10 w-10 rounded-full"
              />
            )}
            <div>
              <div className="text-sm font-medium text-gray-900">
                {user.displayName || 'Без имени'}
              </div>
              <div className="text-sm text-gray-500">UID: {user.uid.substring(0, 8)}...</div>
            </div>
          </div>
        </td>
        <td className="whitespace-nowrap px-6 py-4">
          <div className="text-sm text-gray-900">{user.email}</div>
        </td>
        <td className="whitespace-nowrap px-6 py-4">
          <span
            className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getRoleBadgeClasses(user.role)}`}
          >
            {getRoleLabel(user.role)}
          </span>
        </td>
        <td className="whitespace-nowrap px-6 py-4">
          {hasFullAccess ? (
            <span className="text-sm text-green-600">Полный доступ</span>
          ) : (
            <span className="text-sm text-gray-600">
              {openCoursesCount} из {ALL_COURSE_TYPES.length} курсов
            </span>
          )}
        </td>
        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
          {user.lastLoginAt?.toDate?.()?.toLocaleDateString('ru-RU') || 'Недавно'}
        </td>
        <td className="whitespace-nowrap px-6 py-4 text-sm" onClick={(e) => e.stopPropagation()}>
          {isSuperAdmin && user.uid !== currentUserUid ? (
            <div className="flex gap-2">
              {user.role === 'student' || user.role === 'guest' ? (
                <button
                  type="button"
                  onClick={onMakeAdmin}
                  disabled={actionLoading === user.uid}
                  className="rounded bg-green-600 px-3 py-1 text-white transition hover:bg-green-700 disabled:bg-gray-400"
                >
                  {actionLoading === user.uid ? 'Ждите...' : 'Сделать админом'}
                </button>
              ) : user.role === 'admin' ? (
                <button
                  type="button"
                  onClick={onRemoveAdmin}
                  disabled={actionLoading === user.uid}
                  className="rounded bg-red-600 px-3 py-1 text-white transition hover:bg-red-700 disabled:bg-gray-400"
                >
                  {actionLoading === user.uid ? 'Ждите...' : 'Снять права'}
                </button>
              ) : (
                <span className="text-gray-400">Super-admin</span>
              )}
            </div>
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </td>
      </tr>

      {/* Раскрывающаяся строка с управлением доступом к курсам */}
      {isExpanded && editingCourseAccess && (
        <tr className="bg-gray-50">
          <td colSpan={6} className="px-6 py-4">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h4 className="mb-3 text-sm font-semibold text-gray-700">
                Доступ к курсам
                {hasFullAccess && (
                  <span className="ml-2 text-xs font-normal text-gray-500">
                    (роль {getRoleLabel(user.role)} имеет полный доступ)
                  </span>
                )}
              </h4>

              <div className="mb-4 flex flex-wrap gap-4">
                {ALL_COURSE_TYPES.map((course) => (
                  <label
                    key={course}
                    className={`flex items-center gap-2 rounded-lg border p-3 transition ${
                      hasFullAccess
                        ? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-60'
                        : editingCourseAccess[course]
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={hasFullAccess || editingCourseAccess[course] || false}
                      disabled={hasFullAccess}
                      onChange={(e) => onCourseAccessChange(course, e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <span className="text-sm font-medium text-gray-700">{COURSE_LABELS[course]}</span>
                  </label>
                ))}
              </div>

              {!hasFullAccess && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onSaveCourseAccess}
                    disabled={courseAccessSaving}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {courseAccessSaving ? 'Сохранение...' : 'Сохранить изменения'}
                  </button>
                  <span className="text-xs text-gray-500">
                    Изменения вступят в силу немедленно
                  </span>
                </div>
              )}

              {hasFullAccess && (
                <p className="text-xs text-gray-500">
                  Для изменения доступа к отдельным курсам измените роль пользователя на &quot;Гость&quot;.
                </p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
