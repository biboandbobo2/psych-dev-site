import type { UserRecord } from '../../../../hooks/useAllUsers';

interface AnnouncementAdminsFieldProps {
  adminUsers: readonly UserRecord[];
  loading: boolean;
  selected: ReadonlySet<string>;
  onToggle: (uid: string) => void;
  disabled: boolean;
}

export function AnnouncementAdminsField({
  adminUsers,
  loading,
  selected,
  onToggle,
  disabled,
}: AnnouncementAdminsFieldProps) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        Кто может писать объявления этой группы ({selected.size})
      </legend>
      <p className="text-xs text-gray-500">
        Супер-админ пишет всегда. Ниже — обычные администраторы, которым вы даёте это право
        именно для этой группы.
      </p>
      {loading ? (
        <div className="text-sm text-gray-500">Загрузка…</div>
      ) : adminUsers.length === 0 ? (
        <div className="text-sm text-gray-500">Нет обычных администраторов.</div>
      ) : (
        <ul className="space-y-1 rounded-md border border-gray-200 p-2">
          {adminUsers.map((u) => (
            <li key={u.uid}>
              <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selected.has(u.uid)}
                  onChange={() => onToggle(u.uid)}
                  disabled={disabled || u.role === 'super-admin'}
                />
                <span className="text-sm">
                  {u.displayName || u.email || u.uid}
                  {u.role === 'super-admin' && (
                    <span className="ml-2 text-xs text-purple-600">супер-админ (всегда)</span>
                  )}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}
