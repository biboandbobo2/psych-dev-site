import { useState } from "react";
import { useAllUsers } from "../hooks/useAllUsers";
import { useAuth } from "../auth/AuthProvider";

export default function AdminUsers() {
  const { users, loading, error } = useAllUsers();
  const { user: currentUser } = useAuth();
  const [filter, setFilter] = useState<'all' | 'students' | 'admins'>('all');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Загрузка пользователей...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Управление пользователями</h1>
        <p className="text-gray-600">
          Всего пользователей: {stats.total} (Админов: {stats.admins}, Студентов: {stats.students})
        </p>
      </div>

      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Все ({stats.total})
        </button>
        <button
          onClick={() => setFilter('students')}
          className={`px-4 py-2 rounded ${
            filter === 'students'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Студенты ({stats.students})
        </button>
        <button
          onClick={() => setFilter('admins')}
          className={`px-4 py-2 rounded ${
            filter === 'admins'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Администраторы ({stats.admins})
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Пользователь
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Роль
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Последний вход
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <tr key={user.uid} className={user.uid === currentUser?.uid ? 'bg-blue-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {user.photoURL && (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'User'}
                        className="h-10 w-10 rounded-full mr-3"
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
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{user.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
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
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.lastLoginAt?.toDate?.()?.toLocaleDateString('ru-RU') || 'Недавно'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                  Скоро...
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-gray-500">Пользователи не найдены</div>
        )}
      </div>
    </div>
  );
}
