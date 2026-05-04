import type { Timestamp } from 'firebase/firestore';
import type { CoreCourseType, CourseType } from './tests';
import { CORE_COURSE_ORDER, CORE_COURSE_META } from '../constants/courses';

/**
 * Роль администратора.
 * Обычные пользователи (студенты, гости) не имеют этого поля — их статус
 * вычисляется из courseAccess через computeGuestStatus (см. useGuestStatus.ts).
 *
 * - admin: редактор контента; может редактировать только курсы из adminEditableCourses
 * - super-admin: владелец проекта; без ограничений
 *
 * Со-админ страниц DOM Academy — параллельный, независимый флаг
 * `users/{uid}.coAdmin: boolean` + custom claim `coAdmin: true`. Не значение role.
 * Может выдаваться поверх любой роли (admin, обычный пользователь).
 */
export type UserRole = 'admin' | 'super-admin';

/**
 * Нормализует значение role из Firestore в строгий UserRole | null.
 * Legacy-значения 'guest'/'student' считаются null (обычный пользователь).
 */
export function normalizeUserRole(raw: unknown): UserRole | null {
  if (raw === 'admin' || raw === 'super-admin') return raw;
  return null;
}

/**
 * Карта доступа к курсам.
 *
 * Логика:
 * - admin/super-admin → всегда полный доступ
 * - обычный пользователь (role === null) → доступ только к явно true
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
 * Пользовательские настройки (хранятся в users/{uid}.prefs).
 * Все поля опциональные — отсутствие = поведение по умолчанию.
 */
export interface UserPreferences {
  /**
   * Получать ли email-подтверждения о бронировании кабинетов в DOM.
   * undefined / true → отправляем (alteg.io notify_by_email).
   * false → пропускаем рассылку.
   */
  emailBookingConfirmations?: boolean;
}

/**
 * Запись пользователя в Firestore (коллекция users)
 */
export interface UserRecord {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  /** Роль администратора. Null/undefined для обычных пользователей. */
  role: UserRole | null;
  /**
   * Для role='admin': список courseId, которые этот админ может РЕДАКТИРОВАТЬ.
   * Просмотр админ-UI доступен для всех курсов. Пустой массив = view-only.
   * Для super-admin игнорируется (всегда может всё).
   */
  adminEditableCourses?: string[];
  /** Гранулярный доступ к курсам */
  courseAccess?: CourseAccessMap;
  /**
   * Курсы, которые сам пользователь выбрал как «актуальные» для себя.
   * Если непустой — имеет приоритет над featuredCourseIds группы при
   * формировании continue-cards на /home. Максимум 3 элемента.
   */
  featuredCourseIds?: string[];
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
  /** Пользовательские настройки (notification preferences и т.п.). */
  prefs?: UserPreferences;
}

/**
 * Параметры для обновления доступа к курсам
 */
export interface UpdateCourseAccessParams {
  targetUid: string;
  courseAccess: CourseAccessMap;
}

/**
 * Проверяет, есть ли у пользователя доступ к видео-контенту курса.
 *
 * @param role - роль администратора (null для обычного пользователя)
 * @param courseAccess - карта доступа к курсам
 * @param courseType - тип курса для проверки
 * @returns true если доступ разрешён
 */
export function hasCourseAccess(
  role: UserRole | null,
  courseAccess: CourseAccessMap | null | undefined,
  courseType: CourseType
): boolean {
  if (role === 'admin' || role === 'super-admin') return true;
  return courseAccess?.[courseType] === true;
}

/**
 * Может ли пользователь редактировать контент указанного курса.
 * super-admin — всегда; admin — только если courseId в adminEditableCourses.
 */
export function canEditCourse(
  role: UserRole | null,
  adminEditableCourses: string[] | null | undefined,
  courseId: string
): boolean {
  if (role === 'super-admin') return true;
  if (role !== 'admin') return false;
  return Array.isArray(adminEditableCourses) && adminEditableCourses.includes(courseId);
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
