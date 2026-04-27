import { BaseModal, ModalCancelButton } from '../../../components/ui/BaseModal';
import type { DisorderTableComment } from '../../../features/disorderTable';

interface GeneralCommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  saving: boolean;
  commentsLoading: boolean;
  commentsSaving: boolean;
  commentsError: string | null;
  comments: DisorderTableComment[];
  draft: string;
  onDraftChange: (value: string) => void;
  canComment: boolean;
  submitError: string | null;
  onSubmit: () => void;
}

/**
 * Модалка «общие комментарии лектора» — комментарии относятся ко всей таблице
 * студента, а не к конкретной ячейке (entryId === GENERAL_COMMENT_ENTRY_ID).
 */
export function GeneralCommentsModal({
  isOpen,
  onClose,
  saving,
  commentsLoading,
  commentsSaving,
  commentsError,
  comments,
  draft,
  onDraftChange,
  canComment,
  submitError,
  onSubmit,
}: GeneralCommentsModalProps) {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Общие комментарии от лектора"
      maxWidth="2xl"
      disabled={saving}
      footer={
        <ModalCancelButton onClick={onClose} disabled={saving}>
          Закрыть
        </ModalCancelButton>
      }
    >
      <div className="space-y-3">
        {commentsLoading && (
          <p className="text-xs text-slate-500">Загрузка комментариев преподавателя...</p>
        )}

        {comments.length === 0 ? (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Общих комментариев пока нет.
          </p>
        ) : (
          <div className="space-y-2">
            {comments.map((comment) => (
              <article
                key={comment.id}
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2"
              >
                <p className="text-xs font-semibold text-emerald-900">
                  {comment.authorName || 'Преподаватель'}
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-emerald-900 [overflow-wrap:anywhere]">
                  {comment.text}
                </p>
              </article>
            ))}
          </div>
        )}

        {canComment && (
          <section className="rounded-lg border border-violet-200 bg-violet-50 p-3">
            <label
              htmlFor="general-comment-input"
              className="mb-1 block text-xs font-semibold text-violet-900"
            >
              Новый общий комментарий
            </label>
            <textarea
              id="general-comment-input"
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Комментарий ко всей таблице студента..."
              className="w-full rounded-md border border-violet-300 bg-white px-2 py-1.5 text-sm text-slate-800 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-[11px] text-violet-800">{draft.length}/2000</p>
              <button
                type="button"
                onClick={onSubmit}
                disabled={saving || commentsSaving || draft.trim().length < 2}
                className="rounded-md border border-violet-300 bg-white px-2.5 py-1 text-xs font-medium text-violet-900 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving || commentsSaving ? 'Сохранение...' : 'Сохранить комментарий'}
              </button>
            </div>
            {(commentsError || submitError) && (
              <p className="mt-2 text-xs text-red-700">{submitError ?? commentsError}</p>
            )}
          </section>
        )}
      </div>
    </BaseModal>
  );
}
