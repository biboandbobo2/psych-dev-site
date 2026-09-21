/**
 * Панель фильтров списка. До `md` — поиск отдельной строкой и один ряд
 * контролов с горизонтальной прокруткой (без дублей разметки).
 */
import type { CourseOption } from '../../../../hooks/useCourses';
import type { Group } from '../../../../types/groups';
import type { RoleFilter, UserListFilters, UserSort } from '../utils';
import { SearchIcon } from './icons';

const FIELD =
  'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-sm text-fg';
const SELECT = 'border-0 bg-transparent text-sm font-semibold text-fg focus:outline-none';

export function UserFilters({
  filters,
  onChange,
  streams,
  courses,
}: {
  filters: UserListFilters;
  onChange: (next: UserListFilters) => void;
  streams: Group[];
  courses: CourseOption[];
}) {
  const patch = (part: Partial<UserListFilters>) => onChange({ ...filters, ...part });

  return (
    <div className="flex flex-col gap-2.5 md:flex-row md:flex-wrap md:items-center">
      <label className="relative flex items-center md:w-72">
        <span className="pointer-events-none absolute left-3 text-muted">
          <SearchIcon />
        </span>
        <input
          type="search"
          value={filters.search}
          onChange={(event) => patch({ search: event.target.value })}
          placeholder="Имя или email"
          aria-label="Поиск по имени или email"
          className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none"
        />
      </label>

      {/* До md — один ряд с горизонтальной прокруткой; на десктопе обёртка
          схлопывается (md:contents) и контролы встают в общий ряд с поиском. */}
      <div className="-mx-4 flex items-center gap-2.5 overflow-x-auto px-4 pb-1 md:contents">
        <label className={FIELD}>
          <span className="text-muted">Роль</span>
          <select
            aria-label="Фильтр по роли"
            className={SELECT}
            value={filters.role}
            onChange={(event) => patch({ role: event.target.value as RoleFilter })}
          >
            <option value="all">все</option>
            <option value="student">студенты</option>
            <option value="admin">администраторы курса</option>
            <option value="guest">гости</option>
          </select>
        </label>

        <label className={FIELD}>
          <span className="text-muted">Поток</span>
          <select
            aria-label="Фильтр по потоку"
            className={SELECT}
            value={filters.groupId}
            onChange={(event) => patch({ groupId: event.target.value })}
          >
            <option value="">любой</option>
            {streams.map((stream) => (
              <option key={stream.id} value={stream.id}>
                {stream.name}
              </option>
            ))}
          </select>
        </label>

        <label className={FIELD}>
          <span className="text-muted">Курс</span>
          <select
            aria-label="Фильтр по курсу"
            className={SELECT}
            value={filters.courseId}
            onChange={(event) => patch({ courseId: event.target.value })}
          >
            <option value="">любой</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
        </label>

        <label className={`${FIELD} gap-2`}>
          <input
            type="checkbox"
            checked={filters.pendingOnly}
            onChange={(event) => patch({ pendingOnly: event.target.checked })}
            className="h-4 w-4 accent-accent"
          />
          Ожидают регистрации
        </label>

        <label className="inline-flex h-10 shrink-0 items-center gap-1.5 text-sm text-muted md:ml-auto">
          Сортировка
          <select
            aria-label="Сортировка"
            className={SELECT}
            value={filters.sort}
            onChange={(event) => patch({ sort: event.target.value as UserSort })}
          >
            <option value="lastLogin">последний вход</option>
            <option value="name">имя</option>
            <option value="created">регистрация</option>
          </select>
        </label>
      </div>
    </div>
  );
}
