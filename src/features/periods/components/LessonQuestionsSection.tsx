import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Section } from '../../../components/ui/Section';
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
import { AskLectureQuestionModal } from './AskLectureQuestionModal';
import { debugError } from '../../../lib/debug';
import { formatTimestampMs } from '../../../lib/formatTimestamp';
import type { LectureQuestion } from '../../../types/lectureQuestions';

interface LessonQuestionsSectionProps {
  courseId: string;
  periodId?: string;
  periodTitle: string;
}

function buildStudyLink(
  pathname: string,
  target: { videoId: string | null; startMs: number | null }
) {
  if (!target.videoId || target.startMs === null) {
    return null;
  }

  const seconds = Math.floor(target.startMs / 1000);
  return `${pathname}?study=1&video=${encodeURIComponent(target.videoId)}&panel=notes&t=${seconds}`;
}

export function LessonQuestionsSection({
  courseId,
  periodId,
  periodTitle,
}: LessonQuestionsSectionProps) {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  const { groups } = useMyGroups();
  const groupIds = useMemo(
    () =>
      groups
        .filter((group) => group.id !== 'everyone' && !group.isSystem)
        .map((group) => group.id),
    [groups]
  );
  const { questions, loading } = useLessonQuestions(
    user && periodId ? courseId : null,
    periodId ?? null,
    groupIds
  );
  const { sharedNotes } = useLessonSharedNotes(
    user && periodId ? courseId : null,
    periodId ?? null,
    groupIds
  );
  const { deleteQuestion } = useLectureQuestionActions();
  const { deleteSharedNote } = useSharedLectureNoteActions();
  const [isAskOpen, setIsAskOpen] = useState(false);

  // Секция видна только авторизованным: вопросы — фича живых потоков.
  if (!user || !periodId) {
    return null;
  }

  const handleDelete = async (questionId: string) => {
    if (!confirm('Удалить вопрос?')) return;
    try {
      await deleteQuestion(questionId);
    } catch (err) {
      debugError('[LessonQuestionsSection] failed to delete question', err);
      alert('Не удалось удалить вопрос');
    }
  };

  const handleDeleteShared = async (shareId: string) => {
    if (!confirm('Удалить расшаренный конспект?')) return;
    try {
      await deleteSharedNote(shareId);
    } catch (err) {
      debugError('[LessonQuestionsSection] failed to delete shared note', err);
      alert('Не удалось удалить конспект');
    }
  };

  return (
    <Section title="Вопросы к семинару" contentClassName="max-w-none">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm leading-6 text-muted">
            Вопросы вашей группы по этому занятию. Ведущий разберёт их на семинаре.
          </p>
          <button
            type="button"
            onClick={() => setIsAskOpen(true)}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Задать вопрос
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-muted">Загружаем вопросы…</p>
        ) : questions.length === 0 ? (
          <p className="text-sm text-muted">Пока никто не задал вопрос — будьте первым.</p>
        ) : (
          <ul className="space-y-3">
            {questions.map((question) => {
              const studyLink = buildStudyLink(location.pathname, question);
              const isOwn = question.authorUid === user.uid;

              return (
                <li
                  key={question.id}
                  className="rounded-2xl border border-border bg-white/50 px-4 py-3"
                >
                  <p className="text-sm leading-6 text-fg">{question.text}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
                    <span>{isOwn ? 'Вы' : question.authorName ?? 'Участник группы'}</span>
                    {question.visibility === 'lecturers' ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">
                        только лекторам
                      </span>
                    ) : null}
                    {studyLink ? (
                      <Link
                        to={studyLink}
                        className="text-accent no-underline hover:no-underline"
                      >
                        Открыть момент {formatTimestampMs(question.startMs)}
                      </Link>
                    ) : null}
                    {isOwn ? (
                      <button
                        type="button"
                        onClick={() => handleDelete(question.id)}
                        className="text-muted transition hover:text-rose-600"
                      >
                        Удалить
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {sharedNotes.length > 0 ? (
          <div className="space-y-3 pt-2">
            <h3 className="text-base font-semibold text-fg">Конспекты группы</h3>
            <ul className="space-y-3">
              {sharedNotes.map((note) => {
                const isOwn = note.authorUid === user.uid;

                return (
                  <li
                    key={note.id}
                    className="rounded-2xl border border-border bg-white/50 px-4 py-3"
                  >
                    <div className="space-y-2">
                      {note.segments.map((segment) => {
                        const studyLink = buildStudyLink(location.pathname, {
                          videoId: note.videoId,
                          startMs: segment.startMs,
                        });

                        return (
                          <p key={segment.id} className="text-sm leading-6 text-fg">
                            {studyLink ? (
                              <Link
                                to={studyLink}
                                className="mr-2 text-xs font-medium text-accent no-underline hover:no-underline"
                              >
                                {formatTimestampMs(segment.startMs)}
                              </Link>
                            ) : null}
                            {segment.text}
                          </p>
                        );
                      })}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
                      <span>{isOwn ? 'Вы' : note.authorName ?? 'Участник группы'}</span>
                      {note.visibility === 'lecturers' ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">
                          только лекторам
                        </span>
                      ) : null}
                      {isOwn ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteShared(note.id)}
                          className="text-muted transition hover:text-rose-600"
                        >
                          Удалить
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>

      <AskLectureQuestionModal
        isOpen={isAskOpen}
        onClose={() => setIsAskOpen(false)}
        courseId={courseId}
        periodId={periodId}
        periodTitle={periodTitle}
      />
    </Section>
  );
}
