import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Section } from '../../../components/ui/Section';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useMyGroups } from '../../../hooks/useMyGroups';
import {
  useLessonQuestions,
  useLectureQuestionActions,
} from '../../../hooks/useLectureQuestions';
import { AskLectureQuestionModal } from './AskLectureQuestionModal';
import { debugError } from '../../../lib/debug';
import { formatTimestampMs } from '../../../lib/formatTimestamp';
import type { LectureQuestion } from '../../../types/lectureQuestions';

interface LessonQuestionsSectionProps {
  courseId: string;
  periodId?: string;
  periodTitle: string;
}

function buildStudyLink(pathname: string, question: LectureQuestion) {
  if (!question.videoId || question.startMs === null) {
    return null;
  }

  const seconds = Math.floor(question.startMs / 1000);
  return `${pathname}?study=1&video=${encodeURIComponent(question.videoId)}&panel=notes&t=${seconds}`;
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
  const { deleteQuestion } = useLectureQuestionActions();
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
