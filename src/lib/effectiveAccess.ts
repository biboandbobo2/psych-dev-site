import type { UserRole, CourseAccessMap } from '../types/user';
import type { Group } from '../types/groups';
import type { DisplayRole } from './roleHelpers';

/**
 * Минимальный набор полей пользователя, нужный для расчёта эффективного
 * доступа. Совместим с `UserRecord`, но не требует его целиком.
 */
export interface EffectiveAccessUser {
  uid: string;
  role: UserRole | null;
  courseAccess?: CourseAccessMap | null;
}

/** Откуда пришёл доступ к курсу: личный `courseAccess` или группа (поток). */
export type AccessSource =
  | { kind: 'personal' }
  | { kind: 'group'; groupId: string; groupName: string; isSystem: boolean };

export interface EffectiveAccess {
  /**
   * Курсы, к которым есть доступ хотя бы из одного источника. Ключи — только
   * из `courseIds`, если он непустой; иначе все курсы, встреченные в личном
   * `courseAccess` и в `grantedCourses` групп пользователя.
   */
  courses: Record<string, AccessSource[]>;
  /** Курсы из `courses` с personal-источником или несистемной группой. */
  paidCourseIds: string[];
  /** Курсы из `courses`, у которых ВСЕ источники — системные группы. */
  freeCourseIds: string[];
  /** Группы (включая системные), где пользователь состоит (`memberIds`). */
  groups: Array<{ id: string; name: string; isSystem: boolean }>;
  /**
   * 'super-admin' | 'admin' — по `user.role`. Иначе 'student', если есть хотя
   * бы один платный курс (см. paidCourseIds), иначе 'guest'.
   */
  displayRole: DisplayRole;
}

function isPaidSource(source: AccessSource): boolean {
  return source.kind === 'personal' || (source.kind === 'group' && !source.isSystem);
}

function buildEffectiveAccess(
  user: EffectiveAccessUser,
  memberGroups: readonly Group[],
  courseIds: readonly string[]
): EffectiveAccess {
  const courses: Record<string, AccessSource[]> = {};
  const addSource = (courseId: string, source: AccessSource): void => {
    const existing = courses[courseId];
    if (existing) existing.push(source);
    else courses[courseId] = [source];
  };

  if (user.courseAccess) {
    for (const [courseId, granted] of Object.entries(user.courseAccess)) {
      if (granted === true) addSource(courseId, { kind: 'personal' });
    }
  }

  for (const group of memberGroups) {
    for (const courseId of group.grantedCourses) {
      addSource(courseId, {
        kind: 'group',
        groupId: group.id,
        groupName: group.name,
        isSystem: group.isSystem === true,
      });
    }
  }

  const courseIdFilter = courseIds.length > 0 ? new Set(courseIds) : null;
  const filteredCourses = courseIdFilter
    ? Object.fromEntries(Object.entries(courses).filter(([courseId]) => courseIdFilter.has(courseId)))
    : courses;

  const paidCourseIds: string[] = [];
  const freeCourseIds: string[] = [];
  for (const [courseId, sources] of Object.entries(filteredCourses)) {
    if (sources.some(isPaidSource)) paidCourseIds.push(courseId);
    else freeCourseIds.push(courseId);
  }

  const groups = memberGroups.map((group) => ({
    id: group.id,
    name: group.name,
    isSystem: group.isSystem === true,
  }));

  const displayRole: DisplayRole =
    user.role === 'admin' || user.role === 'super-admin'
      ? user.role
      : paidCourseIds.length > 0
        ? 'student'
        : 'guest';

  return { courses: filteredCourses, paidCourseIds, freeCourseIds, groups, displayRole };
}

/**
 * Эффективный доступ пользователя = личный `courseAccess` ∪ группы, где он
 * состоит (`memberIds`). Для списков из многих пользователей используйте
 * `buildGroupIndex` + `computeEffectiveAccessWithIndex`, чтобы не перебирать
 * все группы на каждого пользователя.
 */
export function computeEffectiveAccess(
  user: EffectiveAccessUser,
  groups: readonly Group[],
  courseIds: readonly string[]
): EffectiveAccess {
  const memberGroups = groups.filter((group) => group.memberIds.includes(user.uid));
  return buildEffectiveAccess(user, memberGroups, courseIds);
}

/** Индекс uid → группы, где он состоит. Строится один раз на список групп. */
export function buildGroupIndex(groups: readonly Group[]): Map<string, Group[]> {
  const index = new Map<string, Group[]>();
  for (const group of groups) {
    for (const uid of group.memberIds) {
      const existing = index.get(uid);
      if (existing) existing.push(group);
      else index.set(uid, [group]);
    }
  }
  return index;
}

/** То же, что `computeEffectiveAccess`, но с предпостроенным `buildGroupIndex`. */
export function computeEffectiveAccessWithIndex(
  user: EffectiveAccessUser,
  groupIndex: Map<string, Group[]>,
  courseIds: readonly string[]
): EffectiveAccess {
  const memberGroups = groupIndex.get(user.uid) ?? [];
  return buildEffectiveAccess(user, memberGroups, courseIds);
}
