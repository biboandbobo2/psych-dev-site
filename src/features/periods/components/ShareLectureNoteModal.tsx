import { useEffect, useMemo, useState } from 'react';
import { BaseModal, ModalCancelButton, ModalSaveButton } from '../../../components/ui/BaseModal';
import { useMyGroups } from '../../../hooks/useMyGroups';
import { useSharedLectureNoteActions } from '../../../hooks/useSharedLectureNotes';
import { useAuthStore } from '../../../stores/useAuthStore';
import { debugError } from '../../../lib/debug';
import { formatLectureTimestamp, type LectureNoteSegment } from '../../../types/notes';
import { MAX_SHARED_NOTE_SEGMENTS } from '../../../types/sharedLectureNotes';
import type { LectureQuestionVisibility } from '../../../types/lectureQuestions';

interface ShareLectureNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  segments: LectureNoteSegment[];
  courseId: string;
  periodId: string;
  periodTitle: string;
  lectureTitle?: string | null;
  videoId?: string | null;
}

export function ShareLectureNoteModal({
  isOpen,
  onClose,
  segments,
  courseId,
  periodId,
  periodTitle,
  lectureTitle,
  videoId,
}: ShareLectureNoteModalProps) {
  const user = useAuthStore((s) => s.user);
  const { groups } = useMyGroups();
  const { shareLectureNote } = useSharedLectureNoteActions();

  const targetGroups = useMemo(
    () => groups.filter((group) => group.id !== 'everyone' && !group.isSystem),
    [groups]
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [visibility, setVisibility] = useState<LectureQuestionVisibility>('group');
  const [groupId, setGroupId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasGroups = targetGroups.length > 0;
  const effectiveVisibility: LectureQuestionVisibility = hasGroups ? visibility : 'lecturers';

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      return;
    }

    // По умолчанию выбраны все сегменты — типовой сценарий «отправить конспект целиком».
    setSelectedIds(new Set(segments.map((segment) => segment.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Как в AskLectureQuestionModal: перезапуск при дорезолве групп,
  // уже выбранная группа не перетирается.
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setGroupId((current) => current ?? targetGroups[0]?.id ?? null);
  }, [isOpen, targetGroups]);

  const selectedSegments = segments.filter((segment) => selectedIds.has(segment.id));
  const tooManySegments = selectedSegments.length > MAX_SHARED_NOTE_SEGMENTS;
  const canSubmit =
    Boolean(user) &&
    selectedSegments.length > 0 &&
    !tooManySegments &&
    (effectiveVisibility === 'lecturers' || Boolean(groupId));

  const toggleSegment = (segmentId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(segmentId)) {
        next.delete(segmentId);
      } else {
        next.add(segmentId);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await shareLectureNote({
        courseId,
        periodId,
        periodTitle,
        lectureTitle: lectureTitle ?? null,
        videoId: videoId ?? null,
        segments: selectedSegments,
        visibility: effectiveVisibility,
        groupId: effectiveVisibility === 'group' ? groupId : null,
      });
      onClose();
    } catch (err) {
      debugError('[ShareLectureNoteModal] failed to share note', err);
      setError('Не удалось отправить конспект. Попробуйте ещё раз.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Поделиться конспектом"
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
          {lectureTitle && lectureTitle !== periodTitle ? ` — ${lectureTitle}` : ''}.
          Отправляется копия выбранных фрагментов — дальнейшие правки конспекта в неё не попадут.
        </p>

        {segments.length === 0 ? (
          <p className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-500">
            В конспекте пока нет сегментов — напишите что-нибудь в режиме конспекта.
          </p>
        ) : (
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {segments.map((segment) => {
              const timestamp = formatLectureTimestamp(segment.startMs);
              return (
                <li key={segment.id}>
                  <label className="flex items-start gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(segment.id)}
                      onChange={() => toggleSegment(segment.id)}
                      className="mt-1"
                    />
                    <span className="min-w-0">
                      {timestamp ? (
                        <span className="mr-2 text-xs font-medium text-gray-400">{timestamp}</span>
                      ) : null}
                      <span className="line-clamp-3 whitespace-pre-wrap">{segment.text}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}

        {tooManySegments ? (
          <p className="text-sm text-rose-600">
            Выбрано {selectedSegments.length} сегментов — максимум {MAX_SHARED_NOTE_SEGMENTS}.
            Снимите лишние.
          </p>
        ) : null}

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-gray-700">Кому отправить</legend>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="radio"
              name="share-visibility"
              checked={effectiveVisibility === 'group'}
              onChange={() => setVisibility('group')}
              disabled={!hasGroups}
            />
            Моей группе и лекторам
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
              name="share-visibility"
              checked={effectiveVisibility === 'lecturers'}
              onChange={() => setVisibility('lecturers')}
            />
            Только лекторам курса
          </label>
        </fieldset>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      </div>
    </BaseModal>
  );
}
