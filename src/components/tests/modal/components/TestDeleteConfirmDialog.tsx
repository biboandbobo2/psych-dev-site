interface TestDeleteConfirmDialogProps {
  testTitle: string;
  isDeleting: boolean;
  deleteConfirmRef: React.RefObject<HTMLButtonElement>;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Confirmation dialog for test deletion
 */
export function TestDeleteConfirmDialog({
  testTitle,
  isDeleting,
  deleteConfirmRef,
  onCancel,
  onConfirm,
}: TestDeleteConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-[10010] flex items-center justify-center bg-black/40 px-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <h4 className="text-lg font-semibold text-gray-900">
          Удалить тест «{testTitle}»?
        </h4>
        <p className="mt-2 text-sm text-gray-600">
          Действие необратимо. Тест и его вопросы будут удалены.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Отмена
          </button>
          <button
            ref={deleteConfirmRef}
            onClick={onConfirm}
            disabled={isDeleting}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-70 disabled:hover:bg-red-600"
          >
            {isDeleting ? 'Удаление…' : 'Удалить'}
          </button>
        </div>
      </div>
    </div>
  );
}
