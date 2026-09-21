/**
 * Строка списка пользователей. На десктопе — 5 колонок сетки, до `md` —
 * карточка: обёртка вокруг колонок 2–5 схлопывается через `md:contents`,
 * поэтому разметка одна (важно и для e2e — нет дублей в DOM).
 */
import { USER_GRID, buildAccessSummary, formatLastLogin, type UserRowData } from '../utils';
import { UserBadges, UserIdentity } from './UserIdentity';

export function UserListRow({
  row,
  isCurrent,
  onOpen,
}: {
  row: UserRowData;
  isCurrent: boolean;
  onOpen: () => void;
}) {
  const summary = buildAccessSummary(row);
  const lastLogin = formatLastLogin(row.lastLoginAt);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex w-full flex-col gap-2.5 rounded-xl border border-border bg-card p-3.5 text-left transition hover:bg-card2 md:rounded-none md:border-0 md:border-b md:border-border/60 md:px-5 md:py-3 md:last:border-b-0 ${USER_GRID} ${
        row.user.disabled === true ? 'opacity-60' : ''
      }`}
    >
      <UserIdentity row={row} isCurrent={isCurrent} />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 md:contents">
        <UserBadges row={row} />

        <div className="flex min-w-0 flex-col md:gap-0.5">
          <span className="text-sm font-semibold text-fg">{summary.primary}</span>
          {summary.secondary && (
            <span className="text-xs text-muted">{summary.secondary}</span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {row.streams.length === 0 ? (
            <span className="hidden text-[13px] text-muted md:inline">—</span>
          ) : (
            row.streams.map((stream) => (
              <span
                key={stream.id}
                className="inline-flex rounded-lg bg-pastel-plain px-2 py-0.5 text-xs text-ink-soft"
              >
                {stream.curator ? `${stream.name} · куратор` : stream.name}
              </span>
            ))
          )}
        </div>

        <div className="ml-auto text-[13px] text-ink-soft md:ml-0">{lastLogin}</div>
      </div>
    </button>
  );
}
