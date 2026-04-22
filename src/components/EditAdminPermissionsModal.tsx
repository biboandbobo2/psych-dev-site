import { useEffect, useMemo, useState, type FormEvent } from "react";
import { setAdminEditableCourses } from "../lib/adminFunctions";
import { useCourses } from "../hooks/useCourses";

interface EditAdminPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  targetUid: string;
  targetName: string;
  currentEditableCourses: string[];
}

export function EditAdminPermissionsModal({
  isOpen,
  onClose,
  onSuccess,
  targetUid,
  targetName,
  currentEditableCourses,
}: EditAdminPermissionsModalProps) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { courses, loading: coursesLoading } = useCourses({ includeUnpublished: true });

  useEffect(() => {
    if (isOpen) {
      setSelected(new Set(currentEditableCourses));
      setError(null);
    }
  }, [isOpen, currentEditableCourses]);

  const sortedCourses = useMemo(
    () => [...courses].sort((a, b) => a.name.localeCompare(b.name, "ru")),
    [courses]
  );

  if (!isOpen) return null;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selected.size === 0) {
      setError("Нельзя оставить админа без курсов. Если нужно — снимите права.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await setAdminEditableCourses({
        targetUid,
        editableCourses: Array.from(selected),
      });
      onSuccess();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось сохранить";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Редактируемые курсы</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 transition hover:text-gray-600"
            disabled={loading}
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>

        <p className="mb-4 text-sm text-gray-600">
          Админ <span className="font-medium">{targetName}</span> видит все курсы, но
          редактирует только отмеченные.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {coursesLoading ? (
            <div className="text-sm text-gray-500">Загрузка курсов…</div>
          ) : (
            <ul className="space-y-1 rounded-md border border-gray-200 p-2">
              {sortedCourses.map((course) => (
                <li key={course.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={selected.has(course.id)}
                      onChange={() => toggle(course.id)}
                      disabled={loading}
                    />
                    <span className="text-sm">
                      {course.icon} {course.name}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-gray-300 px-4 py-2 transition hover:bg-gray-50"
              disabled={loading}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:bg-gray-400"
              disabled={loading || selected.size === 0}
            >
              {loading ? "Сохраняем…" : "Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
