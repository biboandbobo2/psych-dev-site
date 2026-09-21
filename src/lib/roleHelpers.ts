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
      return 'Администратор курса';
    case 'student':
      return 'Студент';
    case 'guest':
      return 'Гость';
    default:
      return role;
  }
}

/**
 * CSS классы для бейджа роли (токены палитры сайта, см. theme.css).
 */
export function getRoleBadgeClasses(role: DisplayRole): string {
  switch (role) {
    case 'super-admin':
      return 'bg-pastel-lilac text-ink';
    case 'admin':
      return 'bg-pastel-blue text-pastel-blue-deep';
    case 'student':
      return 'bg-accent-100 text-accent';
    case 'guest':
      return 'bg-pastel-plain text-ink-faint';
    default:
      return 'bg-pastel-plain text-ink-faint';
  }
}

/**
 * Вычисляет "отображаемую роль" пользователя для админских списков/фильтров.
 * admin/super-admin — из поля role. Остальные: student если у юзера есть
 * хоть один курс в courseAccess, иначе guest. Флаг co-admin показывается
 * отдельным бейджем поверх основной роли (см. UserRow.tsx).
 *
 * ВАЖНО: учитывает только личный `courseAccess`, доступ через группы
 * (`groups/{id}.grantedCourses`) не видит. Для админки, где нужен полный
 * эффективный доступ (личный ∪ группы), используйте
 * `computeEffectiveAccess`/`computeEffectiveAccessWithIndex` из
 * `src/lib/effectiveAccess.ts`.
 */
export function computeDisplayRole(
  role: UserRole | null,
  courseAccess: Record<string, boolean | undefined> | null | undefined
): DisplayRole {
  if (role === 'admin' || role === 'super-admin') return role;
  const hasAnyCourse = courseAccess
    ? Object.values(courseAccess).some((v) => v === true)
    : false;
  return hasAnyCourse ? 'student' : 'guest';
}
