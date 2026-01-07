import type { Timestamp } from 'firebase/firestore';
import type { CourseType } from './tests';

/**
 * Роль пользователя в системе
 * - guest: новый пользователь, без доступа к видео
 * - student: оплаченный доступ к видео (либо выданный админом)
 * - admin: редактор контента
 * - super-admin: владелец проекта
 */
export type UserRole = 'guest' | 'student' | 'admin' | 'super-admin';

/**
 * Карта доступа к курсам
 * Используется для гранулярного контроля доступа к видео-контенту
 *
 * Логика:
 * - Если role === 'student', 'admin' или 'super-admin' → полный доступ ко всем курсам
 * - Если role === 'guest' → проверяется courseAccess[courseType]
 */
export interface CourseAccessMap {
  /** Психология развития (возрастная психология) */
  development?: boolean;
  /** Клиническая психология */
  clinical?: boolean;
  /** Общая психология */
  general?: boolean;
}

/**
 * Запись пользователя в Firestore (коллекция users)
 */
export interface UserRecord {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  /** Гранулярный доступ к курсам (для guest) */
  courseAccess?: CourseAccessMap;
  createdAt: Timestamp | null;
  lastLoginAt: Timestamp | null;
  /** Когда был повышен в роли */
  promotedAt?: Timestamp;
  /** Кем был повышен */
  promotedBy?: string;
  /** Когда был понижен */
  demotedAt?: Timestamp;
  /** Кем был понижен */
  demotedBy?: string;
}

/**
 * Параметры для обновления доступа к курсам
 */
export interface UpdateCourseAccessParams {
  targetUid: string;
  courseAccess: CourseAccessMap;
}

/**
 * Проверяет, есть ли у пользователя доступ к видео-контенту курса
 *
 * @param role - роль пользователя
 * @param courseAccess - карта доступа к курсам
 * @param courseType - тип курса для проверки
 * @returns true если доступ разрешён
 */
export function hasCourseAccess(
  role: UserRole | null,
  courseAccess: CourseAccessMap | null | undefined,
  courseType: CourseType
): boolean {
  // Неавторизованные пользователи не имеют доступа
  if (!role) return false;

  // student, admin и super-admin имеют полный доступ
  if (role === 'student' || role === 'admin' || role === 'super-admin') {
    return true;
  }

  // guest проверяется по courseAccess
  if (role === 'guest') {
    return courseAccess?.[courseType] === true;
  }

  return false;
}

/**
 * Названия курсов для UI
 */
export const COURSE_LABELS: Record<CourseType, string> = {
  development: 'Психология развития',
  clinical: 'Клиническая психология',
  general: 'Общая психология',
};

/**
 * Все типы курсов в порядке отображения
 */
export const ALL_COURSE_TYPES: CourseType[] = ['development', 'clinical', 'general'];
