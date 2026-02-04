import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import type { CourseType } from '../types/tests';
import { useCourseStore } from '../stores/useCourseStore';
import { cn } from '../lib/cn';
import { useCourses } from '../hooks/useCourses';
import CreateCourseModal from './CreateCourseModal';
import { db } from '../lib/firebase';
import { debugError } from '../lib/debug';

export default function AdminCourseSidebar() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentCourse, setCurrentCourse } = useCourseStore();
  const { courses, loading: coursesLoading, reload } = useCourses({ includeUnpublished: true });
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editingCourseName, setEditingCourseName] = useState('');
  const [renamingCourseId, setRenamingCourseId] = useState<string | null>(null);
  const [renameError, setRenameError] = useState<string | null>(null);

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

  const startRename = (courseId: string, currentName: string) => {
    setEditingCourseId(courseId);
    setEditingCourseName(currentName);
    setRenameError(null);
  };

  const cancelRename = () => {
    setEditingCourseId(null);
    setEditingCourseName('');
    setRenameError(null);
  };

  const saveCourseName = async (courseId: string) => {
    const trimmedName = editingCourseName.trim();
    if (!trimmedName) {
      setRenameError('Название курса не может быть пустым');
      return;
    }

    try {
      setRenamingCourseId(courseId);
      setRenameError(null);
      await setDoc(
        doc(db, 'courses', courseId),
        {
          name: trimmedName,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      await reload();
      cancelRename();
    } catch (error) {
      debugError('Failed to rename course', error);
      setRenameError('Не удалось сохранить название курса');
    } finally {
      setRenamingCourseId(null);
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
          const isEditing = editingCourseId === course.id;
          const isRenaming = renamingCourseId === course.id;

          if (isEditing) {
            return (
              <div key={course.id} className="rounded-2xl border border-accent/30 bg-accent-100/70 p-3 space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                  Переименовать курс
                </label>
                <input
                  type="text"
                  value={editingCourseName}
                  onChange={(event) => {
                    setEditingCourseName(event.target.value);
                    setRenameError(null);
                  }}
                  className="w-full rounded-xl border border-accent/20 bg-white px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
                  placeholder="Название курса"
                  autoFocus
                />
                {renameError && <p className="text-xs text-red-600">{renameError}</p>}
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={cancelRename}
                    disabled={isRenaming}
                    className="rounded-lg border border-border/70 px-3 py-1.5 text-xs text-muted transition hover:bg-card2 disabled:opacity-50"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={() => saveCourseName(course.id)}
                    disabled={isRenaming}
                    className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                  >
                    {isRenaming ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={course.id}
              className={cn(
                'flex items-center gap-2 rounded-2xl border px-2 py-2 transition-colors',
                isActive
                  ? 'bg-accent-100 border-accent/30 shadow-sm'
                  : 'border-transparent hover:bg-card2'
              )}
            >
              <button
                type="button"
                onClick={() => handleCourseSelect(course.id)}
                aria-pressed={isActive}
                className={cn(
                  'flex flex-1 items-center gap-3 rounded-xl px-2 py-1.5 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20',
                  isActive ? 'text-accent' : 'text-muted hover:text-fg'
                )}
              >
                <span className="text-base" aria-hidden>
                  {course.icon}
                </span>
                <span className="truncate">{course.name}</span>
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  startRename(course.id, course.name);
                }}
                className="rounded-lg px-2 py-1 text-sm text-muted transition hover:bg-white hover:text-fg"
                title={`Переименовать курс ${course.name}`}
                aria-label={`Переименовать курс ${course.name}`}
              >
                ✏️
              </button>
            </div>
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
