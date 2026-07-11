import { useEffect, useMemo, useState } from 'react';
import { BaseModal, ModalCancelButton, ModalSaveButton } from '../../../components/ui/BaseModal';
import { useMyGroups } from '../../../hooks/useMyGroups';
import { useLectureQuestionActions } from '../../../hooks/useLectureQuestions';
import { useAuthStore } from '../../../stores/useAuthStore';
import { debugError } from '../../../lib/debug';
import { formatTimestampMs } from '../../../lib/formatTimestamp';
import {
  LECTURE_QUESTION_MAX_LENGTH,
  type LectureQuestionVisibility,
} from '../../../types/lectureQuestions';

interface AskLectureQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  periodId: string;
  periodTitle: string;
  lectureTitle?: string | null;
  videoId?: string | null;
  /** Момент лекции, зафиксированный при открытии модалки (из оверлея). */
  startMs?: number | null;
}

export function AskLectureQuestionModal({
  isOpen,
  onClose,
  courseId,
  periodId,
  periodTitle,
  lectureTitle,
  videoId,
  startMs,
}: AskLectureQuestionModalProps) {
  const user = useAuthStore((s) => s.user);
  const { groups } = useMyGroups();
  const { createQuestion } = useLectureQuestionActions();

  const targetGroups = useMemo(
    () => groups.filter((group) => group.id !== 'everyone' && !group.isSystem),
    [groups]
  );

  const [text, setText] = useState('');
  const [visibility, setVisibility] = useState<LectureQuestionVisibility>('group');
  const [groupId, setGroupId] = useState<string | null>(null);
  const [attachTimestamp, setAttachTimestamp] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasGroups = targetGroups.length > 0;
  const effectiveVisibility: LectureQuestionVisibility = hasGroups ? visibility : 'lecturers';
  const timestampLabel = typeof startMs === 'number' ? formatTimestampMs(startMs) : null;

  useEffect(() => {
    if (!isOpen) {
      setText('');
      setError(null);
      setAttachTimestamp(true);
      return;
    }

    setGroupId((current) => current ?? targetGroups[0]?.id ?? null);
  }, [isOpen, targetGroups]);

  const canSubmit =
    Boolean(user) &&
    text.trim().length > 0 &&
    text.trim().length <= LECTURE_QUESTION_MAX_LENGTH &&
    (effectiveVisibility === 'lecturers' || Boolean(groupId));

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await createQuestion({
        courseId,
        periodId,
        periodTitle,
        lectureTitle: lectureTitle ?? null,
        videoId: videoId ?? null,
        startMs: attachTimestamp && typeof startMs === 'number' ? startMs : null,
        text: text.trim(),
        visibility: effectiveVisibility,
        groupId: effectiveVisibility === 'group' ? groupId : null,
      });
      onClose();
    } catch (err) {
      debugError('[AskLectureQuestionModal] failed to create question', err);
      setError('Не удалось отправить вопрос. Попробуйте ещё раз.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Вопрос к семинару"
      maxWidth="lg"
      disabled={isSubmitting}
      footer={
        <>
          <ModalCancelButton onClick={onClose} disabled={isSubmitting} />
          <ModalSaveButton onClick={handleSubmit} disabled={!canSubmit} loading={isSubmitting}>
            Отправить
          </ModalSaveButton>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          {periodTitle}
          {lectureTitle && lectureTitle !== periodTitle ? ` — ${lectureTitle}` : ''}
        </p>

        {!user ? (
          <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Войдите в аккаунт, чтобы задавать вопросы.
          </p>
        ) : null}

        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={LECTURE_QUESTION_MAX_LENGTH}
          rows={4}
          placeholder="Что осталось непонятным? Вопрос попадёт к ведущему семинара."
          className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          aria-label="Текст вопроса"
        />

        {timestampLabel ? (
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={attachTimestamp}
              onChange={(event) => setAttachTimestamp(event.target.checked)}
            />
            Привязать момент лекции — {timestampLabel}
          </label>
        ) : null}

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-gray-700">Кто увидит вопрос</legend>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="radio"
              name="question-visibility"
              checked={effectiveVisibility === 'group'}
              onChange={() => setVisibility('group')}
              disabled={!hasGroups}
            />
            Моя группа и лекторы
            {!hasGroups ? (
              <span className="text-xs text-gray-400">(вы не состоите в группе)</span>
            ) : null}
          </label>
          {effectiveVisibility === 'group' && targetGroups.length > 1 ? (
            <select
              value={groupId ?? ''}
              onChange={(event) => setGroupId(event.target.value || null)}
              className="ml-6 rounded-lg border border-gray-300 px-2 py-1 text-sm"
              aria-label="Группа"
            >
              {targetGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          ) : null}
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="radio"
              name="question-visibility"
              checked={effectiveVisibility === 'lecturers'}
              onChange={() => setVisibility('lecturers')}
            />
            Только лекторы курса
          </label>
        </fieldset>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      </div>
    </BaseModal>
  );
}
