import type { UserRole } from '../types/user';

export type DisplayRole = UserRole | 'student' | 'guest';

/**
 * Возвращает читаемое название роли (включая computed student/guest).
 */
export function getRoleLabel(role: DisplayRole): string {
  switch (role) {
    case 'super-admin':
      return 'Супер-админ';
    case 'admin':
      return 'Админ';
    case 'co-admin':
      return 'Со-админ';
    case 'student':
      return 'Студент';
    case 'guest':
      return 'Гость';
    default:
      return role;
  }
}

/**
 * CSS классы для бейджа роли.
 */
export function getRoleBadgeClasses(role: DisplayRole): string {
  switch (role) {
    case 'super-admin':
      return 'bg-purple-100 text-purple-800';
    case 'admin':
      return 'bg-blue-100 text-blue-800';
    case 'co-admin':
      return 'bg-indigo-100 text-indigo-800';
    case 'student':
      return 'bg-green-100 text-green-800';
    case 'guest':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Вычисляет "отображаемую роль" пользователя для админских списков/фильтров.
 * admin/super-admin/co-admin — из поля role. Остальные: student если у юзера
 * есть хоть один курс в courseAccess, иначе guest.
 */
export function computeDisplayRole(
  role: UserRole | null,
  courseAccess: Record<string, boolean | undefined> | null | undefined
): DisplayRole {
  if (role === 'admin' || role === 'super-admin' || role === 'co-admin') return role;
  const hasAnyCourse = courseAccess
    ? Object.values(courseAccess).some((v) => v === true)
    : false;
  return hasAnyCourse ? 'student' : 'guest';
}
