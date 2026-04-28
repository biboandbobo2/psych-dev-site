import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { GroupFeedItem } from '../../../types/groupFeed';
import { formatDueDateRu } from '../utils';

interface FeedItemModalProps {
  item: GroupFeedItem | null;
  onClose: () => void;
}

/**
 * Универсальная модалка деталей для элементов ленты группы:
 * - event: дата/время, zoom, ссылка на сайт, полный текст;
 * - assignment: дедлайн, полный текст (longText), опциональный zoom.
 */
export function FeedItemModal({ item, onClose }: FeedItemModalProps) {
  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [item, onClose]);

  if (!item) return null;
  const isAssignment = item.kind === 'assignment';
  const dateChip = isAssignment ? `Дедлайн: ${formatDueDateRu(item.dueDate)}` : item.dateLabel;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl bg-card p-6 shadow-brand"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute right-4 top-4 rounded-full p-1 text-muted transition hover:bg-card2"
        >
          ✕
        </button>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          {item.groupName}
        </p>
        <h3 className="mt-1 pr-6 text-lg font-bold text-fg">{item.text}</h3>
        {dateChip ? (
          <p className="mt-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-md bg-mark px-2 py-0.5 font-semibold text-[#5a4b00]">
              {dateChip}
            </span>
          </p>
        ) : null}
        {(item.zoomLink || item.siteLink) && (
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {item.zoomLink ? (
              <a
                href={item.zoomLink}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-accent/30 bg-accent-100 px-3 py-1 font-semibold text-accent transition hover:bg-accent-100/70"
              >
                Открыть Zoom →
              </a>
            ) : null}
            {item.siteLink ? (
              <a
                href={item.siteLink}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-accent/30 bg-accent-100 px-3 py-1 font-semibold text-accent transition hover:bg-accent-100/70"
              >
                Открыть на сайте →
              </a>
            ) : null}
          </div>
        )}
        {item.longText ? (
          <div className="mt-4 max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-fg">
            {item.longText}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
