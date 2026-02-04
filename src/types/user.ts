import type { Timestamp } from 'firebase/firestore';
import type { CoreCourseType, CourseType } from './tests';
import { CORE_COURSE_ORDER, CORE_COURSE_META } from '../constants/courses';

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
 * - admin/super-admin → всегда полный доступ
 * - student → если courseAccess не задан (legacy) — полный доступ, иначе доступ только к явно true
 * - guest → проверяется courseAccess (нужен явный true для доступа)
 */
export interface CourseAccessMap {
  [courseId: string]: boolean | undefined;
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

  // admin и super-admin всегда имеют полный доступ
  if (role === 'admin' || role === 'super-admin') {
    return true;
  }

  // student:
  // - нет courseAccess (legacy аккаунты) -> полный доступ
  // - есть courseAccess -> доступ только к явно разрешённым курсам
  if (role === 'student') {
    if (!courseAccess) return true;
    if (Object.keys(courseAccess).length === 0) return true;
    return courseAccess[courseType] === true;
  }

  // guest: нужен явный true для доступа
  if (role === 'guest') {
    return courseAccess?.[courseType] === true;
  }

  return false;
}

/**
 * Названия курсов для UI
 */
export const COURSE_LABELS: Record<CoreCourseType, string> = {
  development: CORE_COURSE_META.development.name,
  clinical: CORE_COURSE_META.clinical.name,
  general: CORE_COURSE_META.general.name,
};

/**
 * Все типы курсов в порядке отображения
 */
export const ALL_COURSE_TYPES: CoreCourseType[] = CORE_COURSE_ORDER;

/**
 * Подсчитывает количество доступных курсов для пользователя
 *
 * @param role - роль пользователя
 * @param courseAccess - карта доступа к курсам
 * @returns количество доступных курсов
 */
export function countAccessibleCourses(
  role: UserRole | null,
  courseAccess: CourseAccessMap | null | undefined,
  courseTypes: ReadonlyArray<CourseType> = ALL_COURSE_TYPES
): number {
  return courseTypes.filter((courseType) =>
    hasCourseAccess(role, courseAccess, courseType)
  ).length;
}
