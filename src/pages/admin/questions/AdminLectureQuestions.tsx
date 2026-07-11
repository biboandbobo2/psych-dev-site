import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useCourses } from '../../../hooks/useCourses';
import {
  useCourseQuestions,
  useLectureQuestionActions,
} from '../../../hooks/useLectureQuestions';
import {
  useCourseSharedNotes,
  useSharedLectureNoteActions,
} from '../../../hooks/useSharedLectureNotes';
import { GroupWatchStats } from './GroupWatchStats';
import type { SharedLectureNote } from '../../../types/sharedLectureNotes';
import { canEditCourse } from '../../../types/user';
import { debugError } from '../../../lib/debug';
import { formatTimestampMs } from '../../../lib/formatTimestamp';
import {
  ROUTE_BY_PERIOD,
  CLINICAL_ROUTE_BY_PERIOD,
  GENERAL_ROUTE_BY_PERIOD,
} from '../../../routes';
import type { LectureQuestion } from '../../../types/lectureQuestions';

const CORE_LOOKUPS: Record<string, Record<string, { path: string }>> = {
  development: ROUTE_BY_PERIOD,
  clinical: CLINICAL_ROUTE_BY_PERIOD,
  general: GENERAL_ROUTE_BY_PERIOD,
};

function buildLessonPath(courseId: string, periodId: string) {
  const corePath = CORE_LOOKUPS[courseId]?.[periodId]?.path;
  return corePath ?? `/course/${courseId}/${periodId}`;
}

function buildStudyLink(question: LectureQuestion) {
  const lessonPath = buildLessonPath(question.courseId, question.periodId);
  if (!question.videoId || question.startMs === null) {
    return lessonPath;
  }

  const seconds = Math.floor(question.startMs / 1000);
  return `${lessonPath}?study=1&video=${encodeURIComponent(question.videoId)}&panel=notes&t=${seconds}`;
}

export default function AdminLectureQuestions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const userRole = useAuthStore((s) => s.userRole);
  const adminEditableCourses = useAuthStore((s) => s.adminEditableCourses);
  const { courses } = useCourses({ includeUnpublished: true });

  const editableCourses = useMemo(
    () => courses.filter((course) => canEditCourse(userRole, adminEditableCourses, course.id)),
    [adminEditableCourses, courses, userRole]
  );

  const courseParam = searchParams.get('course');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(courseParam);

  useEffect(() => {
    if (selectedCourseId || editableCourses.length === 0) {
      return;
    }

    const fallback =
      editableCourses.find((course) => course.id === courseParam)?.id ?? editableCourses[0].id;
    setSelectedCourseId(fallback);
  }, [courseParam, editableCourses, selectedCourseId]);

  const canViewSelected =
    selectedCourseId !== null && canEditCourse(userRole, adminEditableCourses, selectedCourseId);
  const { questions, loading, error } = useCourseQuestions(canViewSelected ? selectedCourseId : null);
  const { sharedNotes } = useCourseSharedNotes(canViewSelected ? selectedCourseId : null);
  const { deleteQuestion } = useLectureQuestionActions();
  const { deleteSharedNote } = useSharedLectureNoteActions();

  const byPeriod = useMemo(() => {
    const map = new Map<
      string,
      { title: string; items: LectureQuestion[]; notes: SharedLectureNote[] }
    >();
    const entryFor = (periodId: string, periodTitle: string | null) => {
      const entry = map.get(periodId) ?? {
        title: periodTitle ?? periodId,
        items: [],
        notes: [],
      };
      map.set(periodId, entry);
      return entry;
    };

    for (const question of questions) {
      entryFor(question.periodId, question.periodTitle).items.push(question);
    }
    for (const note of sharedNotes) {
      entryFor(note.periodId, note.periodTitle).notes.push(note);
    }
    return [...map.entries()];
  }, [questions, sharedNotes]);

  const handleCourseChange = (courseId: string) => {
    setSelectedCourseId(courseId);
    setSearchParams({ course: courseId }, { replace: true });
  };

  const handleDelete = async (questionId: string) => {
    if (!confirm('Удалить вопрос?')) return;
    try {
      await deleteQuestion(questionId);
    } catch (err) {
      debugError('[AdminLectureQuestions] failed to delete question', err);
      alert('Не удалось удалить вопрос');
    }
  };

  const handleDeleteShared = async (shareId: string) => {
    if (!confirm('Удалить конспект?')) return;
    try {
      await deleteSharedNote(shareId);
    } catch (err) {
      debugError('[AdminLectureQuestions] failed to delete shared note', err);
      alert('Не удалось удалить конспект');
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl">Вопросы студентов</h1>
        {editableCourses.length > 1 ? (
          <select
            value={selectedCourseId ?? ''}
            onChange={(event) => handleCourseChange(event.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            aria-label="Курс"
          >
            {editableCourses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
        ) : null}
      </header>

      {canViewSelected && selectedCourseId ? (
        <div className="mb-8">
          <GroupWatchStats courseId={selectedCourseId} />
        </div>
      ) : null}

      {!canViewSelected ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Нет курсов, доступных вам для редактирования.
        </p>
      ) : loading ? (
        <p className="text-muted">Загружаем вопросы…</p>
      ) : error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Ошибка загрузки: {error}
        </p>
      ) : byPeriod.length === 0 ? (
        <p className="text-muted">По этому курсу пока нет вопросов.</p>
      ) : (
        <div className="space-y-8">
          {byPeriod.map(([periodId, { title, items, notes }]) => (
            <section key={periodId}>
              <h2 className="mb-3 text-lg font-semibold">
                {title}
                <span className="ml-2 text-sm font-normal text-gray-400">
                  {items.length > 0 ? `${items.length} вопр.` : ''}
                  {items.length > 0 && notes.length > 0 ? ' · ' : ''}
                  {notes.length > 0 ? `${notes.length} консп.` : ''}
                </span>
              </h2>
              <ul className="space-y-3">
                {items.map((question) => (
                  <li
                    key={question.id}
                    className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
                  >
                    <p className="text-sm leading-6 text-gray-900">{question.text}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span>{question.authorName ?? 'Без имени'}</span>
                      <span>{question.createdAt.toLocaleDateString('ru-RU')}</span>
                      {question.visibility === 'lecturers' ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">
                          только лекторам
                        </span>
                      ) : null}
                      <Link
                        to={buildStudyLink(question)}
                        className="text-blue-600 no-underline hover:underline"
                      >
                        {question.startMs !== null
                          ? `Открыть момент ${formatTimestampMs(question.startMs)}`
                          : 'Открыть занятие'}
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(question.id)}
                        className="text-gray-400 transition hover:text-rose-600"
                      >
                        Удалить
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              {notes.length > 0 ? (
                <div className="mt-4 space-y-3">
                  <h3 className="text-sm font-semibold text-gray-600">Конспекты студентов</h3>
                  <ul className="space-y-3">
                    {notes.map((note) => (
                      <li
                        key={note.id}
                        className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
                      >
                        <div className="space-y-1">
                          {note.segments.map((segment) => (
                            <p key={segment.id} className="text-sm leading-6 text-gray-900">
                              {segment.startMs !== null ? (
                                <span className="mr-2 text-xs font-medium text-gray-400">
                                  {formatTimestampMs(segment.startMs)}
                                </span>
                              ) : null}
                              {segment.text}
                            </p>
                          ))}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          <span>{note.authorName ?? 'Без имени'}</span>
                          <span>{note.createdAt.toLocaleDateString('ru-RU')}</span>
                          {note.visibility === 'lecturers' ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">
                              только лекторам
                            </span>
                          ) : null}
                          <Link
                            to={buildLessonPath(note.courseId, note.periodId)}
                            className="text-blue-600 no-underline hover:underline"
                          >
                            Открыть занятие
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDeleteShared(note.id)}
                            className="text-gray-400 transition hover:text-rose-600"
                          >
                            Удалить
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
