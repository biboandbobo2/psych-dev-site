import type { UserRecord } from '../../../../hooks/useAllUsers';

interface MembersFieldProps {
  // Список зарегистрированных пользователей (после поиска)
  users: readonly UserRecord[];
  usersLoading: boolean;
  memberIds: ReadonlySet<string>;
  onToggleMember: (uid: string) => void;
  memberSearch: string;
  onMemberSearchChange: (value: string) => void;

  // Invite by email — доступен только в режиме редактирования и не для системной группы
  inviteEnabled: boolean;
  inviteEmails: string;
  onInviteEmailsChange: (value: string) => void;
  inviting: boolean;
  inviteNotice: string | null;
  onInvite: () => void;

  isSystem: boolean;
  saving: boolean;
}

export function MembersField({
  users,
  usersLoading,
  memberIds,
  onToggleMember,
  memberSearch,
  onMemberSearchChange,
  inviteEnabled,
  inviteEmails,
  onInviteEmailsChange,
  inviting,
  inviteNotice,
  onInvite,
  isSystem,
  saving,
}: MembersFieldProps) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        Участники ({memberIds.size})
      </legend>

      {isSystem ? (
        <p className="rounded-lg border border-dashed border-purple-200 bg-purple-50 px-3 py-2 text-xs text-purple-900">
          Состав системной группы управляется автоматически: каждый новый зарегистрированный
          пользователь добавляется сюда. Ручное редактирование участников недоступно.
        </p>
      ) : inviteEnabled ? (
        <div className="space-y-2 rounded-lg border border-dashed border-gray-300 bg-[#F9FBFF] p-3">
          <p className="text-xs font-semibold text-[#2C3E50]">Пригласить по email</p>
          <p className="text-xs text-gray-500">
            Вставь список email (через запятую, пробел или с новой строки). Уже зарегистрированные
            попадут в группу сразу; остальным зарезервируется место — они войдут в группу
            автоматически при первой регистрации.
          </p>
          <textarea
            value={inviteEmails}
            onChange={(e) => onInviteEmailsChange(e.target.value)}
            rows={2}
            placeholder="alice@example.com, bob@example.com"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            disabled={inviting || saving}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onInvite}
              disabled={inviting || saving || !inviteEmails.trim()}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {inviting ? 'Добавляем…' : 'Пригласить'}
            </button>
            {inviteNotice && <span className="text-xs text-gray-700">{inviteNotice}</span>}
          </div>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-500">
          Приглашения по email доступны после создания группы — сначала сохраните её, затем
          откройте снова.
        </p>
      )}

      {!isSystem && (
        <>
          <input
            type="search"
            value={memberSearch}
            onChange={(e) => onMemberSearchChange(e.target.value)}
            placeholder="Поиск по имени или email среди зарегистрированных"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            disabled={saving}
          />
          {usersLoading ? (
            <div className="text-sm text-gray-500">Загрузка…</div>
          ) : (
            <ul className="max-h-72 space-y-1 overflow-y-auto rounded-md border border-gray-200 p-2">
              {users.map((u) => (
                <li key={u.uid}>
                  <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={memberIds.has(u.uid)}
                      onChange={() => onToggleMember(u.uid)}
                      disabled={saving}
                    />
                    <span className="flex-1 text-sm">
                      {u.displayName || u.email || u.uid}
                      {u.email && u.displayName && (
                        <span className="ml-2 text-xs text-gray-500">{u.email}</span>
                      )}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </fieldset>
  );
}
