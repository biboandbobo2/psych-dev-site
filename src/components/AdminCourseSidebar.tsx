import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import type { CourseType } from '../types/tests';
import { useCourseStore } from '../stores/useCourseStore';
import { cn } from '../lib/cn';
import { useCourses } from '../hooks/useCourses';
import CreateCourseModal from './CreateCourseModal';

export default function AdminCourseSidebar() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentCourse, setCurrentCourse } = useCourseStore();
  const { courses, loading: coursesLoading, reload } = useCourses({ includeUnpublished: true });
  const [showCreateCourse, setShowCreateCourse] = useState(false);

  const courseParam = searchParams.get('course');
  const queryCourse = courseParam && courseParam.trim() ? courseParam : null;
  const activeCourse =
    courses.find((courseOption) => courseOption.id === currentCourse)?.id ??
    currentCourse ??
    courses[0]?.id ??
    'development';

  useEffect(() => {
    if (queryCourse && queryCourse !== currentCourse) {
      setCurrentCourse(queryCourse as CourseType);
    }
  }, [queryCourse, currentCourse, setCurrentCourse]);

  useEffect(() => {
    if (coursesLoading || !courses.length) return;
    const hasCurrent = courses.some((courseOption) => courseOption.id === currentCourse);
    if (!hasCurrent && courses[0]?.id) {
      setCurrentCourse(courses[0].id as CourseType);
    }
  }, [courses, coursesLoading, currentCourse, setCurrentCourse]);

  const handleCourseSelect = (courseId: string) => {
    setCurrentCourse(courseId as CourseType);
    const target = `/admin/content?course=${courseId}`;
    if (location.pathname !== '/admin/content' || location.search !== `?course=${courseId}`) {
      navigate(target);
    }
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-brand p-4 sm:p-5 space-y-4">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Редактор</p>
        <h3 className="text-lg font-semibold text-fg">Курсы</h3>
        <p className="text-xs text-muted">Выберите курс для редактуры материалов.</p>
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setShowCreateCourse(true)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-accent/30 bg-accent-100 px-4 py-2 text-sm font-semibold text-accent transition hover:bg-accent/20"
        >
          <span aria-hidden>➕</span>
          <span>Добавить курс</span>
        </button>
      </div>

      <nav className="flex flex-col gap-2">
        {courses.map((course) => {
          const isActive = activeCourse === course.id;
          return (
            <button
              key={course.id}
              type="button"
              onClick={() => handleCourseSelect(course.id)}
              aria-pressed={isActive}
              className={cn(
                'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20',
                isActive
                  ? 'bg-accent-100 text-accent border-accent/30 shadow-sm'
                  : 'border-transparent text-muted hover:text-fg hover:bg-card2'
              )}
            >
              <span className="text-base" aria-hidden>
                {course.icon}
              </span>
              <span>{course.name}</span>
            </button>
          );
        })}
      </nav>

      {showCreateCourse && (
        <CreateCourseModal
          onClose={() => setShowCreateCourse(false)}
          onCreated={(courseId) => {
            setShowCreateCourse(false);
            reload();
            setCurrentCourse(courseId as CourseType);
            navigate(`/admin/content?course=${courseId}`);
          }}
        />
      )}
    </div>
  );
}
