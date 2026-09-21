/**
 * Вкладка «Потоки»: карточки групп вместо прежнего списка /admin/groups.
 * Клик по карточке открывает GroupEditorModal, ссылка в подвале ведёт
 * к участникам потока в списке пользователей (`?tab=users&stream=`).
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { UserRecord } from '../../../../hooks/useAllUsers';
import type { CourseOption } from '../../../../hooks/useCourses';
import type { Group } from '../../../../types/groups';
import { GroupEditorModal } from '../../groups/GroupEditorModal';
import { plural } from '../utils';
import { UserAvatar } from './UserIdentity';
import { CheckIcon } from './icons';

const CHIP = 'inline-flex rounded-lg px-2.5 py-1 text-xs';
const STATUS = 'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold';

function calendarStatus(group: Group) {
  if (!group.gcalId) return { label: 'без календаря', synced: false };
  return {
    label: group.gcalSyncState?.lastSyncedAt ? 'календарь синхронизирован' : 'календарь подключён',
    synced: Boolean(group.gcalSyncState?.lastSyncedAt),
  };
}

function StreamCard({
  group,
  users,
  courses,
  onEdit,
}: {
  group: Group;
  users: Map<string, UserRecord>;
  courses: Map<string, CourseOption>;
  onEdit: () => void;
}) {
  const isSystem = group.isSystem === true;
  const featured = group.featuredCourseIds ?? [];
  const pending = group.memberIds.filter((uid) => users.get(uid)?.pendingRegistration).length;
  const curators = group.announcementAdminIds
    .map((uid) => users.get(uid))
    .filter((user): user is UserRecord => Boolean(user));
  const status = calendarStatus(group);

  const stats = isSystem
    ? `системный поток · каждый зарегистрированный · ${group.grantedCourses.length} ${plural(group.grantedCourses.length, 'курс открыт', 'курса открыты', 'курсов открыты')} всем`
    : [
        `${group.memberIds.length} ${plural(group.memberIds.length, 'студент', 'студента', 'студентов')}${pending > 0 ? `, ${pending} ждут регистрации` : ''}`,
        `${group.grantedCourses.length} ${plural(group.grantedCourses.length, 'курс', 'курса', 'курсов')}`,
        featured.length > 0
          ? `${featured.length} ${plural(featured.length, 'актуальный', 'актуальных', 'актуальных')}`
          : null,
      ]
        .filter(Boolean)
        .join(' · ');

  return (
    <div
      className={`flex flex-col gap-3.5 rounded-2xl border p-5 ${
        isSystem ? 'border-dashed border-border-cool bg-card2' : 'border-border bg-card'
      }`}
    >
      <button type="button" onClick={onEdit} className="flex flex-col gap-3.5 text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="text-lg font-bold text-fg">{group.name}</h2>
            <span className="text-[13px] text-muted">{stats}</span>
          </div>
          <span
            className={`${STATUS} ${
              isSystem
                ? 'bg-pastel-plain text-ink-faint'
                : status.synced
                  ? 'bg-accent-100 text-accent'
                  : 'bg-pastel-plain text-ink-faint'
            }`}
          >
            {status.synced && !isSystem && <CheckIcon />}
            {isSystem ? 'новости платформы' : status.label}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {group.grantedCourses.map((courseId) => {
            const name = courses.get(courseId)?.name ?? courseId;
            const isFeatured = featured.includes(courseId);
            return (
              <span
                key={courseId}
                className={`${CHIP} ${isFeatured ? 'bg-mark text-ink' : 'bg-pastel-plain text-ink-soft'}`}
              >
                {isFeatured ? `${name} · актуальный` : name}
              </span>
            );
          })}
          {group.grantedCourses.length === 0 && (
            <span className="text-xs text-muted">курсы не открыты</span>
          )}
        </div>
      </button>

      <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-3">
        {isSystem ? (
          <span className="text-[13px] text-muted">состав не редактируется</span>
        ) : curators.length > 0 ? (
          <span className="flex items-center gap-2">
            <span className="flex -space-x-2">
              {curators.slice(0, 3).map((user) => (
                <UserAvatar key={user.uid} user={user} size="sm" />
              ))}
            </span>
            <span className="text-[13px] text-muted">
              {plural(curators.length, 'куратор', 'кураторы', 'кураторы')}
            </span>
          </span>
        ) : (
          <span className="text-[13px] text-muted">без кураторов</span>
        )}

        <Link
          to={`/admin/users?tab=users&stream=${group.id}`}
          className="text-[13px] font-semibold text-accent hover:underline"
        >
          Участники
        </Link>
      </div>
    </div>
  );
}

export function StreamsTab({
  groups,
  users,
  courses,
  creating,
  onCreatingChange,
}: {
  groups: Group[];
  users: UserRecord[];
  courses: CourseOption[];
  creating: boolean;
  onCreatingChange: (value: boolean) => void;
}) {
  const [editing, setEditing] = useState<Group | null>(null);
  const userByUid = new Map(users.map((user) => [user.uid, user]));
  const courseById = new Map(courses.map((course) => [course.id, course]));

  return (
    <div className="space-y-4">
      {groups.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted">
          Потоков пока нет. «Создать поток» соберёт студентов вместе: общие курсы, объявления,
          календарь.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {groups.map((group) => (
            <StreamCard
              key={group.id}
              group={group}
              users={userByUid}
              courses={courseById}
              onEdit={() => setEditing(group)}
            />
          ))}
        </div>
      )}

      <GroupEditorModal
        isOpen={creating || Boolean(editing)}
        onClose={() => {
          onCreatingChange(false);
          setEditing(null);
        }}
        onSuccess={() => {
          /* useAllGroups onSnapshot подхватит автоматически */
        }}
        group={editing}
      />
    </div>
  );
}
