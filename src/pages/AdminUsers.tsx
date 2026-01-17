import { useState } from "react";
import { useAllUsers } from "../hooks/useAllUsers";
import { useAuth } from "../auth/AuthProvider";
import { AddAdminModal } from "../components/AddAdminModal";
import { SuperAdminBadge } from "../components/SuperAdminBadge";
import { UserRow, useUserManagement } from "./admin/users";

type UserFilter = 'all' | 'students' | 'admins' | 'guests';

export default function AdminUsers() {
  const { users, loading, error } = useAllUsers();
  const { user: currentUser, isSuperAdmin } = useAuth();
  const [filter, setFilter] = useState<UserFilter>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
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
  } = useUserManagement({ isSuperAdmin });

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

      <FilterButtons filter={filter} stats={stats} onFilterChange={setFilter} />

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
                onSetRole={(role) => handleSetRole(user.uid, role)}
                onToggleDisabled={() => handleToggleDisabled(user.uid, user.disabled === true)}
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

/**
 * Кнопки фильтрации пользователей
 */
function FilterButtons({
  filter,
  stats,
  onFilterChange,
}: {
  filter: UserFilter;
  stats: { total: number; admins: number; students: number; guests: number };
  onFilterChange: (filter: UserFilter) => void;
}) {
  const filters: { key: UserFilter; label: string; count: number }[] = [
    { key: 'all', label: 'Все', count: stats.total },
    { key: 'guests', label: 'Гости', count: stats.guests },
    { key: 'students', label: 'Студенты', count: stats.students },
    { key: 'admins', label: 'Администраторы', count: stats.admins },
  ];

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap gap-2">
        {filters.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => onFilterChange(key)}
            className={`rounded px-4 py-2 ${
              filter === key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {label} ({count})
          </button>
        ))}
      </div>
      <SuperAdminBadge />
    </div>
  );
}
