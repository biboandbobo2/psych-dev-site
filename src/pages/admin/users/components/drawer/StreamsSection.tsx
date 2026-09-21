/** Секция «Потоки»: чипы с удалением и добавление в свободный поток. */
import { useState } from 'react';
import type { Group } from '../../../../../types/groups';
import { setGroupMembers } from '../../../../../lib/adminFunctions';
import { reportAppError } from '../../../../../lib/errorHandler';
import type { UserRowData } from '../../utils';
import { CloseIcon, PlusIcon } from '../icons';

export function StreamsSection({ row, groups }: { row: UserRowData; groups: Group[] }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<string | null>(null);

  const uid = row.user.uid;
  const streams = groups.filter((group) => group.isSystem !== true);
  const mine = streams.filter((group) => group.memberIds.includes(uid));
  const rest = streams.filter((group) => !group.memberIds.includes(uid));

  const save = async (group: Group, memberIds: string[], message: string) => {
    setBusyId(group.id);
    setNotice(null);
    try {
      await setGroupMembers({ groupId: group.id, memberIds });
      setNotice(message);
    } catch (error) {
      reportAppError({ message: 'Не удалось изменить состав потока', error, context: 'admin-users' });
    } finally {
      setBusyId(null);
      setPendingRemoval(null);
      setAdding(false);
    }
  };

  return (
    <section className="space-y-2.5">
      <h3 className="text-xs font-semibold uppercase tracking-[0.04em] text-ink-faint">Потоки</h3>

      <div className="flex flex-wrap items-center gap-2">
        {mine.map((group) => (
          <span
            key={group.id}
            className="inline-flex items-center gap-1.5 rounded-xl bg-pastel-plain py-1.5 pl-3 pr-1.5 text-[13px] text-ink-soft"
          >
            {group.name}
            {pendingRemoval === group.id ? (
              <span className="inline-flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() =>
                    save(
                      group,
                      group.memberIds.filter((id) => id !== uid),
                      `Убрали из «${group.name}»`
                    )
                  }
                  className="rounded-lg bg-accent px-2 py-0.5 text-xs font-semibold text-white"
                >
                  {busyId === group.id ? 'Ждите…' : 'Да, убрать'}
                </button>
                <button
                  type="button"
                  onClick={() => setPendingRemoval(null)}
                  className="rounded-lg px-2 py-0.5 text-xs font-semibold text-muted hover:text-fg"
                >
                  Отмена
                </button>
              </span>
            ) : (
              <button
                type="button"
                aria-label={`Убрать из потока «${group.name}»`}
                onClick={() => setPendingRemoval(group.id)}
                className="inline-flex h-5 w-5 items-center justify-center rounded-md text-muted transition hover:bg-card hover:text-fg"
              >
                <CloseIcon className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}

        {mine.length === 0 && !adding && <span className="text-[13px] text-muted">пока ни в одном</span>}

        {adding ? (
          <select
            aria-label="Выберите поток"
            autoFocus
            defaultValue=""
            disabled={busyId !== null}
            onChange={(event) => {
              const group = rest.find((item) => item.id === event.target.value);
              if (group) save(group, [...group.memberIds, uid], `Добавили в «${group.name}»`);
            }}
            className="h-8 rounded-xl border border-border bg-card px-2 text-[13px] font-semibold text-fg"
          >
            <option value="" disabled>
              выберите поток
            </option>
            {rest.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        ) : (
          rest.length > 0 && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-border-cool px-3 py-1.5 text-[13px] font-semibold text-accent transition hover:bg-card2"
            >
              <PlusIcon className="h-3 w-3" />В поток
            </button>
          )
        )}
      </div>

      {notice && <p className="text-xs text-accent">{notice}</p>}
    </section>
  );
}
