import { useEffect } from 'react';
import type { Note } from '../../../types/notes';

interface NoteDeleteConfirmProps {
  note: Note | null;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Подтверждение удаления вместо браузерного confirm(). */
export function NoteDeleteConfirm({ note, deleting, onCancel, onConfirm }: NoteDeleteConfirmProps) {
  useEffect(() => {
    if (!note) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !deleting) {
        onCancel();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [deleting, note, onCancel]);

  if (!note) return null;

  const isLecture = note.noteScope === 'lecture';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="note-delete-title"
        className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl"
      >
        <h4 id="note-delete-title" className="text-lg font-semibold text-fg">
          {isLecture ? 'Удалить конспект' : 'Удалить заметку'} «{note.title || 'Без названия'}»?
        </h4>
        <p className="mt-2 text-sm text-muted">
          {isLecture ? 'Он исчезнет и под видео лекции. ' : ''}Действие необратимо.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            autoFocus
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-fg transition hover:bg-card2 disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-70"
          >
            {deleting ? 'Удаление…' : 'Удалить'}
          </button>
        </div>
      </div>
    </div>
  );
}
