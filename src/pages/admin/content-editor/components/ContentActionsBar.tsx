import { Link } from 'react-router-dom';

interface ContentActionsBarProps {
  periodId: string | undefined;
  saving: boolean;
  title: string;
  onSave: () => void;
  onDelete: () => void;
}

/**
 * Action buttons bar (back, delete, save)
 */
export function ContentActionsBar({ periodId, saving, title, onSave, onDelete }: ContentActionsBarProps) {
  return (
    <div className="flex justify-between items-center bg-white rounded-lg shadow p-6">
      <div className="flex gap-3">
        <Link
          to="/admin/content"
          className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
        >
          ← Назад
        </Link>
        <button
          onClick={onDelete}
          disabled={saving || !periodId}
          className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          🗑️ Удалить период
        </button>
      </div>

      <button
        onClick={onSave}
        disabled={saving || !title.trim()}
        className="px-8 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
      >
        {saving ? '💾 Сохранение...' : '💾 Сохранить изменения'}
      </button>
    </div>
  );
}
