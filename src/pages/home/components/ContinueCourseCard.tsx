import { NavLink, useNavigate } from 'react-router-dom';
import { useCourseStore } from '../../../stores';
import type { CourseType } from '../../../types/tests';
import { useCourseNavItems } from '../../../hooks/useCourseNavItems';
import { calculateCourseProgress } from '../../../lib/courseProgress/calculateCourseProgress';
import { getCourseLessonPath } from '../../../lib/courseNavItems';
import { isCoreCourse } from '../../../constants/courses';
import { getCourseIntroPath } from '../utils';

export interface ContinueCourse {
  id: string;
  name: string;
  icon?: string;
  continuePath: string;
  /** Есть ли сохранённый последний урок или точка видео. */
  started: boolean;
  lessonTitle: string;
  watchedLessonIds: Set<string>;
  resumeTimeLabel: string | null;
}

interface ContinueCourseCardProps {
  course: ContinueCourse;
  streamLabel: string;
  onOpenLessons: (courseId: string) => void;
}

/**
 * Большая карточка «Курс потока» / «Мой курс» на главной: иконка-кнопка
 * списка занятий слева, заголовок курса с прогрессом и CTA «Продолжить» справа.
 */
export function ContinueCourseCard({ course, streamLabel, onOpenLessons }: ContinueCourseCardProps) {
  const navigate = useNavigate();
  const { setCurrentCourse } = useCourseStore();
  const { lessons, loading } = useCourseNavItems(course.id);
  // Пока список занятий не загружен — блок процента не показываем (без мигания «0%»).
  const progress =
    lessons.length === 0 && loading
      ? null
      : calculateCourseProgress({
          lessons: lessons.map((lesson) => ({ period: lesson.id })),
          watchedLessonIds: course.watchedLessonIds,
        });
  // Курс не начат — ведём в первую лекцию. У динамических курсов `intro` —
  // страница «О курсе», а не лекция (как в DynamicCoursePeriodPage).
  const firstLesson = course.started
    ? null
    : [...lessons]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .find((lesson) => isCoreCourse(course.id) || lesson.id !== 'intro');
  const ctaPath = firstLesson ? getCourseLessonPath(course.id, firstLesson.id) : course.continuePath;
  const lessonTitle = firstLesson?.title ?? course.lessonTitle;

  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-card shadow-brand transition">
      <div className="grid h-full auto-rows-fr grid-cols-[104px_minmax(0,1fr)] sm:grid-cols-[200px_minmax(0,1fr)]">
        <button
          type="button"
          onClick={() => onOpenLessons(course.id)}
          className="relative flex h-full items-center justify-center bg-[#CFEAD0] p-4 transition hover:bg-[#A8D6AA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          aria-label={`Открыть список занятий курса «${course.name}»`}
        >
          <span className="text-[44px] sm:text-[64px]" aria-hidden>
            {course.icon || '📘'}
          </span>
          <span className="absolute bottom-2 left-3 text-[10px] font-medium uppercase tracking-[0.12em] text-[#1F4D22]/70 sm:bottom-3">
            Список занятий
          </span>
        </button>
        <div
          role="link"
          tabIndex={0}
          onClick={() => navigate(getCourseIntroPath(course.id))}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              navigate(getCourseIntroPath(course.id));
            }
          }}
          className="flex min-w-0 cursor-pointer flex-col justify-between gap-3 p-5 transition group-hover:bg-accent-100/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
          aria-label={`Открыть главную страницу курса «${course.name}»`}
        >
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              {streamLabel}
            </p>
            <h2 className="mt-1 break-words text-xl font-bold leading-tight text-fg sm:text-3xl">
              {course.name}
            </h2>
            <p className="mt-2 text-sm text-muted">Лекция: {lessonTitle}</p>
            <p className="mt-1 text-xs font-semibold text-accent">
              {course.started
                ? course.resumeTimeLabel ?? 'Продолжим с последнего урока'
                : 'Курс ещё не начат'}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <NavLink
              to={ctaPath}
              onClick={(event) => {
                event.stopPropagation();
                setCurrentCourse(course.id as CourseType);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-accent/30 bg-accent-100 px-5 py-2.5 text-sm font-semibold text-accent transition hover:bg-accent-100/70"
            >
              {course.started ? '▶ Продолжить' : '▶ Смотреть первую лекцию'}
            </NavLink>
            {progress ? (
              <div className="rounded-xl border border-border bg-card2 px-3 py-2 text-right">
                <p className="text-lg font-bold leading-none text-fg">{progress.percent}%</p>
                <p className="mt-1 text-[11px] text-muted">
                  {`${progress.completed}/${progress.total} занятий`}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
