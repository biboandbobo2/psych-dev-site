import { createPortal } from 'react-dom';

interface DeleteTimelineConfirmModalProps {
  timelineName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteTimelineConfirmModal({
  timelineName,
  onConfirm,
  onCancel,
}: DeleteTimelineConfirmModalProps) {
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="text-base font-semibold text-slate-800">Удалить таймлайн?</div>
        <div className="mt-2 text-sm text-slate-600">
          Таймлайн <span className="font-semibold text-slate-800">«{timelineName}»</span> будет
          удалён без возможности восстановления.
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
          >
            Удалить
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
