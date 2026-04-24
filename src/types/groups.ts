import type { Timestamp } from 'firebase/firestore';

/**
 * Группа студентов (поток), проходящих обучение вместе.
 *
 * - memberIds: uid участников (Firestore `array-contains` для клиентских запросов).
 * - grantedCourses: courseId, которые открываются всем участникам. Эффективный
 *   доступ пользователя = union(user.courseAccess, ∪ groups.grantedCourses
 *   для групп где он участник).
 * - announcementAdminIds: uid администраторов, которым разрешено создавать
 *   объявления/события для ЭТОЙ группы. Супер-админ пишет любым группам
 *   независимо от этого поля.
 */
/**
 * Состояние инкрементального импорта из Google Calendar.
 * syncToken обновляется после каждого успешного прохода; если Google вернёт
 * 410 Gone, токен очищается и следующий проход делает full-sync.
 */
export interface GroupGcalSyncState {
  syncToken?: string;
  lastSyncedAt?: Timestamp | null;
  lastError?: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  memberIds: string[];
  grantedCourses: string[];
  announcementAdminIds: string[];
  /**
   * Системная группа (напр. broadcast «Все»). Защищена от удаления,
   * переименования и ручного изменения состава через админку.
   */
  isSystem?: boolean;
  /** ID Google Calendar для двусторонней синхронизации событий группы. */
  gcalId?: string | null;
  gcalSyncState?: GroupGcalSyncState;
  createdAt?: Timestamp | null;
  createdBy?: string;
  updatedAt?: Timestamp | null;
  updatedBy?: string;
}

export interface GroupCreateInput {
  name: string;
  description?: string;
  memberIds?: string[];
  grantedCourses?: string[];
  announcementAdminIds?: string[];
  gcalId?: string | null;
}

export interface GroupUpdateInput {
  groupId: string;
  name?: string;
  description?: string;
  grantedCourses?: string[];
  announcementAdminIds?: string[];
  gcalId?: string | null;
}

/**
 * Собирает union всех grantedCourses из списка групп в boolean-карту,
 * совместимую с CourseAccessMap.
 */
export function combineGroupGrantedCourses(groups: Group[]): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const group of groups) {
    for (const courseId of group.grantedCourses) {
      result[courseId] = true;
    }
  }
  return result;
}

/**
 * Может ли пользователь писать объявления для указанной группы.
 * super-admin — всегда; обычный admin — только если его uid в announcementAdminIds.
 */
export function canWriteAnnouncementsForGroup(
  role: 'admin' | 'super-admin' | null,
  uid: string | null,
  group: Group
): boolean {
  if (role === 'super-admin') return true;
  if (role !== 'admin' || !uid) return false;
  return group.announcementAdminIds.includes(uid);
}

/**
 * Есть ли у пользователя право писать объявления хотя бы одной группе
 * (используется для активации кнопки «Кабинет объявлений»).
 */
export function hasAnyAnnouncementRight(
  role: 'admin' | 'super-admin' | null,
  uid: string | null,
  groups: Group[]
): boolean {
  if (role === 'super-admin') return true;
  if (role !== 'admin' || !uid) return false;
  return groups.some((group) => group.announcementAdminIds.includes(uid));
}
