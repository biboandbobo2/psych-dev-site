import { useMemo, useState, type ReactNode } from 'react';
import LoginModal from '../../../components/LoginModal';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useMyGroups } from '../../../hooks/useMyGroups';
import {
  useLessonAllQuestions,
  useLessonQuestions,
} from '../../../hooks/useLectureQuestions';
import {
  useLessonAllOpenNotes,
  useLessonGroupOpenNotes,
} from '../../../hooks/useOpenLectureNotes';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { buildChatFeed, type ChatFeedItem } from '../lib/chatFeed';
import { canEditCourse } from '../../../types/user';
import { formatTimestampMs } from '../../../lib/formatTimestamp';
import type { LectureNoteSegment } from '../../../types/notes';

interface VideoStudyQuestionsPanelProps {
  courseId: string;
  periodId: string;
  videoId: string | null;
  /** Абзацы собственного конспекта текущей лекции (local draft). */
  noteSegments: LectureNoteSegment[];
  onTimestampClick: (startMs: number) => void;
}

/** Таймкод в одной строке с началом текста реплики. */
function InlineTimestamp({
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
      className="mr-1.5 align-baseline text-xs font-medium tabular-nums text-white/40 transition hover:text-white"
    >
      {label}
    </button>
  );
}

function LecturersOnlyBadge() {
  return (
    <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] text-amber-200">
      только лекторам
    </span>
  );
}

/**
 * Пузырь реплики: свои — справа, чужие — слева; вопрос отличается от абзаца
 * конспекта тоном фона (акцентный vs нейтральный), без текстовых пометок.
 */
function ChatBubble({
  isOwn,
  isQuestion,
  authorName,
  badge,
  children,
}: {
  isOwn: boolean;
  isQuestion: boolean;
  authorName: string | null;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-[1.1rem] px-3.5 py-2 ${
          isQuestion
            ? 'bg-[color:var(--accent)]/20 ring-1 ring-[color:var(--accent)]/30'
            : 'bg-white/[0.06] ring-1 ring-white/10'
        }`}
      >
        {!isOwn && (authorName || badge) ? (
          <div className="mb-0.5 flex items-center gap-2">
            {authorName ? (
              <span className="text-xs text-white/45">{authorName}</span>
            ) : null}
            {badge}
          </div>
        ) : null}
        {isOwn && badge ? <div className="mb-0.5 flex justify-end">{badge}</div> : null}
        <p className="text-sm leading-6 text-white/85">{children}</p>
      </div>
    </div>
  );
}

/**
 * Вкладка «Чат»: единая лента занятия по таймкодам лекции — вопросы группы,
 * абзацы живых открытых конспектов одногруппников и свои записи («Вы»).
 * Лектор курса (canEditCourse) видит все вопросы занятия и все открытые конспекты.
 */
export function VideoStudyQuestionsPanel({
  courseId,
  periodId,
  videoId,
  noteSegments,
  onTimestampClick,
}: VideoStudyQuestionsPanelProps) {
  const user = useAuthStore((s) => s.user);
  const userRole = useAuthStore((s) => s.userRole);
  const adminEditableCourses = useAuthStore((s) => s.adminEditableCourses);
  const isLecturer = canEditCourse(userRole, adminEditableCourses, courseId);
  const isDesktop = useIsDesktop();
  const { groups } = useMyGroups(Boolean(user) && !isLecturer);
  const groupIds = useMemo(
    () =>
      groups
        .filter((group) => group.id !== 'everyone' && !group.isSystem)
        .map((group) => group.id),
    [groups]
  );

  // Студент и лектор ходят разными запросами (правила: group-membership vs
  // canEditCourse); неактивный режим получает null и не открывает листенеры.
  const studentScope = user && !isLecturer ? courseId : null;
  const lecturerScope = user && isLecturer ? courseId : null;
  const { questions: groupQuestions, loading: groupLoading } = useLessonQuestions(
    studentScope,
    periodId,
    groupIds
  );
  const { questions: allQuestions, loading: allLoading } = useLessonAllQuestions(
    lecturerScope,
    periodId
  );
  const groupOpenNotes = useLessonGroupOpenNotes(studentScope, periodId, groupIds);
  const allOpenNotes = useLessonAllOpenNotes(lecturerScope, periodId);

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [onlyQuestions, setOnlyQuestions] = useState(false);

  const questions = isLecturer ? allQuestions : groupQuestions;
  const loading = isLecturer ? allLoading : groupLoading;
  const openNotes = isLecturer ? allOpenNotes : groupOpenNotes;

  const feed = useMemo(
    () =>
      buildChatFeed({
        questions,
        openNotes,
        ownSegments: noteSegments,
        currentUserUid: user?.uid ?? null,
        videoId,
      }),
    [questions, openNotes, noteSegments, user?.uid, videoId]
  );
  const visibleFeed = onlyQuestions
    ? feed.filter((item) => item.kind === 'question')
    : feed;

  const renderItem = (item: ChatFeedItem) => {
    if (item.kind === 'question') {
      const { question } = item;
      const isOwn = question.authorUid === user?.uid;
      return (
        <ChatBubble
          key={item.key}
          isOwn={isOwn}
          isQuestion
          authorName={isOwn ? null : question.authorName ?? 'Участник группы'}
          badge={question.visibility === 'lecturers' ? <LecturersOnlyBadge /> : undefined}
        >
          <InlineTimestamp startMs={question.startMs} onClick={onTimestampClick} />
          {question.text}
        </ChatBubble>
      );
    }

    return (
      <ChatBubble
        key={item.key}
        isOwn={item.isOwn}
        isQuestion={false}
        authorName={item.isOwn ? null : item.authorName ?? 'Участник группы'}
        badge={item.visibility === 'lecturers' ? <LecturersOnlyBadge /> : undefined}
      >
        <InlineTimestamp startMs={item.anchorMs} onClick={onTimestampClick} />
        {item.text}
      </ChatBubble>
    );
  };

  return (
    <>
      <aside className="flex h-full min-h-0 flex-col px-4 py-4 text-white lg:px-5 lg:py-5">
        {!user ? (
          <div className="flex flex-1 flex-col items-start justify-center gap-3">
            <p className="text-sm leading-6 text-white/60">
              Чат лекции видят ваша группа и лекторы. Войдите, чтобы участвовать.
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
              {isLecturer ? (
                <span className="rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium text-white/55 ring-1 ring-white/10">
                  Лекторский режим: все вопросы занятия
                </span>
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

            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pb-2">
              {loading ? (
                <p className="text-sm text-white/50">Загружаем чат…</p>
              ) : visibleFeed.length === 0 ? (
                <p className="rounded-[1.25rem] border border-white/10 bg-black/20 px-4 py-4 text-sm leading-6 text-white/60">
                  {isDesktop
                    ? 'В чате пока пусто. Пишите конспект — открытые записи и вопросы по абзацам («?») появятся здесь по таймкодам лекции.'
                    : 'В чате пока пусто. Вопросы и открытые конспекты группы появятся здесь по таймкодам лекции.'}
                </p>
              ) : (
                visibleFeed.map(renderItem)
              )}
            </div>
          </>
        )}
      </aside>

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </>
  );
}
