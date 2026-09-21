/**
 * Чистые хелперы страницы /admin/users: сборка строки пользователя из
 * эффективного доступа, форматирование, фильтрация и сортировка списка,
 * разбор email для окна «Добавить». Всё без React — покрыто vitest.
 */
import type { UserRecord } from '../../../hooks/useAllUsers';
import type { Group } from '../../../types/groups';
import type { DisplayRole } from '../../../lib/roleHelpers';
import {
  buildGroupIndex,
  computeEffectiveAccessWithIndex,
  type EffectiveAccess,
} from '../../../lib/effectiveAccess';
import { isValidEmail, splitEmails } from '../../../lib/emailList';

/** Сетка колонок списка: общая для шапки таблицы и строк. */
export const USER_GRID =
  'md:grid md:grid-cols-[2.3fr_1.1fr_1.7fr_1.4fr_0.9fr] md:items-center md:gap-4';

/** Поток пользователя в списке: только несистемные группы. */
export interface UserStreamChip {
  id: string;
  name: string;
  /** uid в `announcementAdminIds` группы — в чипе приписка «куратор». */
  curator: boolean;
}

/** Строка списка: пользователь + посчитанный по группам эффективный доступ. */
export interface UserRowData {
  user: UserRecord;
  access: EffectiveAccess;
  displayRole: DisplayRole;
  streams: UserStreamChip[];
  lastLoginAt: Date | null;
  createdAt: Date | null;
  /** Имя + email в нижнем регистре: по нему ищет поиск. */
  searchKey: string;
}

/** Firestore Timestamp | Date | null → Date | null. */
export function toJsDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const candidate = value as { toDate?: () => Date };
  if (typeof candidate.toDate !== 'function') return null;
  try {
    const date = candidate.toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
  } catch {
    return null;
  }
}

/** Русские числительные: 1 курс / 2 курса / 5 курсов. */
export function plural(count: number, one: string, few: string, many: string): string {
  const mod100 = Math.abs(count) % 100;
  const mod10 = mod100 % 10;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

export const coursesLabel = (n: number) => `${n} ${plural(n, 'курс', 'курса', 'курсов')}`;

export function formatDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${date.getFullYear()}`;
}

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

/** «сегодня» / «вчера» / дата; `null` → «никогда» (а не «Недавно»). */
export function formatLastLogin(date: Date | null, now: Date = new Date()): string {
  if (!date) return 'никогда';
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (days === 0) return 'сегодня';
  if (days === 1) return 'вчера';
  return formatDate(date);
}

/** Имя для списка: пустое у приглашённых — это ожидаемое состояние. */
export function userDisplayName(user: UserRecord): string {
  const name = user.displayName?.trim();
  if (name) return name;
  return user.pendingRegistration ? 'Ожидает регистрации' : 'Без имени';
}

/** Инициалы для аватара-заглушки. */
export function userInitials(user: UserRecord): string {
  const name = user.displayName?.trim();
  if (name) {
    const parts = name.split(/\s+/).slice(0, 2);
    return parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
  }
  return (user.email?.[0] ?? '?').toUpperCase();
}

/** Стабильная пастельная подложка аватара: зависит только от uid. */
const AVATAR_TONES = [
  'bg-pastel-blue text-pastel-blue-deep',
  'bg-pastel-lilac text-ink',
  'bg-pastel-sage text-accent-deep',
  'bg-pastel-terracotta text-ink',
  'bg-pastel-cream text-ink',
  'bg-pastel-plain text-ink-faint',
] as const;

export function avatarToneClass(uid: string): string {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) hash = (hash * 31 + uid.charCodeAt(i)) % 997;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

/** Собирает строку списка: эффективный доступ + чипы потоков. */
export function buildUserRow(
  user: UserRecord,
  groupIndex: Map<string, Group[]>,
  courseIds: readonly string[]
): UserRowData {
  const access = computeEffectiveAccessWithIndex(
    { uid: user.uid, role: user.role ?? null, courseAccess: user.courseAccess },
    groupIndex,
    courseIds
  );
  const streams = (groupIndex.get(user.uid) ?? [])
    .filter((group) => group.isSystem !== true)
    .map((group) => ({
      id: group.id,
      name: group.name,
      curator: group.announcementAdminIds.includes(user.uid),
    }));
  return {
    user,
    access,
    displayRole: access.displayRole,
    streams,
    lastLoginAt: toJsDate(user.lastLoginAt),
    createdAt: toJsDate(user.createdAt),
    searchKey: `${user.displayName ?? ''} ${user.email ?? ''}`.toLowerCase(),
  };
}

export function buildUserRows(
  users: readonly UserRecord[],
  groups: readonly Group[],
  courseIds: readonly string[]
): UserRowData[] {
  const index = buildGroupIndex(groups);
  return users.map((user) => buildUserRow(user, index, courseIds));
}

/**
 * Источники доступа серой строкой: «Поток 1 · Все · 1 лично».
 * Если всё пришло только из системных групп — «только открытые всем».
 */
export function buildAccessSources(access: EffectiveAccess): string {
  const regular: string[] = [];
  const system: string[] = [];
  let personal = 0;
  for (const sources of Object.values(access.courses)) {
    if (sources.some((source) => source.kind === 'personal')) personal++;
    for (const source of sources) {
      if (source.kind !== 'group') continue;
      const bucket = source.isSystem ? system : regular;
      if (!bucket.includes(source.groupName)) bucket.push(source.groupName);
    }
  }
  if (regular.length === 0 && personal === 0) {
    return system.length > 0 ? 'только открытые всем' : '';
  }
  const parts = [...regular, ...system];
  if (personal > 0) parts.push(`${personal} лично`);
  return parts.join(' · ');
}

export interface AccessSummary {
  primary: string;
  secondary: string | null;
}

/** Колонка «Доступ»: жирная строка + серые источники. */
export function buildAccessSummary(row: UserRowData): AccessSummary {
  const pendingNote = row.user.pendingRegistration ? 'откроются при первом входе' : null;
  if (row.displayRole === 'super-admin') return { primary: 'Все курсы', secondary: null };

  const sources = buildAccessSources(row.access);
  const total = Object.keys(row.access.courses).length;

  if (row.displayRole === 'admin') {
    const editable = row.user.adminEditableCourses?.length ?? 0;
    const studies =
      total > 0 ? `учится на ${total} ${plural(total, 'курсе', 'курсах', 'курсах')}` : null;
    const secondary = [studies, studies ? sources : null].filter(Boolean).join(' · ');
    return { primary: `Редактирует ${coursesLabel(editable)}`, secondary: secondary || null };
  }

  if (total === 0) return { primary: 'Нет доступа', secondary: pendingNote };
  const secondary = [sources, pendingNote].filter(Boolean).join(' · ');
  return { primary: coursesLabel(total), secondary: secondary || null };
}

// === Фильтры списка ===

export type RoleFilter = 'all' | 'student' | 'admin' | 'guest';
export type UserSort = 'lastLogin' | 'name' | 'created';

export interface UserListFilters {
  search: string;
  role: RoleFilter;
  /** '' — любой поток. */
  groupId: string;
  /** '' — любой курс. */
  courseId: string;
  pendingOnly: boolean;
  sort: UserSort;
}

export const DEFAULT_USER_FILTERS: UserListFilters = {
  search: '',
  role: 'all',
  groupId: '',
  courseId: '',
  pendingOnly: false,
  sort: 'lastLogin',
};

function matchesCourse(row: UserRowData, courseId: string): boolean {
  if (row.displayRole === 'super-admin') return true;
  if (row.access.courses[courseId]) return true;
  return row.user.adminEditableCourses?.includes(courseId) === true;
}

function matchesRole(row: UserRowData, role: RoleFilter): boolean {
  if (role === 'all') return true;
  return row.displayRole === role;
}

export function filterUsers(
  rows: readonly UserRowData[],
  filters: UserListFilters
): UserRowData[] {
  const search = filters.search.trim().toLowerCase();
  return rows.filter((row) => {
    if (search && !row.searchKey.includes(search)) return false;
    if (!matchesRole(row, filters.role)) return false;
    if (filters.groupId && !row.access.groups.some((g) => g.id === filters.groupId)) return false;
    if (filters.courseId && !matchesCourse(row, filters.courseId)) return false;
    if (filters.pendingOnly && row.user.pendingRegistration !== true) return false;
    return true;
  });
}

const time = (date: Date | null) => (date ? date.getTime() : -Infinity);

export function sortUsers(rows: readonly UserRowData[], sort: UserSort): UserRowData[] {
  const next = [...rows];
  if (sort === 'name') {
    next.sort((a, b) =>
      userDisplayName(a.user).localeCompare(userDisplayName(b.user), 'ru', { numeric: true })
    );
  } else if (sort === 'created') {
    next.sort((a, b) => time(b.createdAt) - time(a.createdAt));
  } else {
    next.sort((a, b) => time(b.lastLoginAt) - time(a.lastLoginAt));
  }
  return next;
}

export function filterAndSortUsers(
  rows: readonly UserRowData[],
  filters: UserListFilters
): UserRowData[] {
  return sortUsers(filterUsers(rows, filters), filters.sort);
}

/** Сводка в подзаголовке: «N человек · X студентов · …». */
export function buildUsersSummary(rows: readonly UserRowData[]): string {
  const total = rows.length;
  const count = (role: DisplayRole) => rows.filter((row) => row.displayRole === role).length;
  const students = count('student');
  const admins = count('admin');
  const guests = count('guest');
  return [
    `${total} ${plural(total, 'человек', 'человека', 'человек')}`,
    `${students} ${plural(students, 'студент', 'студента', 'студентов')}`,
    `${admins} ${plural(admins, 'администратор', 'администратора', 'администраторов')} курса`,
    `${guests} ${plural(guests, 'гость', 'гостя', 'гостей')}`,
  ].join(' · ');
}

// === Разбор email ===

export interface ParsedEmails {
  emails: string[];
  invalid: string[];
}

/** Общий разбор списка (`splitEmails`) + разделение на валидные и мусор. */
export function parseEmailList(input: string): ParsedEmails {
  const emails: string[] = [];
  const invalid: string[] = [];
  for (const value of splitEmails(input)) {
    (isValidEmail(value) ? emails : invalid).push(value);
  }
  return { emails, invalid };
}
