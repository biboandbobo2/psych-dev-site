/** Вкладка «Пользователи»: фильтры, список и счётчик показанных. */
import { useMemo } from 'react';
import type { CourseOption } from '../../../../hooks/useCourses';
import type { Group } from '../../../../types/groups';
import { USER_GRID, filterAndSortUsers, type UserListFilters, type UserRowData } from '../utils';
import { UserFilters } from './UserFilters';
import { UserListRow } from './UserListRow';

const HEADERS = ['Пользователь', 'Роль', 'Доступ', 'Потоки', 'Последний вход'];

export function UsersTab({
  rows,
  filters,
  onFiltersChange,
  streams,
  courses,
  currentUid,
  onOpenUser,
}: {
  rows: UserRowData[];
  filters: UserListFilters;
  onFiltersChange: (next: UserListFilters) => void;
  streams: Group[];
  courses: CourseOption[];
  currentUid: string | undefined;
  onOpenUser: (uid: string) => void;
}) {
  const visible = useMemo(() => filterAndSortUsers(rows, filters), [rows, filters]);

  return (
    <div className="space-y-3">
      <UserFilters filters={filters} onChange={onFiltersChange} streams={streams} courses={courses} />

      <div className="flex flex-col gap-2.5 md:gap-0 md:overflow-hidden md:rounded-2xl md:border md:border-border md:bg-card">
        <div
          className={`hidden border-b border-border bg-card2 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.04em] text-ink-faint ${USER_GRID}`}
        >
          {HEADERS.map((header) => (
            <div key={header}>{header}</div>
          ))}
        </div>

        {visible.map((row) => (
          <UserListRow
            key={row.user.uid}
            row={row}
            isCurrent={row.user.uid === currentUid}
            onOpen={() => onOpenUser(row.user.uid)}
          />
        ))}

        {visible.length === 0 && (
          <p className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted md:rounded-none md:border-0">
            Никто не подошёл под фильтры.
          </p>
        )}
      </div>

      <p className="text-[13px] text-muted">
        Показано {visible.length} из {rows.length}
      </p>
    </div>
  );
}
