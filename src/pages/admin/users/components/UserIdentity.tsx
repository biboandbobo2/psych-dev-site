/** Аватар и бейджи пользователя — общие для списка и карточки. */
import type { UserRecord } from '../../../../hooks/useAllUsers';
import { getRoleBadgeClasses, getRoleLabel } from '../../../../lib/roleHelpers';
import { avatarToneClass, userDisplayName, userInitials, type UserRowData } from '../utils';

const SIZES = {
  sm: 'h-7 w-7 text-[11px]',
  md: 'h-9 w-9 text-[13px]',
  lg: 'h-14 w-14 text-lg',
} as const;

export function UserAvatar({
  user,
  size = 'md',
}: {
  user: UserRecord;
  size?: keyof typeof SIZES;
}) {
  const className = `flex shrink-0 items-center justify-center rounded-full font-semibold ${SIZES[size]}`;
  if (user.photoURL) {
    return (
      <img src={user.photoURL} alt="" className={`${className} object-cover`} referrerPolicy="no-referrer" />
    );
  }
  return (
    <div className={`${className} ${avatarToneClass(user.uid)}`} aria-hidden="true">
      {userInitials(user)}
    </div>
  );
}

const BADGE = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold';

export function UserBadges({ row }: { row: UserRowData }) {
  const { user, displayRole } = row;
  const pending = user.pendingRegistration === true;
  const disabled = user.disabled === true;
  // У приглашённого/отключённого гостя бейдж «Гость» только шумит —
  // его роль и так «пока никакая».
  const showRole = !(displayRole === 'guest' && (pending || disabled));

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {showRole && (
        <span className={`${BADGE} ${getRoleBadgeClasses(displayRole)}`}>
          {getRoleLabel(displayRole)}
        </span>
      )}
      {user.coAdmin === true && displayRole !== 'super-admin' && (
        <span className={`${BADGE} bg-pastel-ochre text-ink`} title="Ведёт пользователей, потоки и страницы сайта">
          Со-админ
        </span>
      )}
      {pending && <span className={`${BADGE} bg-mark text-ink`}>Ожидает регистрации</span>}
      {disabled && <span className={`${BADGE} bg-pastel-terracotta text-ink`}>Отключён</span>}
    </div>
  );
}

/** Имя + email (или «вы» для текущего пользователя) рядом с аватаром. */
export function UserIdentity({
  row,
  isCurrent,
  size = 'md',
}: {
  row: UserRowData;
  isCurrent: boolean;
  size?: keyof typeof SIZES;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <UserAvatar user={row.user} size={size} />
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-semibold text-fg">
          {userDisplayName(row.user)}
          {isCurrent && <span className="ml-1.5 text-xs font-normal text-muted">вы</span>}
        </span>
        <span className="truncate text-[13px] text-muted">{row.user.email}</span>
      </div>
    </div>
  );
}
