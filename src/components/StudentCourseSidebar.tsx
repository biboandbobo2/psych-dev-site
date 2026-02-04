import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../lib/cn';
import { useCourses } from '../hooks/useCourses';
import { useCourseStore } from '../stores';
import type { CourseType } from '../types/tests';

interface NavigationItem {
  path: string;
  label: string;
}

interface StudentCourseSidebarProps {
  navItems: NavigationItem[];
}

export default function StudentCourseSidebar({ navItems }: StudentCourseSidebarProps) {
  const { courses, loading } = useCourses();
  const { currentCourse, setCurrentCourse } = useCourseStore();

  const activeCourse =
    courses.find((courseOption) => courseOption.id === currentCourse)?.id ??
    currentCourse ??
    courses[0]?.id ??
    'development';

  useEffect(() => {
    if (loading || !courses.length) return;
    const hasCurrent = courses.some((courseOption) => courseOption.id === currentCourse);
    if (!hasCurrent && courses[0]?.id) {
      setCurrentCourse(courses[0].id as CourseType);
    }
  }, [courses, loading, currentCourse, setCurrentCourse]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/60 bg-card shadow-brand p-4 sm:p-5">
        <div className="mb-3 space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Курсы</p>
          <p className="text-xs text-muted">Выберите курс для навигации.</p>
        </div>
        <nav className="flex flex-col gap-2">
          {courses.map((course) => (
            <button
              key={course.id}
              type="button"
              onClick={() => setCurrentCourse(course.id as CourseType)}
              aria-pressed={activeCourse === course.id}
              disabled={loading}
              className={cn(
                'flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20',
                activeCourse === course.id
                  ? 'bg-accent-100 text-accent border-accent/30 shadow-sm'
                  : 'border-transparent text-muted hover:text-fg hover:bg-card2'
              )}
            >
              <span className="text-lg" aria-hidden>
                {course.icon}
              </span>
              <span className="block whitespace-normal break-words">{course.name}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card shadow-brand p-3 sm:p-4">
        <div className="mb-3 px-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Навигация курса</p>
        </div>
        {navItems.length === 0 ? (
          <p className="px-2 py-2 text-xs text-muted">Пока нет опубликованных занятий.</p>
        ) : (
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end
                className={({ isActive }) =>
                  cn(
                    'rounded-2xl border border-transparent px-4 py-3 text-base font-medium transition-colors',
                    isActive
                      ? 'bg-accent-100 text-accent border-accent/30 shadow-sm'
                      : 'text-muted hover:text-fg hover:bg-card2'
                  )
                }
              >
                <span className="block whitespace-normal break-words">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}
