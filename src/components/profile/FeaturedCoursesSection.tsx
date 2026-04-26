import { useEffect, useMemo, useState } from 'react';
import { useCourses } from '../../hooks/useCourses';
import { useAuthStore } from '../../stores/useAuthStore';
import { setMyFeaturedCourses } from '../../lib/adminFunctions';
import { debugError } from '../../lib/debug';
import type { CourseType } from '../../types/tests';

const MAX_FEATURED_COURSES = 3;

/**
 * Секция «Мои актуальные курсы» в профиле. Студент выбирает до 3 курсов
 * (только из тех, к которым у него есть доступ); они показываются в
 * continue-cards на /home с приоритетом над групповыми настройками.
 */
export function FeaturedCoursesSection() {
  const featuredCourseIds = useAuthStore((s) => s.featuredCourseIds);
  const hasCourseAccess = useAuthStore((s) => s.hasCourseAccess);
  const { courses, loading: coursesLoading } = useCourses();

  const [selected, setSelected] = useState<string[]>(featuredCourseIds);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Синхронизируем при изменении store (после успешной записи или фоновой
  // подписки на свой userDoc).
  useEffect(() => {
    if (!editing) {
      setSelected(featuredCourseIds);
    }
  }, [featuredCourseIds, editing]);

  const accessibleCourses = useMemo(
    () => courses.filter((c) => hasCourseAccess(c.id as CourseType)),
    [courses, hasCourseAccess]
  );

  const courseMap = useMemo(() => {
    const map = new Map<string, (typeof courses)[number]>();
    for (const c of courses) map.set(c.id, c);
    return map;
  }, [courses]);

  const toggle = (courseId: string) => {
    setSelected((prev) => {
      if (prev.includes(courseId)) {
        return prev.filter((id) => id !== courseId);
      }
      if (prev.length >= MAX_FEATURED_COURSES) return prev;
      return [...prev, courseId];
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await setMyFeaturedCourses({ courseIds: selected });
      setEditing(false);
    } catch (err) {
      debugError('setMyFeaturedCourses failed', err);
      setError(err instanceof Error ? err.message : 'Не удалось сохранить.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setSelected(featuredCourseIds);
    setEditing(false);
    setError(null);
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-brand">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-fg">Мои актуальные курсы</h2>
          <p className="mt-1 text-sm text-muted">
            До {MAX_FEATURED_COURSES} курсов, которые сейчас активно проходите.
            Они будут показаны в блоке «продолжить курс» на главной.
          </p>
        </div>
      </div>

      {!editing ? (
        <div className="mt-4 space-y-3">
          {featuredCourseIds.length === 0 ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="w-full rounded-xl border border-dashed border-border bg-card2 px-4 py-3 text-left text-sm text-muted transition hover:bg-card"
            >
              Не выбрано. Сейчас показываются актуальные курсы группы (или
              последний просмотренный). Нажмите, чтобы выбрать свои.
            </button>
          ) : (
            <>
              <ul className="space-y-2">
                {featuredCourseIds.map((id) => {
                  const c = courseMap.get(id);
                  return (
                    <li
                      key={id}
                      className="flex items-center gap-3 rounded-xl border border-border bg-card2 px-3 py-2 text-sm"
                    >
                      <span className="text-2xl" aria-hidden>
                        {c?.icon || '🎓'}
                      </span>
                      <span className="flex-1 font-semibold text-fg">
                        {c?.name ?? id}
                      </span>
                      {c && !hasCourseAccess(c.id as CourseType) ? (
                        <span className="text-xs text-muted">нет доступа</span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-sm font-semibold text-accent transition hover:text-[#1F4D22]"
              >
                Изменить →
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-muted">
            Выбрано: {selected.length}/{MAX_FEATURED_COURSES}
          </p>
          {coursesLoading ? (
            <p className="text-sm text-muted">Загрузка курсов…</p>
          ) : accessibleCourses.length === 0 ? (
            <p className="rounded-xl border border-border bg-card2 px-3 py-2 text-sm text-muted">
              У вас пока нет открытых курсов.
            </p>
          ) : (
            <ul className="space-y-1 rounded-xl border border-border bg-card2 p-2">
              {accessibleCourses.map((c) => {
                const checked = selected.includes(c.id);
                const limitReached = !checked && selected.length >= MAX_FEATURED_COURSES;
                return (
                  <li key={c.id}>
                    <label
                      className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${
                        limitReached
                          ? 'cursor-not-allowed opacity-50'
                          : 'cursor-pointer hover:bg-card'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(c.id)}
                        disabled={saving || limitReached}
                      />
                      <span className="text-lg" aria-hidden>
                        {c.icon}
                      </span>
                      <span className="text-sm text-fg">{c.name}</span>
                    </label>
                  </li>
                );
              })}
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
              onClick={handleCancel}
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
