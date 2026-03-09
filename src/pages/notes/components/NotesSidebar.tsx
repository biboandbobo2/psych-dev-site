import { cn } from '../../../lib/cn';
import type { CourseOption } from '../../../hooks/useCourses';
import type { PublishedLessonOption } from '../../../hooks/usePublishedLessonOptions';

interface NotesSidebarProps {
  activeCourseId: string;
  activeLessonKey: 'all' | string;
  courses: CourseOption[];
  lessons: PublishedLessonOption[];
  onCourseSelect: (courseId: string) => void;
  onLessonSelect: (periodKey: 'all' | string) => void;
}

export function NotesSidebar({
  activeCourseId,
  activeLessonKey,
  courses,
  lessons,
  onCourseSelect,
  onLessonSelect,
}: NotesSidebarProps) {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-brand sm:p-5">
        <div className="mb-3 space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Курсы</p>
          <p className="text-xs text-muted">Контекст заметок переключается вместе с курсом.</p>
        </div>
        <div className="flex flex-col gap-2">
          {courses.map((course) => (
            <button
              key={course.id}
              type="button"
              onClick={() => onCourseSelect(course.id)}
              aria-pressed={activeCourseId === course.id}
              className={cn(
                'flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20',
                activeCourseId === course.id
                  ? 'border-accent/30 bg-accent-100 text-accent shadow-sm'
                  : 'border-transparent text-muted hover:bg-card2 hover:text-fg'
              )}
            >
              <span className="text-lg" aria-hidden>
                {course.icon}
              </span>
              <span className="block whitespace-normal break-words">{course.name}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-brand sm:p-5">
        <div className="mb-3 space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Занятия курса</p>
          <p className="text-xs text-muted">Выберите конкретное занятие или смотрите все заметки курса.</p>
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => onLessonSelect('all')}
            aria-pressed={activeLessonKey === 'all'}
            className={cn(
              'rounded-2xl border px-4 py-3 text-left text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20',
              activeLessonKey === 'all'
                ? 'border-accent/30 bg-accent-100 text-accent shadow-sm'
                : 'border-transparent text-muted hover:bg-card2 hover:text-fg'
            )}
          >
            Все занятия
          </button>

          {lessons.length === 0 ? (
            <p className="px-2 py-2 text-sm text-muted">У выбранного курса пока нет опубликованных занятий.</p>
          ) : (
            lessons.map((lesson) => (
              <button
                key={lesson.periodKey}
                type="button"
                onClick={() => onLessonSelect(lesson.periodKey)}
                aria-pressed={activeLessonKey === lesson.periodKey}
                className={cn(
                  'rounded-2xl border px-4 py-3 text-left text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20',
                  activeLessonKey === lesson.periodKey
                    ? 'border-accent/30 bg-accent-100 text-accent shadow-sm'
                    : 'border-transparent text-muted hover:bg-card2 hover:text-fg'
                )}
              >
                <span className="block whitespace-normal break-words">{lesson.periodTitle}</span>
              </button>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
