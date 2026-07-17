import { useMemo, useState } from 'react';
import {
  DISORDER_TABLE_GENERAL_COMMENT_ENTRY_ID,
  type DisorderTableComment,
  type DisorderTableCommentInput,
} from '../../../features/disorderTable';

interface UseDisorderTableCommentFormsParams {
  comments: DisorderTableComment[];
  canComment: boolean;
  createComment: (input: DisorderTableCommentInput) => Promise<unknown>;
}

export function useDisorderTableCommentForms({
  comments,
  canComment,
  createComment,
}: UseDisorderTableCommentFormsParams) {
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentSubmitErrors, setCommentSubmitErrors] = useState<Record<string, string>>({});
  const [commentSavingEntryId, setCommentSavingEntryId] = useState<string | null>(null);
  const [isGeneralCommentsModalOpen, setIsGeneralCommentsModalOpen] = useState(false);
  const [generalCommentDraft, setGeneralCommentDraft] = useState('');
  const [generalCommentSubmitError, setGeneralCommentSubmitError] = useState<string | null>(null);
  const [generalCommentSaving, setGeneralCommentSaving] = useState(false);

  const generalComments = useMemo(
    () => comments.filter((c) => c.entryId === DISORDER_TABLE_GENERAL_COMMENT_ENTRY_ID),
    [comments],
  );
  const commentsByEntryId = useMemo(() => {
    const map = new Map<string, DisorderTableComment[]>();
    for (const comment of comments) {
      const bucket = map.get(comment.entryId);
      if (bucket) bucket.push(comment);
      else map.set(comment.entryId, [comment]);
    }
    return map;
  }, [comments]);
  const commentCountByEntryId = useMemo(
    () =>
      new Map(Array.from(commentsByEntryId.entries()).map(([entryId, list]) => [entryId, list.length])),
    [commentsByEntryId],
  );

  const setCommentDraft = (entryId: string, text: string) => {
    setCommentDrafts((prev) => ({ ...prev, [entryId]: text }));
    setCommentSubmitErrors((prev) => {
      if (!prev[entryId]) return prev;
      const next = { ...prev };
      delete next[entryId];
      return next;
    });
  };

  const handleCommentSubmit = async (entryId: string) => {
    if (!canComment) return;

    const draft = (commentDrafts[entryId] ?? '').trim();
    if (draft.length < 2) {
      setCommentSubmitErrors((prev) => ({
        ...prev,
        [entryId]: 'Комментарий должен содержать минимум 2 символа',
      }));
      return;
    }

    setCommentSubmitErrors((prev) => {
      if (!prev[entryId]) return prev;
      const next = { ...prev };
      delete next[entryId];
      return next;
    });
    setCommentSavingEntryId(entryId);
    try {
      await createComment({ entryId, text: draft });
      setCommentDraft(entryId, '');
    } catch (err) {
      setCommentSubmitErrors((prev) => ({
        ...prev,
        [entryId]: err instanceof Error ? err.message : 'Не удалось сохранить комментарий',
      }));
    } finally {
      setCommentSavingEntryId(null);
    }
  };

  const openGeneralCommentsModal = () => {
    setGeneralCommentSubmitError(null);
    setIsGeneralCommentsModalOpen(true);
  };

  const closeGeneralCommentsModal = () => {
    if (generalCommentSaving) return;
    setIsGeneralCommentsModalOpen(false);
    setGeneralCommentSubmitError(null);
  };

  const handleGeneralCommentSubmit = async () => {
    if (!canComment) return;

    const draft = generalCommentDraft.trim();
    if (draft.length < 2) {
      setGeneralCommentSubmitError('Комментарий должен содержать минимум 2 символа');
      return;
    }

    setGeneralCommentSubmitError(null);
    setGeneralCommentSaving(true);
    try {
      await createComment({
        entryId: DISORDER_TABLE_GENERAL_COMMENT_ENTRY_ID,
        text: draft,
      });
      setGeneralCommentDraft('');
    } catch (err) {
      setGeneralCommentSubmitError(
        err instanceof Error ? err.message : 'Не удалось сохранить комментарий',
      );
    } finally {
      setGeneralCommentSaving(false);
    }
  };

  return {
    generalComments,
    commentsByEntryId,
    commentCountByEntryId,
    commentDrafts,
    commentSubmitErrors,
    commentSavingEntryId,
    setCommentDraft,
    handleCommentSubmit,
    isGeneralCommentsModalOpen,
    generalCommentDraft,
    setGeneralCommentDraft,
    generalCommentSubmitError,
    generalCommentSaving,
    openGeneralCommentsModal,
    closeGeneralCommentsModal,
    handleGeneralCommentSubmit,
  };
}
