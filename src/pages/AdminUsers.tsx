/**
 * «Пользователи и потоки» — единственный экран управления людьми.
 * Две вкладки (`?tab=users|streams`), фильтр по потоку в `?stream=`,
 * открытая карточка — в `?user=`, поэтому на любое состояние есть ссылка.
 */
import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import { useAllUsers } from '../hooks/useAllUsers';
import { useAllGroups } from '../hooks/useAllGroups';
import { useCourses } from '../hooks/useCourses';
import { useAuth } from '../auth/AuthProvider';
import { AccessRequestsPanel } from '../components/accessRequests';
import { SITE_NAME } from '../routes';
import {
  DEFAULT_USER_FILTERS,
  InviteModal,
  PlusIcon,
  StreamsTab,
  UserDrawer,
  UsersTab,
  buildUserRows,
  buildUsersSummary,
  plural,
  type UserListFilters,
} from './admin/users';

const TAB_CLASS =
  'inline-flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-[15px] transition -mb-px';

export default function AdminUsers() {
  const { users, loading, error } = useAllUsers();
  const { groups } = useAllGroups();
  const { courses } = useCourses({ includeUnpublished: true });
  const { user: currentUser, isSuperAdmin } = useAuth();
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState<UserListFilters>(DEFAULT_USER_FILTERS);
  const [inviting, setInviting] = useState(false);
  const [creatingStream, setCreatingStream] = useState(false);

  const tab = params.get('tab') === 'streams' ? 'streams' : 'users';
  const streamFilter = params.get('stream') ?? '';
  const selectedUid = params.get('user');

  const streams = useMemo(() => groups.filter((group) => group.isSystem !== true), [groups]);
  const sortedCourses = useMemo(
    () => [...courses].sort((a, b) => a.name.localeCompare(b.name, 'ru')),
    [courses]
  );
  const courseIds = useMemo(() => courses.map((course) => course.id), [courses]);
  const rows = useMemo(() => buildUserRows(users, groups, courseIds), [users, groups, courseIds]);
  const selectedRow = rows.find((row) => row.user.uid === selectedUid);

  const updateParams = (patch: Record<string, string | null>) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(patch)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        return next;
      },
      { replace: true }
    );
  };

  // groupId живёт в query (на него ведут карточки потоков), остальные
  // фильтры — локальное состояние.
  const activeFilters: UserListFilters = { ...filters, groupId: streamFilter };
  const handleFiltersChange = (next: UserListFilters) => {
    if (next.groupId !== streamFilter) updateParams({ stream: next.groupId || null });
    setFilters({ ...next, groupId: '' });
  };

  const actionLabel = tab === 'streams' ? 'Создать поток' : 'Добавить';
  const subtitle =
    tab === 'streams'
      ? `${streams.length} ${plural(streams.length, 'поток', 'потока', 'потоков')} · курсы выдаются потоку, личный доступ для исключений`
      : buildUsersSummary(rows);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 md:px-8 md:py-10">
      <Helmet>
        <title>Пользователи — {SITE_NAME}</title>
      </Helmet>

      <header className="flex items-end justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-fg md:text-3xl">Пользователи</h1>
          <p className="text-sm text-muted">{subtitle}</p>
        </div>
        <button
          type="button"
          aria-label={actionLabel}
          onClick={() => (tab === 'streams' ? setCreatingStream(true) : setInviting(true))}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-accent px-3 text-[15px] font-semibold text-white transition hover:opacity-90 sm:px-4"
        >
          <PlusIcon />
          <span className="hidden sm:inline">{actionLabel}</span>
        </button>
      </header>

      <nav className="flex gap-1 border-b border-border">
        <button
          type="button"
          onClick={() => updateParams({ tab: null })}
          className={`${TAB_CLASS} ${
            tab === 'users' ? 'border-accent font-semibold text-fg' : 'border-transparent text-muted'
          }`}
        >
          Пользователи
        </button>
        <button
          type="button"
          onClick={() => updateParams({ tab: 'streams', user: null })}
          className={`${TAB_CLASS} ${
            tab === 'streams'
              ? 'border-accent font-semibold text-fg'
              : 'border-transparent text-muted'
          }`}
        >
          Потоки
          <span className="inline-flex rounded-full bg-pastel-plain px-2 py-px text-xs font-semibold text-ink-faint">
            {streams.length}
          </span>
        </button>
      </nav>

      {error ? (
        <p className="rounded-2xl border border-pastel-terracotta bg-card p-6 text-sm text-ink">
          Не удалось загрузить пользователей: {error}
        </p>
      ) : loading ? (
        <p className="p-6 text-sm text-muted">Загружаем пользователей…</p>
      ) : tab === 'streams' ? (
        <StreamsTab
          groups={groups}
          users={users}
          courses={sortedCourses}
          creating={creatingStream}
          onCreatingChange={setCreatingStream}
        />
      ) : (
        <>
          {/* Заявки на доступ с /home (AC-2): все новые — их закрывает
              супер-админ или со-админ, список людей обновится сам. */}
          <AccessRequestsPanel />
          <UsersTab
            rows={rows}
            filters={activeFilters}
            onFiltersChange={handleFiltersChange}
            streams={streams}
            courses={sortedCourses}
            currentUid={currentUser?.uid}
            onOpenUser={(uid) => updateParams({ user: uid })}
          />
        </>
      )}

      {selectedRow && (
        <UserDrawer
          row={selectedRow}
          courses={sortedCourses}
          groups={groups}
          isSuperAdmin={isSuperAdmin}
          currentUid={currentUser?.uid}
          onClose={() => updateParams({ user: null })}
        />
      )}

      {inviting && (
        <InviteModal
          streams={streams}
          courses={sortedCourses}
          isSuperAdmin={isSuperAdmin}
          onClose={() => setInviting(false)}
        />
      )}
    </div>
  );
}
