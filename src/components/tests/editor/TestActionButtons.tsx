import type { TestStatus } from '../../../types/tests';

interface TestActionButtonsProps {
  currentStatus: TestStatus;
  saving: boolean;
  onClose: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
}

export function TestActionButtons({
  currentStatus,
  saving,
  onClose,
  onSaveDraft,
  onPublish,
  onUnpublish,
}: TestActionButtonsProps) {
  return (
    <div className="sticky bottom-0 flex items-center justify-between gap-3 rounded-lg border-t border-gray-200 bg-white p-4 shadow-lg">
      <button
        onClick={onClose}
        disabled={saving}
        className="rounded-md bg-gray-600 px-4 py-2 text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Отмена
      </button>

      <div className="flex gap-3">
        <button
          onClick={onSaveDraft}
          disabled={saving}
          className="rounded-md bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Сохранение...' : (currentStatus === 'draft' ? 'Сохранить черновик' : 'Сохранить изменения')}
        </button>

        {currentStatus === 'published' ? (
          <button
            onClick={onUnpublish}
            disabled={saving}
            className="rounded-md bg-orange-600 px-4 py-2 text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Снятие...' : 'Снять с публикации'}
          </button>
        ) : (
          <button
            onClick={onPublish}
            disabled={saving}
            className="rounded-md bg-green-600 px-4 py-2 text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Публикация...' : 'Опубликовать'}
          </button>
        )}
      </div>
    </div>
  );
}
