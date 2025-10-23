import { useState } from "react";
import { useAllUsers } from "../hooks/useAllUsers";
import { useAuth } from "../auth/AuthProvider";
import { makeUserAdmin, removeAdmin } from "../lib/adminFunctions";
import { AddAdminModal } from "../components/AddAdminModal";
import { SuperAdminBadge } from "../components/SuperAdminBadge";
import { SUPER_ADMIN_EMAIL } from "../constants/superAdmin";

export default function AdminUsers() {
  const { users, loading, error } = useAllUsers();
  const { user: currentUser } = useAuth();
  const [filter, setFilter] = useState<'all' | 'students' | 'admins'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isSuperAdmin = currentUser?.email === SUPER_ADMIN_EMAIL;

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
    return true;
  });

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === 'admin' || u.role === 'super-admin').length,
    students: users.filter((u) => u.role === 'student').length,
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-2 text-3xl font-bold">Управление пользователями</h1>
          <p className="text-gray-600">
            Всего пользователей: {stats.total} (Админов: {stats.admins}, Студентов: {stats.students})
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
                Последний вход
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {filteredUsers.map((user) => (
              <tr key={user.uid} className={user.uid === currentUser?.uid ? 'bg-blue-50' : ''}>
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
                    className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                      user.role === 'super-admin'
                        ? 'bg-purple-100 text-purple-800'
                        : user.role === 'admin'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {user.role === 'super-admin'
                      ? 'Супер-админ'
                      : user.role === 'admin'
                      ? 'Админ'
                      : 'Студент'}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {user.lastLoginAt?.toDate?.()?.toLocaleDateString('ru-RU') || 'Недавно'}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  {isSuperAdmin && user.uid !== currentUser?.uid ? (
                    <div className="flex gap-2">
                      {user.role === 'student' ? (
                        <button
                          type="button"
                          onClick={() => handleMakeAdmin(user.uid)}
                          disabled={actionLoading === user.uid}
                          className="rounded bg-green-600 px-3 py-1 text-white transition hover:bg-green-700 disabled:bg-gray-400"
                        >
                          {actionLoading === user.uid ? 'Ждите...' : 'Сделать админом'}
                        </button>
                      ) : user.role === 'admin' ? (
                        <button
                          type="button"
                          onClick={() => handleRemoveAdmin(user.uid)}
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
                    <span className="text-gray-400">Нет прав</span>
                  )}
                </td>
              </tr>
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
