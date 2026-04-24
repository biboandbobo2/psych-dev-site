import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { SITE_NAME } from '../../../routes';
import { useAllGroups } from '../../../hooks/useAllGroups';
import { useAllUsers } from '../../../hooks/useAllUsers';
import { useCourses } from '../../../hooks/useCourses';
import { useAuth } from '../../../auth/AuthProvider';
import { GroupEditorModal } from './GroupEditorModal';
import type { Group } from '../../../types/groups';

export default function AdminGroups() {
  const { isSuperAdmin } = useAuth();
  const { groups, loading, error } = useAllGroups();
  const { users } = useAllUsers();
  const { courses } = useCourses({ includeUnpublished: true });
  const [editing, setEditing] = useState<Group | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  if (!isSuperAdmin) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p>Управление группами доступно только супер-админу.</p>
        <Link to="/superadmin" className="text-blue-600 underline">← Админ-панель</Link>
      </div>
    );
  }

  const userByUid = new Map(users.map((u) => [u.uid, u]));
  const courseById = new Map(courses.map((c) => [c.id, c]));

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-6">
      <Helmet>
        <title>Группы студентов — {SITE_NAME}</title>
      </Helmet>

      <header className="flex items-start justify-between gap-3">
        <div>
          <Link to="/superadmin" className="text-sm text-blue-600 hover:underline">← Админ-панель</Link>
          <h1 className="text-2xl font-bold sm:text-3xl">Группы студентов</h1>
          <p className="mt-1 text-sm text-gray-600">
            Поток или когорта: общие курсы + объявления + офлайн-события.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setIsCreating(true);
          }}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          + Создать группу
        </button>
      </header>

      {loading ? (
        <div className="text-gray-500">Загрузка…</div>
      ) : error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Ошибка: {error}
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
          Групп пока нет. Нажми «Создать группу», чтобы собрать поток студентов,
          открыть им общие курсы и писать объявления.
        </div>
      ) : (
        <ul className="space-y-3">
          {groups.map((group) => {
            const memberNames = group.memberIds
              .map((uid) => {
                const u = userByUid.get(uid);
                return u?.displayName || u?.email || uid;
              })
              .slice(0, 5);
            const courseNames = group.grantedCourses
              .map((cid) => {
                const c = courseById.get(cid);
                return c ? `${c.icon} ${c.name}` : cid;
              });
            return (
              <li key={group.id}>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(group);
                    setIsCreating(false);
                  }}
                  className="block w-full rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:border-blue-300 hover:bg-blue-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
                      {group.description && (
                        <p className="mt-1 text-sm text-gray-600">{group.description}</p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-700">
                          👥 {group.memberIds.length} участников
                        </span>
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-700">
                          📚 {group.grantedCourses.length} курсов
                        </span>
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-700">
                          📢 {group.announcementAdminIds.length} объявл. админов
                        </span>
                      </div>
                      {courseNames.length > 0 && (
                        <p className="mt-2 text-xs text-gray-500">
                          Курсы: {courseNames.join(', ')}
                        </p>
                      )}
                      {memberNames.length > 0 && (
                        <p className="mt-1 text-xs text-gray-500">
                          Участники: {memberNames.join(', ')}
                          {group.memberIds.length > memberNames.length &&
                            ` и ещё ${group.memberIds.length - memberNames.length}…`}
                        </p>
                      )}
                    </div>
                    <span className="text-xl text-gray-400">→</span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <GroupEditorModal
        isOpen={isCreating || Boolean(editing)}
        onClose={() => {
          setIsCreating(false);
          setEditing(null);
        }}
        onSuccess={() => { /* useAllGroups onSnapshot подхватит автоматически */ }}
        group={editing}
      />
    </div>
  );
}
