import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useCourses } from '../../../hooks/useCourses';
import {
  useCourseQuestions,
  useLectureQuestionActions,
} from '../../../hooks/useLectureQuestions';
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
  const { deleteQuestion } = useLectureQuestionActions();

  const byPeriod = useMemo(() => {
    const map = new Map<string, { title: string; items: LectureQuestion[] }>();
    for (const question of questions) {
      const entry = map.get(question.periodId) ?? {
        title: question.periodTitle ?? question.periodId,
        items: [],
      };
      entry.items.push(question);
      map.set(question.periodId, entry);
    }
    return [...map.entries()];
  }, [questions]);

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
          {byPeriod.map(([periodId, { title, items }]) => (
            <section key={periodId}>
              <h2 className="mb-3 text-lg font-semibold">
                {title}
                <span className="ml-2 text-sm font-normal text-gray-400">{items.length}</span>
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
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
