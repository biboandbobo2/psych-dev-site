import { useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import type { CourseType } from '../types/tests';
import { useCourseStore } from '../stores/useCourseStore';
import { cn } from '../lib/cn';

type CourseOption = {
  id: CourseType;
  name: string;
  icon: string;
};

const COURSE_OPTIONS: CourseOption[] = [
  { id: 'development', name: 'Психология развития', icon: '👶' },
  { id: 'clinical', name: 'Клиническая психология', icon: '🧠' },
  { id: 'general', name: 'Общая психология', icon: '📚' },
];

const isCourseType = (value: string | null): value is CourseType =>
  value === 'development' || value === 'clinical' || value === 'general';

export default function AdminCourseSidebar() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentCourse, setCurrentCourse } = useCourseStore();

  const courseParam = searchParams.get('course');
  const queryCourse = isCourseType(courseParam) ? courseParam : null;
  const activeCourse = queryCourse ?? currentCourse;

  useEffect(() => {
    if (queryCourse && queryCourse !== currentCourse) {
      setCurrentCourse(queryCourse);
    }
  }, [queryCourse, currentCourse, setCurrentCourse]);

  const handleCourseSelect = (courseId: CourseType) => {
    setCurrentCourse(courseId);
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
      <nav className="flex flex-col gap-2">
        {COURSE_OPTIONS.map((course) => {
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
    </div>
  );
}
