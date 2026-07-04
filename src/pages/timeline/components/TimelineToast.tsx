import type { TimelineToastState } from '../hooks/useTimelineToast';

interface TimelineToastProps {
  toast: TimelineToastState | null;
  onClose: () => void;
}

/**
 * Неблокирующее уведомление внизу холста: подсказки валидаторов
 * (вместо alert) и «Удалено · Отменить».
 */
export function TimelineToast({ toast, onClose }: TimelineToastProps) {
  if (!toast) return null;

  const toneClasses =
    toast.tone === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-900'
      : 'border-slate-200 bg-white text-slate-800';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-20 left-1/2 z-50 flex max-w-xl -translate-x-1/2 items-center gap-3 rounded-2xl border px-4 py-3 shadow-xl ${toneClasses}`}
      style={{ fontFamily: 'Georgia, serif' }}
    >
      <span className="text-sm leading-snug">{toast.message}</span>
      {toast.actionLabel && toast.onAction && (
        <button
          type="button"
          onClick={() => {
            toast.onAction?.();
            onClose();
          }}
          className="shrink-0 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
        >
          {toast.actionLabel}
        </button>
      )}
      <button
        type="button"
        aria-label="Закрыть уведомление"
        onClick={onClose}
        className="shrink-0 rounded-lg px-1.5 text-slate-400 transition hover:text-slate-700"
      >
        ×
      </button>
    </div>
  );
}
