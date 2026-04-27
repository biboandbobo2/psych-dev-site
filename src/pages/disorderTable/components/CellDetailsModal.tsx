import { BaseModal, ModalCancelButton, ModalSaveButton } from '../../../components/ui/BaseModal';
import type {
  DisorderTableComment,
  DisorderTableEntry,
} from '../../../features/disorderTable';
import { TRACK_META } from '../utils/trackMeta';

interface CellDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  saving: boolean;
  isMobile: boolean;
  canEditEntries: boolean;
  canComment: boolean;
  commentsLoading: boolean;
  commentsSaving: boolean;
  commentsError: string | null;
  cellEntries: DisorderTableEntry[];
  commentsByEntryId: Map<string, DisorderTableComment[]>;
  commentDrafts: Record<string, string>;
  commentSubmitErrors: Record<string, string>;
  commentSavingEntryId: string | null;
  hasActiveCell: boolean;
  onAddToCell: () => void;
  onStartEdit: (entryId: string) => void;
  onRemove: (entryId: string) => void;
  onCommentDraftChange: (entryId: string, value: string) => void;
  onCommentSubmit: (entryId: string) => void;
}

export function CellDetailsModal({
  isOpen,
  onClose,
  title,
  saving,
  isMobile,
  canEditEntries,
  canComment,
  commentsLoading,
  commentsSaving,
  commentsError,
  cellEntries,
  commentsByEntryId,
  commentDrafts,
  commentSubmitErrors,
  commentSavingEntryId,
  hasActiveCell,
  onAddToCell,
  onStartEdit,
  onRemove,
  onCommentDraftChange,
  onCommentSubmit,
}: CellDetailsModalProps) {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="2xl"
      disabled={saving}
      footer={
        <>
          <ModalCancelButton onClick={onClose}>Закрыть</ModalCancelButton>
          {!isMobile && canEditEntries && hasActiveCell && (
            <ModalSaveButton onClick={onAddToCell} disabled={saving}>
              Добавить в это пересечение
            </ModalSaveButton>
          )}
        </>
      }
    >
      {cellEntries.length === 0 ? (
        <p className="text-sm text-slate-600">В этом пересечении пока нет записей.</p>
      ) : (
        <div className="space-y-3">
          {commentsLoading && (
            <p className="text-xs text-slate-500">Загрузка комментариев преподавателя...</p>
          )}
          {cellEntries.map((entry) => {
            const entryComments = commentsByEntryId.get(entry.id) ?? [];
            const draft = commentDrafts[entry.id] ?? '';
            const submitError = commentSubmitErrors[entry.id];
            const savingThis = commentSavingEntryId === entry.id;

            return (
              <article key={entry.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800 [overflow-wrap:anywhere]">
                  {entry.text}
                </p>
                <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-500">
                  {entry.track ? (
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${TRACK_META[entry.track].chipClass}`}
                    >
                      {TRACK_META[entry.track].label}
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                      Без цвета
                    </span>
                  )}
                  {!isMobile && canEditEntries && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onStartEdit(entry.id)}
                        className="rounded-md border border-slate-300 bg-white px-2 py-1 font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Редактировать
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemove(entry.id)}
                        className="rounded-md border border-red-200 bg-red-50 px-2 py-1 font-medium text-red-700 hover:bg-red-100"
                      >
                        Удалить
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-3 space-y-2">
                  {entryComments.length === 0 ? (
                    <p className="rounded-md bg-white px-3 py-2 text-xs text-slate-500">
                      Комментариев преподавателя пока нет.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {entryComments.map((comment) => (
                        <div
                          key={comment.id}
                          className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2"
                        >
                          <p className="text-xs font-semibold text-emerald-900">
                            {comment.authorName || 'Преподаватель'}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-emerald-900 [overflow-wrap:anywhere]">
                            {comment.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {canComment && (
                    <div className="rounded-md border border-violet-200 bg-violet-50 p-3">
                      <label
                        htmlFor={`comment-input-${entry.id}`}
                        className="mb-1 block text-xs font-semibold text-violet-900"
                      >
                        Комментарий преподавателя
                      </label>
                      <textarea
                        id={`comment-input-${entry.id}`}
                        value={draft}
                        onChange={(event) => onCommentDraftChange(entry.id, event.target.value)}
                        rows={3}
                        maxLength={2000}
                        placeholder="Напишите комментарий для студента..."
                        className="w-full rounded-md border border-violet-300 bg-white px-2 py-1.5 text-sm text-slate-800 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
                      />
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <p className="text-[11px] text-violet-800">{draft.length}/2000</p>
                        <button
                          type="button"
                          onClick={() => onCommentSubmit(entry.id)}
                          disabled={savingThis || commentsSaving}
                          className="rounded-md border border-violet-300 bg-white px-2.5 py-1 text-xs font-medium text-violet-900 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {savingThis || commentsSaving
                            ? 'Сохранение...'
                            : 'Сохранить комментарий'}
                        </button>
                      </div>
                      {(commentsError || submitError) && (
                        <p className="mt-2 text-xs text-red-700">{submitError ?? commentsError}</p>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </BaseModal>
  );
}
