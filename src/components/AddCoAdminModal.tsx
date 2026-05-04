import { useState, type FormEvent } from "react";
import { makeUserCoAdmin } from "../lib/adminFunctions";

interface AddCoAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddCoAdminModal({ isOpen, onClose, onSuccess }: AddCoAdminModalProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await makeUserCoAdmin({ targetEmail: email });
      setEmail("");
      onSuccess();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось назначить со-админа";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Добавить со-админа</h2>
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
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Email пользователя
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="user@example.com"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
              disabled={loading}
            />
            <p className="mt-2 text-sm text-gray-500">
              Пользователь должен хотя бы раз войти через Google.
            </p>
          </div>

          <div className="rounded-md border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-900">
            Со-админ получит доступ только к редактору страниц DOM Academy
            («О нас» и страницы проектов). Прав admin/super-admin не выдаётся.
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
              className="flex-1 rounded-md bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-700 disabled:bg-gray-400"
              disabled={loading}
            >
              {loading ? "Назначение..." : "Назначить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
