import { useNavigate } from 'react-router-dom';
import { getCourseIntroPath } from '../utils';

interface CatalogCourse {
  id: string;
  name: string;
  icon?: string;
}

interface CatalogCourseCardProps {
  course: CatalogCourse;
  isOpen: boolean;
  onOpenLessons: (courseId: string) => void;
}

/** Карточка курса в секции «Каталог платформы» (квадратная). */
export function CatalogCourseCard({ course, isOpen, onOpenLessons }: CatalogCourseCardProps) {
  const navigate = useNavigate();

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={() => navigate(getCourseIntroPath(course.id))}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          navigate(getCourseIntroPath(course.id));
        }
      }}
      className="flex aspect-square cursor-pointer flex-col justify-between rounded-xl border border-border bg-card2 p-4 transition hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
      aria-label={`Открыть главную страницу курса «${course.name}»`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-3xl" aria-hidden>
          {course.icon || '🎓'}
        </span>
        {isOpen ? (
          <span className="inline-flex shrink-0 items-center rounded-full bg-accent-100 px-2 py-0.5 text-[10px] font-semibold text-accent">
            Открытый
          </span>
        ) : null}
      </div>
      <div>
        <h4 className="line-clamp-3 text-sm font-semibold leading-tight text-fg">{course.name}</h4>
        <p className="mt-1 text-xs text-muted">Курс платформы</p>
      </div>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onOpenLessons(course.id);
        }}
        className="self-start rounded-md text-xs font-semibold text-accent transition hover:text-[#1F4D22]"
      >
        Занятия →
      </button>
    </article>
  );
}
