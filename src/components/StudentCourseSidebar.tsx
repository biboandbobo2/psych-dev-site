import { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getDocs, orderBy, query } from 'firebase/firestore';
import { cn } from '../lib/cn';
import { useCourses } from '../hooks/useCourses';
import { useCourseStore } from '../stores';
import { useActiveCourse } from '../hooks/useActiveCourse';
import type { CourseType } from '../types/tests';
import { prefetchDynamicCourseLessons } from '../hooks/useDynamicCourseLessons';
import { isCoreCourse } from '../constants/courses';
import { debugWarn } from '../lib/debug';
import {
  getCourseLessonsCollectionRef,
  mapCanonicalCourseLessons,
  sortCourseLessonItems,
} from '../lib/courseLessons';
import { CLINICAL_ROUTE_CONFIG, GENERAL_ROUTE_CONFIG } from '../routes';
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

export default function StudentCourseSidebar({
  navItems,
  courseNavigationLoading = false,
  courseNavigationError = null,
}: StudentCourseSidebarProps) {
  const { courses, loading } = useCourses();
  const { setCurrentCourse } = useCourseStore();
  const activeCourse = useActiveCourse(courses, loading);
  const navigate = useNavigate();

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

  const getCoreCourseStartPath = (courseId: string): string | null => {
    if (courseId === 'development') return '/development/intro';
    if (courseId === 'clinical') return CLINICAL_ROUTE_CONFIG[0]?.path ?? '/clinical/intro';
    if (courseId === 'general') return GENERAL_ROUTE_CONFIG[0]?.path ?? '/general/intro';
    return null;
  };

  const resolveCourseStartPath = async (courseId: string): Promise<string | null> => {
    const coreStartPath = getCoreCourseStartPath(courseId);
    if (coreStartPath) {
      return coreStartPath;
    }

    const lessonsRef = getCourseLessonsCollectionRef(courseId);
    const snapshot = await getDocs(query(lessonsRef, orderBy('order', 'asc')));
    const canonicalLessons = mapCanonicalCourseLessons(courseId, snapshot.docs)
      .filter((lesson) => lesson.published !== false);
    const sortedLessons = sortCourseLessonItems(courseId, canonicalLessons);
    if (!sortedLessons.length) {
      return null;
    }

    const introLesson = sortedLessons.find((lesson) => lesson.period === 'intro');
    const targetLesson = introLesson ?? sortedLessons[0];
    return `/course/${encodeURIComponent(courseId)}/${encodeURIComponent(targetLesson.period)}`;
  };

  const handleCourseSelect = async (courseId: string) => {
    setCurrentCourse(courseId as CourseType);

    try {
      const startPath = await resolveCourseStartPath(courseId);
      if (!startPath) {
        return;
      }
      navigate(startPath);
    } catch (error) {
      debugWarn('[StudentCourseSidebar] Failed to resolve course start path', error);
    }
  };

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
              onClick={() => {
                void handleCourseSelect(course.id);
              }}
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
