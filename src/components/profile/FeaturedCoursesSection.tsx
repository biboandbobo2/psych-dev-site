import { useMemo, useState } from 'react';
import { useCourses } from '../../hooks/useCourses';
import { useMyGroups } from '../../hooks/useMyGroups';
import { useContinueCourses } from '../../hooks/useContinueCourses';
import { setMyFeaturedCourses } from '../../lib/adminFunctions';
import { debugError } from '../../lib/debug';

/**
 * Секция «Мои актуальные курсы» в профиле. По умолчанию актуальны курсы
 * потока и купленные; студент может убрать любые из них и добавить свои,
 * без лимита. Храним только правки: добавленные (`featuredCourseIds`) и
 * убранные (`unfeaturedCourseIds`), поэтому новые актуальные потока
 * появляются у студента сами.
 */
export function FeaturedCoursesSection() {
  const { courses, courseMap, loading: coursesLoading } = useCourses();
  const { groups } = useMyGroups();
  const { resolution, defaults, accessibleCourseIds } = useContinueCourses(courses, groups);

  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Выбор — в порядке каталога, не «от старых к новым».
  const accessibleCourses = useMemo(() => {
    const accessible = new Set(accessibleCourseIds);
    return courses.filter((c) => accessible.has(c.id));
  }, [courses, accessibleCourseIds]);

  const streamSet = useMemo(() => new Set(defaults.streamIds), [defaults.streamIds]);

  const startEditing = () => {
    setSelected(resolution.isFallback ? [] : resolution.ids);
    setError(null);
    setEditing(true);
  };

  const toggle = (courseId: string) => {
    setSelected((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]
    );
  };

  const handleSave = async () => {
    const accessible = new Set(accessibleCourseIds);
    const base = defaults.ids.filter((id) => accessible.has(id));
    setSaving(true);
    setError(null);
    try {
      await setMyFeaturedCourses({
        courseIds: selected.filter((id) => !base.includes(id)),
        unfeaturedCourseIds: base.filter((id) => !selected.includes(id)),
      });
      setEditing(false);
    } catch (err) {
      debugError('setMyFeaturedCourses failed', err);
      setError(err instanceof Error ? err.message : 'Не удалось сохранить.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-brand">
      <h2 className="text-lg font-bold text-fg">Мои актуальные курсы</h2>
      <p className="mt-1 text-sm text-muted">
        Курсы, которые сейчас активно проходите, — они показаны в блоке «продолжить курс» на
        главной. По умолчанию это актуальные курсы потока и купленные.
      </p>

      {!editing ? (
        <div className="mt-4 space-y-3">
          {resolution.ids.length === 0 ? (
            <p className="rounded-xl border border-border bg-card2 px-3 py-2 text-sm text-muted">
              У вас пока нет открытых курсов.
            </p>
          ) : (
            <>
              {resolution.isFallback ? (
                <p className="text-xs text-muted">
                  Ничего не выбрано — на главной показан последний просмотренный курс, а если
                  вы ещё ничего не смотрели, самый ранний из открытых.
                </p>
              ) : null}
              <ul className="space-y-2">
                {resolution.ids.map((id) => {
                  const c = courseMap.get(id);
                  return (
                    <li
                      key={id}
                      className="flex items-center gap-3 rounded-xl border border-border bg-card2 px-3 py-2 text-sm"
                    >
                      <span className="text-2xl" aria-hidden>
                        {c?.icon || '🎓'}
                      </span>
                      <span className="flex-1 font-semibold text-fg">{c?.name ?? id}</span>
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                onClick={startEditing}
                className="text-sm font-semibold text-accent transition hover:text-[#1F4D22]"
              >
                Изменить →
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-muted">Выбрано: {selected.length}</p>
          {coursesLoading ? (
            <p className="text-sm text-muted">Загрузка курсов…</p>
          ) : (
            <ul className="space-y-1 rounded-xl border border-border bg-card2 p-2">
              {accessibleCourses.map((c) => (
                <li key={c.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-card">
                    <input
                      type="checkbox"
                      checked={selected.includes(c.id)}
                      onChange={() => toggle(c.id)}
                      disabled={saving}
                    />
                    <span className="text-lg" aria-hidden>
                      {c.icon}
                    </span>
                    <span className="flex-1 text-sm text-fg">{c.name}</span>
                    {streamSet.has(c.id) ? (
                      <span className="rounded-full bg-accent-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                        у потока
                      </span>
                    ) : null}
                  </label>
                </li>
              ))}
            </ul>
          )}

          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl border border-accent/30 bg-accent-100 px-4 py-2 text-sm font-semibold text-accent transition hover:bg-accent-100/70 disabled:opacity-50"
            >
              {saving ? 'Сохраняем…' : 'Сохранить'}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
              disabled={saving}
              className="rounded-xl border border-border bg-card2 px-4 py-2 text-sm transition hover:bg-card disabled:opacity-50"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
