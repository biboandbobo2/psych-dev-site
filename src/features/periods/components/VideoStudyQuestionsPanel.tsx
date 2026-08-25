import { useMemo, useState } from 'react';
import LoginModal from '../../../components/LoginModal';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useMyGroups } from '../../../hooks/useMyGroups';
import {
  useLessonQuestions,
  useLectureQuestionActions,
} from '../../../hooks/useLectureQuestions';
import {
  useLessonSharedNotes,
  useSharedLectureNoteActions,
} from '../../../hooks/useSharedLectureNotes';
import { ShareLectureNoteModal } from './ShareLectureNoteModal';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { debugError } from '../../../lib/debug';
import { formatTimestampMs } from '../../../lib/formatTimestamp';
import type { LectureNoteSegment } from '../../../types/notes';
import type { LectureQuestion } from '../../../types/lectureQuestions';
import type { SharedLectureNote } from '../../../types/sharedLectureNotes';

interface VideoStudyQuestionsPanelProps {
  courseId: string;
  periodId: string;
  periodTitle: string;
  lectureTitle: string;
  videoId: string | null;
  /** Текущие сегменты конспекта — для «Поделиться конспектом» */
  noteSegments: LectureNoteSegment[];
  onTimestampClick: (startMs: number) => void;
}

type FeedItem =
  | { kind: 'question'; anchorMs: number | null; createdAt: Date; question: LectureQuestion }
  | { kind: 'note'; anchorMs: number | null; createdAt: Date; note: SharedLectureNote };

/** Единая лента занятия: вопросы группы и фрагменты конспектов по моментам лекции. */
function buildFeed(questions: LectureQuestion[], sharedNotes: SharedLectureNote[]): FeedItem[] {
  const items: FeedItem[] = [
    ...questions.map((question) => ({
      kind: 'question' as const,
      anchorMs: question.startMs,
      createdAt: question.createdAt,
      question,
    })),
    ...sharedNotes.map((note) => {
      const anchored = note.segments.find((segment) => segment.startMs !== null);
      return {
        kind: 'note' as const,
        anchorMs: anchored?.startMs ?? null,
        createdAt: note.createdAt,
        note,
      };
    }),
  ];

  // Хронология лекции: с якорем — по моменту видео, без якоря — в конец по дате.
  return items.sort((a, b) => {
    if (a.anchorMs !== null && b.anchorMs !== null) return a.anchorMs - b.anchorMs;
    if (a.anchorMs !== null) return -1;
    if (b.anchorMs !== null) return 1;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}

function TimestampChip({
  startMs,
  onClick,
}: {
  startMs: number | null;
  onClick: (startMs: number) => void;
}) {
  if (startMs === null) return null;

  const label = formatTimestampMs(startMs);
  return (
    <button
      type="button"
      onClick={() => onClick(startMs)}
      aria-label={`Перейти к ${label}`}
      className="inline-flex items-center rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-white/60 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white"
    >
      {label}
    </button>
  );
}

export function VideoStudyQuestionsPanel({
  courseId,
  periodId,
  periodTitle,
  lectureTitle,
  videoId,
  noteSegments,
  onTimestampClick,
}: VideoStudyQuestionsPanelProps) {
  const user = useAuthStore((s) => s.user);
  const isDesktop = useIsDesktop();
  const { groups } = useMyGroups();
  const groupIds = useMemo(
    () =>
      groups
        .filter((group) => group.id !== 'everyone' && !group.isSystem)
        .map((group) => group.id),
    [groups]
  );
  const { questions, loading } = useLessonQuestions(user ? courseId : null, periodId, groupIds);
  const { sharedNotes } = useLessonSharedNotes(user ? courseId : null, periodId, groupIds);
  const { deleteQuestion } = useLectureQuestionActions();
  const { deleteSharedNote } = useSharedLectureNoteActions();

  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [onlyQuestions, setOnlyQuestions] = useState(false);

  const feed = useMemo(() => buildFeed(questions, sharedNotes), [questions, sharedNotes]);
  const visibleFeed = onlyQuestions
    ? feed.filter((item) => item.kind === 'question')
    : feed;
  const hasNoteContent = noteSegments.length > 0;

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Удалить вопрос?')) return;
    try {
      await deleteQuestion(questionId);
    } catch (err) {
      debugError('[VideoStudyQuestionsPanel] failed to delete question', err);
    }
  };

  const handleDeleteSharedNote = async (shareId: string) => {
    if (!confirm('Удалить отправленный конспект?')) return;
    try {
      await deleteSharedNote(shareId);
    } catch (err) {
      debugError('[VideoStudyQuestionsPanel] failed to delete shared note', err);
    }
  };

  return (
    <>
      <aside className="flex h-full min-h-0 flex-col px-4 py-4 text-white lg:px-5 lg:py-5">
        {!user ? (
          <div className="flex flex-1 flex-col items-start justify-center gap-3">
            <p className="text-sm leading-6 text-white/60">
              Вопросы по лекции видят ваша группа и лекторы. Войдите, чтобы задать свой.
            </p>
            <button
              type="button"
              onClick={() => setIsLoginOpen(true)}
              className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Войти
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {isDesktop ? (
                <button
                  type="button"
                  onClick={() => setIsShareOpen(true)}
                  disabled={!hasNoteContent}
                  title={
                    hasNoteContent
                      ? 'Отправить фрагменты конспекта группе или лектору'
                      : 'Сначала напишите конспект'
                  }
                  className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Поделиться конспектом
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setOnlyQuestions((current) => !current)}
                aria-pressed={onlyQuestions}
                aria-label="Показывать только вопросы"
                className={`ml-auto rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  onlyQuestions
                    ? 'border-[color:var(--accent)] bg-[color:var(--accent)]/25 text-white'
                    : 'border-white/10 bg-white/5 text-white/55 hover:text-white'
                }`}
              >
                ? только вопросы
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-2">
              {loading ? (
                <p className="text-sm text-white/50">Загружаем вопросы…</p>
              ) : visibleFeed.length === 0 ? (
                <p className="rounded-[1.25rem] border border-white/10 bg-black/20 px-4 py-4 text-sm leading-6 text-white/60">
                  Пока никто не задал вопрос по этой лекции. Отметьте абзац конспекта
                  кнопкой «?» — вопрос увидит ваша группа, ведущий разберёт его на
                  семинаре.
                </p>
              ) : (
                visibleFeed.map((item) => {
                  if (item.kind === 'question') {
                    const { question } = item;
                    const isOwn = question.authorUid === user.uid;
                    return (
                      <div
                        key={`question-${question.id}`}
                        className="rounded-[1.1rem] border border-white/10 bg-black/20 px-4 py-3"
                      >
                        <div className="flex items-center gap-2">
                          <TimestampChip startMs={question.startMs} onClick={onTimestampClick} />
                          <span className="text-xs text-white/45">
                            {isOwn ? 'Вы' : question.authorName ?? 'Участник группы'}
                          </span>
                          {question.visibility === 'lecturers' ? (
                            <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] text-amber-200">
                              только лекторам
                            </span>
                          ) : null}
                          {isOwn ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteQuestion(question.id)}
                              className="ml-auto text-xs text-white/40 transition hover:text-rose-300"
                            >
                              Удалить
                            </button>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-white/85">{question.text}</p>
                      </div>
                    );
                  }

                  const { note } = item;
                  const isOwn = note.authorUid === user.uid;
                  return (
                    <div
                      key={`note-${note.id}`}
                      className="rounded-[1.1rem] border border-white/10 bg-white/[0.03] px-4 py-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/40">
                          Конспект
                        </span>
                        <span className="text-xs text-white/45">
                          {isOwn ? 'Вы' : note.authorName ?? 'Участник группы'}
                        </span>
                        {note.visibility === 'lecturers' ? (
                          <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] text-amber-200">
                            только лекторам
                          </span>
                        ) : null}
                        {isOwn ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteSharedNote(note.id)}
                            className="ml-auto text-xs text-white/40 transition hover:text-rose-300"
                          >
                            Удалить
                          </button>
                        ) : null}
                      </div>
                      <div className="mt-2 space-y-2">
                        {note.segments.map((segment) => (
                          <p key={segment.id} className="text-sm leading-6 text-white/85">
                            {segment.startMs !== null ? (
                              <button
                                type="button"
                                onClick={() => onTimestampClick(segment.startMs as number)}
                                className="mr-2 text-xs font-medium text-white/50 transition hover:text-white"
                              >
                                {formatTimestampMs(segment.startMs)}
                              </button>
                            ) : null}
                            {segment.text}
                          </p>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </aside>

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />

      <ShareLectureNoteModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        segments={noteSegments}
        courseId={courseId}
        periodId={periodId}
        periodTitle={periodTitle}
        lectureTitle={lectureTitle}
        videoId={videoId}
      />
    </>
  );
}
