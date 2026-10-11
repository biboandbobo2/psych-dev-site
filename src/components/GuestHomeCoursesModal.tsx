import { useEffect, useMemo, useState } from 'react';
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { debugError } from '../lib/debug';
import { invalidateCourses, useCourses } from '../hooks/useCourses';
import { useCoursesOpenness } from '../hooks/useCoursesOpenness';
import { BaseModal } from './ui/BaseModal';

/**
 * Супер-админ выбирает, какие курсы видит гость на главной (courses/{id}.guestHome).
 * Открытые курсы попадают в «Открытый доступ», остальные — в «Программу».
 */
export function GuestHomeCoursesModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { courses } = useCourses();
  const courseIds = useMemo(() => courses.map((c) => c.id), [courses]);
  const { openCourseIds } = useCoursesOpenness(isOpen ? courseIds : []);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSelected(new Set(courses.filter((c) => c.guestHome).map((c) => c.id)));
    setError(null);
  }, [isOpen, courses]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleSave = async () => {
    const changed = courses.filter((c) => Boolean(c.guestHome) !== selected.has(c.id));
    if (!changed.length) return onClose();
    setSaving(true);
    setError(null);
    try {
      const batch = writeBatch(db);
      changed.forEach((c) =>
        batch.set(doc(db, 'courses', c.id), { guestHome: selected.has(c.id), updatedAt: serverTimestamp() }, { merge: true }),
      );
      await batch.commit();
      await invalidateCourses();
      onClose();
    } catch (err) {
      debugError('[GuestHomeCoursesModal] save failed', err);
      setError('Не удалось сохранить. Попробуйте ещё раз.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Главная для гостей"
      maxWidth="lg"
      disabled={saving}
      footer={
        <div className="flex items-center justify-end gap-2">
          {error && <span className="mr-auto text-sm text-red-700">{error}</span>}
          <button type="button" onClick={onClose} disabled={saving} className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-fg">
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-deep disabled:opacity-60"
          >
            {saving ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </div>
      }
    >
      <p className="mb-3 text-sm text-muted">
        Отмеченные курсы видит гость на главной. Открытые попадают в «Открытый доступ», остальные — в «Программу
        переподготовки».
      </p>
      <ul className="flex flex-col gap-1.5">
        {courses.map((course) => (
          <li key={course.id}>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border px-3 py-2.5 hover:bg-card2">
              <input
                type="checkbox"
                checked={selected.has(course.id)}
                onChange={() => toggle(course.id)}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              <span className="flex-1 text-sm text-fg">{course.name}</span>
              {selected.has(course.id) && (
                <span className="text-xs text-muted">{openCourseIds.has(course.id) ? 'Открытый доступ' : 'Программа'}</span>
              )}
            </label>
          </li>
        ))}
      </ul>
    </BaseModal>
  );
}

/** Кнопка в редакторе курсов (только супер-админ) + окно выбора. */
export function GuestHomeCoursesButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-2xl border border-border px-4 py-2 text-sm font-semibold text-fg transition hover:bg-card2"
      >
        Главная для гостей
      </button>
      <GuestHomeCoursesModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
