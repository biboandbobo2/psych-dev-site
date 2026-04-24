import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../lib/cn';
import { useCourses } from '../hooks/useCourses';
import { useActiveCourse } from '../hooks/useActiveCourse';
import { prefetchDynamicCourseLessons } from '../hooks/useDynamicCourseLessons';
import { isCoreCourse } from '../constants/courses';
import { debugWarn } from '../lib/debug';
import { Skeleton } from './ui/Skeleton';

interface NavigationItem {
  path: string;
  label: string;
}

interface StudentCourseSidebarProps {
  navItems: NavigationItem[];
  courseNavigationLoading?: boolean;
  courseNavigationError?: string | null;
}

function getCourseIntroPath(courseId: string): string {
  if (courseId === 'development' || courseId === 'clinical' || courseId === 'general') {
    return `/${courseId}/intro`;
  }
  return `/course/${encodeURIComponent(courseId)}/intro`;
}

export default function StudentCourseSidebar({
  navItems,
  courseNavigationLoading = false,
  courseNavigationError = null,
}: StudentCourseSidebarProps) {
  const { courses, loading } = useCourses();
  const activeCourse = useActiveCourse(courses, loading);

  useEffect(() => {
    if (loading) {
      return;
    }

    const dynamicCourseIds = courses
      .map((course) => course.id)
      .filter((courseId) => !isCoreCourse(courseId));

    if (!dynamicCourseIds.length) {
      return;
    }

    prefetchDynamicCourseLessons(dynamicCourseIds).catch((error) => {
      debugWarn('[StudentCourseSidebar] Failed to prefetch dynamic course lessons', error);
    });
  }, [courses, loading]);

  const introPath = activeCourse ? getCourseIntroPath(activeCourse) : null;

  return (
    <div className="space-y-4">
      {introPath ? (
        <NavLink
          to={introPath}
          end
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-2xl border px-4 py-3 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20',
              isActive
                ? 'border-accent/30 bg-accent-100 text-accent shadow-sm'
                : 'border-border/60 bg-card text-fg hover:bg-card2'
            )
          }
        >
          <span className="text-lg" aria-hidden>
            ℹ️
          </span>
          <span>О курсе</span>
        </NavLink>
      ) : null}

      <div className="rounded-2xl border border-border/60 bg-card p-3 shadow-brand sm:p-4">
        <div className="mb-3 px-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Занятия курса</p>
        </div>
        {courseNavigationError ? (
          <p className="px-2 py-2 text-xs text-destructive">Не удалось загрузить занятия курса.</p>
        ) : courseNavigationLoading ? (
          <div className="space-y-2 px-1">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : navItems.length === 0 ? (
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
                      ? 'border-accent/30 bg-accent-100 text-accent shadow-sm'
                      : 'text-muted hover:bg-card2 hover:text-fg'
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
