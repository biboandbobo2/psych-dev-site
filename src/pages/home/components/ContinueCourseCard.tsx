import { NavLink, useNavigate } from 'react-router-dom';
import { useCourseStore } from '../../../stores';
import type { CourseType } from '../../../types/tests';
import { getCourseIntroPath } from '../utils';

export interface ContinueCourse {
  id: string;
  name: string;
  icon?: string;
  continuePath: string;
  lessonTitle: string;
  progress: { completed: number; total: number; percent: number };
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
            <p className="mt-2 text-sm text-muted">Лекция: {course.lessonTitle}</p>
            <p className="mt-1 text-xs font-semibold text-accent">
              {course.resumeTimeLabel ?? 'Продолжим с последнего урока'}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <NavLink
              to={course.continuePath}
              onClick={(event) => {
                event.stopPropagation();
                setCurrentCourse(course.id as CourseType);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-accent/30 bg-accent-100 px-5 py-2.5 text-sm font-semibold text-accent transition hover:bg-accent-100/70"
            >
              ▶ Продолжить
            </NavLink>
            <div className="rounded-xl border border-border bg-card2 px-3 py-2 text-right">
              <p className="text-lg font-bold leading-none text-fg">{course.progress.percent}%</p>
              <p className="mt-1 text-[11px] text-muted">
                {course.progress.total > 0
                  ? `${course.progress.completed}/${course.progress.total} занятий`
                  : `${course.progress.completed} занятий`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
