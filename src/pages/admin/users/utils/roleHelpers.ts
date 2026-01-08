import type { UserRole } from '../../../../types/user';

/**
 * Возвращает читаемое название роли
 */
export function getRoleLabel(role: UserRole): string {
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
export function getRoleBadgeClasses(role: UserRole): string {
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

/**
 * Проверяет, является ли роль административной (admin или super-admin)
 */
export function isAdminRole(role: UserRole): boolean {
  return role === 'admin' || role === 'super-admin';
}

/**
 * Проверяет, можно ли редактировать доступ к курсам для данной роли
 */
export function canEditCourseAccess(role: UserRole): boolean {
  return role === 'student' || role === 'guest';
}
