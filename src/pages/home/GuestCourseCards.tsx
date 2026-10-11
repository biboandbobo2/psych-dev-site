import { Link } from 'react-router-dom';
import type { CourseOption } from '../../hooks/useCourses';
import { courseLink, guestMeta, type GuestCourseMeta } from './guestLandingData';

function Cover({ meta, className }: { meta: GuestCourseMeta; className: string }) {
  return (
    <div className={`${meta.tone} ${className}`}>
      {meta.cover ? <img src={meta.cover} alt="" loading="lazy" className="h-full w-full rounded-none border-0 object-contain p-2.5 shadow-none" /> : null}
    </div>
  );
}

export function OpenCourseCard({ course }: { course: CourseOption }) {
  const meta = guestMeta(course);
  return (
    <article className="overflow-hidden rounded-[22px] border border-border bg-card sm:grid sm:grid-cols-[220px_minmax(0,1fr)]">
      <Cover meta={meta} className="h-[150px] sm:h-full sm:min-h-[220px]" />
      <div className="flex flex-col gap-2 p-4 sm:p-5">
        <span className="text-[11px] font-bold uppercase text-accent">
          ▶ Открытый доступ{meta.eyebrow ? ` · ${meta.eyebrow}` : ''}
        </span>
        <h4 className="text-[15px] font-bold leading-snug text-fg sm:text-[19px]">{meta.title}</h4>
        {meta.description ? <p className="text-[13.5px] text-ink-faint sm:text-sm">{meta.description}</p> : null}
        <Link
          to={courseLink(course.id)}
          className="mt-1 w-fit rounded-full bg-accent px-[18px] py-2.5 text-sm font-bold text-white transition hover:bg-accent-deep sm:mt-auto"
        >
          Смотреть сейчас →
        </Link>
      </div>
    </article>
  );
}

export function ProgramCourseCard({ course }: { course: CourseOption }) {
  const meta = guestMeta(course);
  return (
    <Link
      to={courseLink(course.id)}
      className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-2 text-fg transition hover:border-[#AEBBB8] sm:flex-col sm:items-stretch sm:gap-0 sm:overflow-hidden sm:rounded-[20px] sm:p-0"
    >
      <Cover meta={meta} className="h-16 w-16 flex-none overflow-hidden rounded-xl sm:h-[140px] sm:w-full sm:rounded-none" />
      <span className="flex flex-col gap-0.5 sm:flex-1 sm:gap-1.5 sm:p-4">
        <b className="text-[15px] font-bold leading-snug sm:text-base">{meta.title}</b>
        <small className="text-[12.5px] leading-snug text-ink-faint sm:text-[13px]">{meta.description}</small>
        <span className="mt-auto hidden pt-2 text-[13.5px] font-bold text-accent-deep sm:block">Посмотреть программу →</span>
      </span>
    </Link>
  );
}
