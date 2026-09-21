/**
 * Карточка пользователя — drawer справа (на телефоне во весь экран).
 * Закрывается крестиком, Esc и кликом по подложке; uid открытой карточки
 * живёт в query `?user=`, поэтому ссылка на карточку рабочая.
 */
import { useEffect, useState } from 'react';
import type { CourseOption } from '../../../../hooks/useCourses';
import type { Group } from '../../../../types/groups';
import { toggleUserDisabled } from '../../../../lib/adminFunctions';
import { reportAppError } from '../../../../lib/errorHandler';
import { AddAdminModal } from '../../../../components/AddAdminModal';
import { EditAdminPermissionsModal } from '../../../../components/EditAdminPermissionsModal';
import { formatDate, formatLastLogin, userDisplayName, type UserRowData } from '../utils';
import { UserAvatar, UserBadges } from './UserIdentity';
import { CloseIcon } from './icons';
import { ConfirmAction } from './drawer/controls';
import { CourseAccessSection } from './drawer/CourseAccessSection';
import { StreamsSection } from './drawer/StreamsSection';
import { PermissionsSection } from './drawer/PermissionsSection';

export function UserDrawer({
  row,
  courses,
  groups,
  isSuperAdmin,
  currentUid,
  onClose,
}: {
  row: UserRowData;
  courses: CourseOption[];
  groups: Group[];
  isSuperAdmin: boolean;
  currentUid: string | undefined;
  onClose: () => void;
}) {
  const [editingAdmin, setEditingAdmin] = useState(false);
  const [assigningAdmin, setAssigningAdmin] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const { user } = row;
  const isSelf = user.uid === currentUid;
  const disabled = user.disabled === true;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleToggleDisabled = async () => {
    try {
      await toggleUserDisabled({ targetUid: user.uid, disabled: !disabled });
      setNotice(disabled ? 'Пользователь включён' : 'Пользователь отключён');
    } catch (error) {
      reportAppError({ message: 'Не удалось изменить статус пользователя', error, context: 'admin-users' });
    }
  };

  const since = row.createdAt ? `с нами с ${formatDate(row.createdAt)} · ` : '';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Закрыть карточку"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/30"
      />

      <aside className="relative flex h-full w-full flex-col bg-card shadow-brand md:w-[520px] md:border-l md:border-border">
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-5 md:px-7">
          <div className="flex min-w-0 items-center gap-3.5">
            <UserAvatar user={user} size="lg" />
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-fg">{userDisplayName(user)}</h2>
                <UserBadges row={row} />
              </div>
              <span className="truncate text-sm text-ink-soft">{user.email}</span>
              <span className="text-[13px] text-muted">
                {since}последний вход {formatLastLogin(row.lastLoginAt)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-card2 hover:text-fg"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 md:px-7">
          <CourseAccessSection row={row} courses={courses} canEdit={!isSelf} />
          <StreamsSection row={row} groups={groups} />
          <PermissionsSection
            row={row}
            courses={courses}
            isSuperAdmin={isSuperAdmin}
            onEditAdminCourses={() => setEditingAdmin(true)}
            onAssignAdmin={() => setAssigningAdmin(true)}
          />
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-border bg-card2 px-5 py-3.5 md:px-7">
          <span className="text-xs text-muted">{notice ?? 'Изменения сохраняются сразу'}</span>
          {user.role !== 'super-admin' && !isSelf && (
            <ConfirmAction
              danger={!disabled}
              label={disabled ? 'Включить' : 'Отключить пользователя'}
              question={
                disabled ? 'Вернуть доступ ко входу?' : 'Отключить вход? Данные сохранятся.'
              }
              confirmLabel={disabled ? 'Да, включить' : 'Да, отключить'}
              onConfirm={handleToggleDisabled}
            />
          )}
        </footer>
      </aside>

      <EditAdminPermissionsModal
        isOpen={editingAdmin}
        onClose={() => setEditingAdmin(false)}
        onSuccess={() => setNotice('Список редактируемых курсов обновлён')}
        targetUid={user.uid}
        targetName={userDisplayName(user)}
        currentEditableCourses={user.adminEditableCourses ?? []}
      />

      <AddAdminModal
        isOpen={assigningAdmin}
        onClose={() => setAssigningAdmin(false)}
        onSuccess={() => setNotice('Права администратора курса выданы')}
        initialEmail={user.email ?? ''}
      />
    </div>
  );
}
