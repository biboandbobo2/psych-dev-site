import { useMemo, useState, type FormEvent } from "react";
import { makeUserAdmin } from "../lib/adminFunctions";
import { useCourses } from "../hooks/useCourses";

interface AddAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddAdminModal({ isOpen, onClose, onSuccess }: AddAdminModalProps) {
  const [email, setEmail] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { courses, loading: coursesLoading } = useCourses({ includeUnpublished: true });

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
      setError("Выберите хотя бы один курс, который админ сможет редактировать.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      await makeUserAdmin({ targetEmail: email, editableCourses: Array.from(selected) });
      setEmail("");
      setSelected(new Set());
      onSuccess();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось назначить администратора";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Добавить администратора</h2>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Email пользователя</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="user@example.com"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={loading}
            />
            <p className="mt-2 text-sm text-gray-500">Пользователь должен хотя бы раз войти через Google</p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Какие курсы может редактировать
              <span className="ml-1 text-rose-600">*</span>
            </label>
            {coursesLoading ? (
              <div className="text-sm text-gray-500">Загрузка…</div>
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
            <p className="mt-1 text-xs text-gray-500">
              Админ видит все курсы, но редактирует только отмеченные. Без выбора назначение невозможно.
            </p>
          </div>

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
              {loading ? "Назначение..." : "Назначить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
