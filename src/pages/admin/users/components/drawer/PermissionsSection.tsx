/**
 * Секция «Права». Видна и со-админу, но менять их может только супер-админ —
 * у со-админа контролы заблокированы (та же граница, что в Cloud Functions).
 */
import { useState } from 'react';
import type { CourseOption } from '../../../../../hooks/useCourses';
import {
  makeUserCoAdmin,
  removeAdmin,
  removeCoAdmin,
} from '../../../../../lib/adminFunctions';
import { reportAppError } from '../../../../../lib/errorHandler';
import type { UserRowData } from '../../utils';
import { ConfirmAction, Toggle } from './controls';

const ROW = 'flex items-center justify-between gap-3 border-b border-border/60 px-3.5 py-3 last:border-b-0';

export function PermissionsSection({
  row,
  courses,
  isSuperAdmin,
  onEditAdminCourses,
  onAssignAdmin,
}: {
  row: UserRowData;
  courses: CourseOption[];
  isSuperAdmin: boolean;
  onEditAdminCourses: () => void;
  onAssignAdmin: () => void;
}) {
  const [notice, setNotice] = useState<string | null>(null);
  const [coAdminBusy, setCoAdminBusy] = useState(false);
  const { user } = row;
  const isAdmin = user.role === 'admin';
  const editableNames = (user.adminEditableCourses ?? [])
    .map((id) => courses.find((course) => course.id === id)?.name ?? id)
    .join(', ');

  const handleRemoveAdmin = async () => {
    try {
      await removeAdmin(user.uid);
      setNotice('Права администратора курса сняты');
    } catch (error) {
      reportAppError({ message: 'Не удалось снять права администратора', error, context: 'admin-users' });
    }
  };

  const handleCoAdmin = async (next: boolean) => {
    setCoAdminBusy(true);
    setNotice(null);
    try {
      if (next) await makeUserCoAdmin({ targetEmail: user.email ?? undefined });
      else await removeCoAdmin(user.uid);
      setNotice(next ? 'Со-админ назначен' : 'Права со-админа сняты');
    } catch (error) {
      reportAppError({ message: 'Не удалось изменить права со-админа', error, context: 'admin-users' });
    } finally {
      setCoAdminBusy(false);
    }
  };

  return (
    <section className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.04em] text-ink-faint">Права</h3>
        {!isSuperAdmin && <span className="text-xs text-muted">меняет только супер-админ</span>}
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <div className={ROW}>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-fg">Администратор курса</p>
            <p className="text-xs text-muted">
              {isAdmin
                ? editableNames || 'курсы не выбраны'
                : 'редактирует свои курсы, отвечает студентам, видит их прогресс'}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {isAdmin ? (
              <>
                <button
                  type="button"
                  disabled={!isSuperAdmin}
                  onClick={onEditAdminCourses}
                  className="h-8 rounded-lg border border-border bg-card px-3 text-[13px] font-semibold text-fg transition hover:bg-card2 disabled:opacity-60"
                >
                  Изменить
                </button>
                <ConfirmAction
                  danger
                  disabled={!isSuperAdmin}
                  label="Снять права"
                  question="Снять права администратора курса?"
                  confirmLabel="Да, снять"
                  onConfirm={handleRemoveAdmin}
                />
              </>
            ) : (
              <button
                type="button"
                disabled={!isSuperAdmin}
                onClick={onAssignAdmin}
                className="h-8 rounded-lg border border-border bg-card px-3 text-[13px] font-semibold text-fg transition hover:bg-card2 disabled:opacity-60"
              >
                Назначить курсы
              </button>
            )}
          </div>
        </div>

        {user.role !== 'super-admin' && (
          <div className={ROW}>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-fg">Со-админ</p>
              <p className="text-xs text-muted">
                управляет пользователями и потоками, редактирует страницы сайта
              </p>
            </div>
            <Toggle
              label="Со-админ"
              checked={user.coAdmin === true}
              disabled={!isSuperAdmin || coAdminBusy}
              onChange={handleCoAdmin}
            />
          </div>
        )}
      </div>

      {notice && <p className="text-xs text-accent">{notice}</p>}
    </section>
  );
}
