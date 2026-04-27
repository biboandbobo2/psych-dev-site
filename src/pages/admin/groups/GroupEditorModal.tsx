import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  addGroupMembersByEmail,
  createGroup,
  deleteGroup,
  setGroupFeaturedCourses,
  setGroupMembers,
  updateGroup,
} from '../../../lib/adminFunctions';
import { useCourses } from '../../../hooks/useCourses';
import { useAllUsers } from '../../../hooks/useAllUsers';
import type { Group } from '../../../types/groups';
import { debugError } from '../../../lib/debug';
import { AnnouncementAdminsField } from './groupEditor/AnnouncementAdminsField';
import { CourseChecklistField } from './groupEditor/CourseChecklistField';
import { MembersField } from './groupEditor/MembersField';
import {
  parseInviteEmails,
  toggleFeaturedCourse,
  toggleSet,
} from './groupEditor/helpers';

const MAX_FEATURED_COURSES = 3;

interface GroupEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  group: Group | null;
}

export function GroupEditorModal({ isOpen, onClose, onSuccess, group }: GroupEditorModalProps) {
  const isEdit = Boolean(group);
  const isSystem = Boolean(group?.isSystem);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [grantedCourses, setGrantedCourses] = useState<Set<string>>(() => new Set());
  const [memberIds, setMemberIds] = useState<Set<string>>(() => new Set());
  const [announcementAdminIds, setAnnouncementAdminIds] = useState<Set<string>>(() => new Set());
  const [featuredCourseIds, setFeaturedCourseIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteNotice, setInviteNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { courses, loading: coursesLoading } = useCourses({ includeUnpublished: true });
  const { users, loading: usersLoading } = useAllUsers();

  useEffect(() => {
    if (!isOpen) return;
    setName(group?.name ?? '');
    setDescription(group?.description ?? '');
    setGrantedCourses(new Set(group?.grantedCourses ?? []));
    setMemberIds(new Set(group?.memberIds ?? []));
    setAnnouncementAdminIds(new Set(group?.announcementAdminIds ?? []));
    setFeaturedCourseIds(
      Array.isArray(group?.featuredCourseIds)
        ? group!.featuredCourseIds!.slice(0, MAX_FEATURED_COURSES)
        : [],
    );
    setMemberSearch('');
    setInviteEmails('');
    setInviteNotice(null);
    setError(null);
  }, [isOpen, group]);

  const sortedCourses = useMemo(
    () => [...courses].sort((a, b) => a.name.localeCompare(b.name, 'ru')),
    [courses],
  );

  const adminUsers = useMemo(
    () => users.filter((u) => u.role === 'admin' || u.role === 'super-admin'),
    [users],
  );

  const filteredUsers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    const sorted = [...users].sort((a, b) =>
      (a.displayName ?? a.email ?? a.uid).localeCompare(b.displayName ?? b.email ?? b.uid, 'ru'),
    );
    if (!q) return sorted;
    return sorted.filter((u) => {
      const name = (u.displayName ?? '').toLowerCase();
      const email = (u.email ?? '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [users, memberSearch]);

  if (!isOpen) return null;

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('Укажите название группы.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let targetGroupId: string;
      if (isEdit && group) {
        await updateGroup({
          groupId: group.id,
          // Системные группы не переименовываются (серверный guard это подтвердит).
          ...(isSystem ? {} : { name }),
          description,
          grantedCourses: Array.from(grantedCourses),
          announcementAdminIds: Array.from(announcementAdminIds),
        });
        // Состав системной группы управляется автоматически onUserCreate,
        // ручной setGroupMembers для неё запрещён.
        if (!isSystem) {
          await setGroupMembers({ groupId: group.id, memberIds: Array.from(memberIds) });
        }
        targetGroupId = group.id;
      } else {
        const created = await createGroup({
          name,
          description: description || undefined,
          memberIds: Array.from(memberIds),
          grantedCourses: Array.from(grantedCourses),
          announcementAdminIds: Array.from(announcementAdminIds),
        });
        targetGroupId = created.groupId;
      }
      // featuredCourseIds сохраняются отдельным callable: используется
      // в обоих режимах, чтобы не путать схему updateGroup.
      await setGroupFeaturedCourses({
        groupId: targetGroupId,
        courseIds: featuredCourseIds,
      });
      onSuccess();
      onClose();
    } catch (err) {
      debugError('GroupEditorModal save failed', err);
      setError(err instanceof Error ? err.message : 'Не удалось сохранить группу.');
    } finally {
      setSaving(false);
    }
  };

  const handleInvite = async () => {
    if (!isEdit || !group) return;
    const emails = parseInviteEmails(inviteEmails);
    if (emails.length === 0) {
      setInviteNotice('Нет корректных email.');
      return;
    }
    setInviting(true);
    setInviteNotice(null);
    try {
      const res = await addGroupMembersByEmail({ groupId: group.id, emails });
      setMemberIds((prev) => {
        const next = new Set(prev);
        res.uids.forEach((uid) => next.add(uid));
        return next;
      });
      setInviteEmails('');
      setInviteNotice(
        `Добавлено: ${res.resolvedExisting} уже зарегистрированных, ${res.createdPending} приглашено заранее.`,
      );
    } catch (err) {
      debugError('addGroupMembersByEmail failed', err);
      setInviteNotice(err instanceof Error ? err.message : 'Не удалось пригласить.');
    } finally {
      setInviting(false);
    }
  };

  const handleDelete = async () => {
    if (!isEdit || !group) return;
    if (
      !window.confirm(
        `Удалить группу «${group.name}»? Доступ участников к курсам через эту группу будет снят.`,
      )
    ) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await deleteGroup(group.id);
      onSuccess();
      onClose();
    } catch (err) {
      debugError('GroupEditorModal delete failed', err);
      setError(err instanceof Error ? err.message : 'Не удалось удалить.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-gray-200 p-4">
          <h2 className="flex flex-wrap items-center gap-2 text-xl font-bold">
            {isEdit ? `Группа: ${group?.name}` : 'Новая группа'}
            {isSystem && (
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                Системная
              </span>
            )}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving || deleting}
            className="text-gray-400 transition hover:text-gray-600"
          >
            ✕
          </button>
        </header>

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Название
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Поток 2026, весна"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
              disabled={saving || isSystem}
            />
            {isSystem && (
              <p className="text-xs text-gray-500">
                Название системной группы изменить нельзя.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Описание
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Поясни для себя что это за группа. Для студентов не показывается."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={saving}
            />
          </div>

          <CourseChecklistField
            legend={`Курсы группы (${grantedCourses.size})`}
            courses={sortedCourses}
            loading={coursesLoading}
            isChecked={(id) => grantedCourses.has(id)}
            onToggle={(id) => setGrantedCourses((prev) => toggleSet(prev, id))}
            disabled={saving}
          />

          <CourseChecklistField
            legend={`Актуальные курсы (${featuredCourseIds.length}/${MAX_FEATURED_COURSES})`}
            description={
              <>
                Эти курсы будут показаны как актуальные у студентов группы. Если студент сам
                выбрал актуальные курсы в профиле — приоритет у его выбора.
              </>
            }
            courses={sortedCourses}
            loading={coursesLoading}
            isChecked={(id) => featuredCourseIds.includes(id)}
            onToggle={(id) =>
              setFeaturedCourseIds((prev) => toggleFeaturedCourse(prev, id, MAX_FEATURED_COURSES))
            }
            disabled={saving}
            maxSelected={MAX_FEATURED_COURSES}
            selectedCount={featuredCourseIds.length}
          />

          <AnnouncementAdminsField
            adminUsers={adminUsers}
            loading={usersLoading}
            selected={announcementAdminIds}
            onToggle={(uid) => setAnnouncementAdminIds((prev) => toggleSet(prev, uid))}
            disabled={saving}
          />

          <MembersField
            users={filteredUsers}
            usersLoading={usersLoading}
            memberIds={memberIds}
            onToggleMember={(uid) => setMemberIds((prev) => toggleSet(prev, uid))}
            memberSearch={memberSearch}
            onMemberSearchChange={setMemberSearch}
            inviteEnabled={isEdit && Boolean(group)}
            inviteEmails={inviteEmails}
            onInviteEmailsChange={setInviteEmails}
            inviting={inviting}
            inviteNotice={inviteNotice}
            onInvite={handleInvite}
            isSystem={isSystem}
            saving={saving}
          />

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </form>

        <footer className="flex items-center justify-between gap-3 border-t border-gray-200 p-4">
          {isEdit && !isSystem ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving || deleting}
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 transition hover:bg-red-100 disabled:opacity-50"
            >
              {deleting ? 'Удаляем…' : 'Удалить группу'}
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving || deleting}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm transition hover:bg-gray-50"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={(e) => handleSave(e as unknown as FormEvent<HTMLFormElement>)}
              disabled={saving || deleting || !name.trim()}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Сохраняем…' : isEdit ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
