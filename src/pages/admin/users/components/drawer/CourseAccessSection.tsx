/**
 * Секция «Доступ к курсам». Курсы, открытые потоком, здесь только читаются —
 * состав курсов потока меняется в самом потоке. Личный доступ — тумблер,
 * сохраняется сразу полной нормализованной картой (updateCourseAccess).
 * Курсы системной группы «Все» открыты каждому — в списке их нет, только
 * строка под ним.
 */
import { useMemo, useState } from 'react';
import type { CourseOption } from '../../../../../hooks/useCourses';
import type { CourseAccessMap } from '../../../../../types/user';
import { updateCourseAccess } from '../../../../../lib/adminFunctions';
import { reportAppError } from '../../../../../lib/errorHandler';
import type { AccessSource } from '../../../../../lib/effectiveAccess';
import type { UserRowData } from '../../utils';
import { LockIcon } from '../icons';
import { Toggle } from './controls';

type GroupSource = Extract<AccessSource, { kind: 'group' }>;

function groupLabel(sources: AccessSource[]): string {
  const groups = sources.filter((source): source is GroupSource => source.kind === 'group');
  if (groups.length === 0) return '';
  return groups
    .map((source) => (source.isSystem ? 'открыт всем' : source.groupName))
    .join(', ');
}

export function CourseAccessSection({
  row,
  courses,
  everyoneCourseIds,
  canEdit,
}: {
  row: UserRowData;
  courses: CourseOption[];
  /** `grantedCourses` системной группы «Все». */
  everyoneCourseIds: readonly string[];
  canEdit: boolean;
}) {
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const isAdminRole = row.user.role === 'admin' || row.user.role === 'super-admin';

  const { listed, openToEveryone } = useMemo(() => {
    const everyone = new Set(everyoneCourseIds);
    return {
      listed: courses.filter((course) => !everyone.has(course.id)),
      openToEveryone: courses.filter((course) => everyone.has(course.id)),
    };
  }, [courses, everyoneCourseIds]);

  const sorted = useMemo(() => {
    const rank = (id: string) => (row.access.courses[id] ? 0 : 1);
    return [...listed].sort(
      (a, b) => rank(a.id) - rank(b.id) || a.name.localeCompare(b.name, 'ru')
    );
  }, [listed, row.access.courses]);

  const openCount = listed.filter((course) => row.access.courses[course.id]).length;

  const handleToggle = async (courseId: string, next: boolean) => {
    const known = new Set([...courses.map((c) => c.id), ...Object.keys(row.user.courseAccess ?? {})]);
    const courseAccess: CourseAccessMap = {};
    for (const id of known) {
      courseAccess[id] = id === courseId ? next : row.user.courseAccess?.[id] === true;
    }
    setSavingId(courseId);
    setNotice(null);
    try {
      await updateCourseAccess({ targetUid: row.user.uid, courseAccess });
      setNotice(next ? 'Курс открыт лично' : 'Личный доступ снят');
    } catch (error) {
      reportAppError({
        message: 'Не удалось изменить доступ к курсу',
        error,
        context: 'admin-users',
      });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.04em] text-ink-faint">
          Доступ к курсам · {openCount} из {listed.length}
        </h3>
        <span className="text-xs text-muted">через поток меняется в потоке</span>
      </div>

      {isAdminRole ? (
        <p className="rounded-xl border border-border bg-card2 p-3 text-sm text-muted">
          Полный доступ как администратору — отдельно открывать курсы не нужно.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          {sorted.map((course) => {
            const sources = row.access.courses[course.id] ?? [];
            const fromGroup = groupLabel(sources);
            const personal = sources.some((source) => source.kind === 'personal');
            return (
              <div
                key={course.id}
                className={`flex items-center justify-between gap-3 border-b border-border/60 px-3.5 py-2 text-sm last:border-b-0 ${
                  fromGroup ? '' : 'bg-card2'
                }`}
              >
                <span className={fromGroup || personal ? 'text-fg' : 'text-muted'}>
                  {course.name}
                </span>
                {fromGroup ? (
                  <span
                    className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted"
                    title="Доступ пришёл из потока — меняется в потоке"
                  >
                    <LockIcon />
                    {fromGroup}
                  </span>
                ) : (
                  <Toggle
                    label={`Открыть лично: ${course.name}`}
                    checked={personal}
                    disabled={!canEdit || savingId !== null}
                    onChange={(next) => handleToggle(course.id, next)}
                    hint={
                      <span
                        className={`text-xs ${personal ? 'font-semibold text-accent' : 'text-muted'}`}
                      >
                        {savingId === course.id ? 'сохраняем…' : personal ? 'лично' : 'закрыт'}
                      </span>
                    }
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {openToEveryone.length > 0 && (
        <p className="text-xs text-muted">
          Открыты всем: {openToEveryone.map((course) => course.name).join(', ')}
        </p>
      )}

      {notice && <p className="text-xs text-accent">{notice}</p>}
    </section>
  );
}
