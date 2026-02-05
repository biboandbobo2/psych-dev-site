import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { doc, getDocs, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore';
import type { CourseType } from '../types/tests';
import { useCourseStore } from '../stores/useCourseStore';
import { cn } from '../lib/cn';
import { useCourses } from '../hooks/useCourses';
import { useActiveCourse } from '../hooks/useActiveCourse';
import CreateCourseModal from './CreateCourseModal';
import { db } from '../lib/firebase';
import { debugError } from '../lib/debug';
import { getCourseLessonsCollectionRef } from '../lib/courseLessons';
import { canonicalizePeriodId } from '../lib/firestoreHelpers';
import { getCourseBasePath, isCoreCourse } from '../constants/courses';

interface LessonNavItem {
  id: string;
  label: string;
  order: number;
  published: boolean;
}

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
  const [lessonItems, setLessonItems] = useState<LessonNavItem[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);

  const courseParam = searchParams.get('course');
  const queryCourse = courseParam && courseParam.trim() ? courseParam : null;
  const activeCourse = useActiveCourse(courses, coursesLoading);
  const activeEditingCourse = useMemo(
    () => courses.find((courseOption) => courseOption.id === editingCourseId) ?? null,
    [courses, editingCourseId]
  );
  const activeLessonId = useMemo(() => {
    const match = location.pathname.match(/^\/admin\/content\/edit\/([^/?#]+)/);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  }, [location.pathname]);

  useEffect(() => {
    if (queryCourse && queryCourse !== currentCourse) {
      setCurrentCourse(queryCourse as CourseType);
    }
  }, [queryCourse, currentCourse, setCurrentCourse]);

  useEffect(() => {
    let isCancelled = false;

    const loadLessons = async () => {
      if (!activeCourse) {
        setLessonItems([]);
        return;
      }

      try {
        setLessonsLoading(true);
        const lessonsRef = getCourseLessonsCollectionRef(activeCourse);
        const snapshot = await getDocs(query(lessonsRef, orderBy('order', 'asc')));
        const map = new Map<string, LessonNavItem>();

        snapshot.docs.forEach((docSnap, index) => {
          const data = docSnap.data() as Record<string, unknown>;
          const lessonId = isCoreCourse(activeCourse)
            ? canonicalizePeriodId(docSnap.id)
            : docSnap.id;
          const current = map.get(lessonId);
          if (current) return;

          map.set(lessonId, {
            id: lessonId,
            label:
              (typeof data.title === 'string' && data.title.trim()) ||
              (typeof data.label === 'string' && data.label.trim()) ||
              lessonId,
            order: typeof data.order === 'number' ? data.order : index,
            published: data.published !== false,
          });
        });

        if (!isCancelled) {
          setLessonItems(
            [...map.values()].sort((a, b) => {
              if (a.order !== b.order) return a.order - b.order;
              return a.label.localeCompare(b.label, 'ru');
            })
          );
        }
      } catch (error) {
        if (!isCancelled) {
          debugError('Failed to load course lessons for sidebar', error);
          setLessonItems([]);
        }
      } finally {
        if (!isCancelled) {
          setLessonsLoading(false);
        }
      }
    };

    loadLessons();
    return () => {
      isCancelled = true;
    };
  }, [activeCourse]);

  const handleCourseSelect = (courseId: string) => {
    setCurrentCourse(courseId as CourseType);
    const target = `/admin/content?course=${courseId}`;
    if (location.pathname !== '/admin/content' || location.search !== `?course=${courseId}`) {
      navigate(target);
    }
  };

  const handleLessonSelect = (lessonId: string) => {
    navigate(`${getCourseBasePath(activeCourse)}${lessonId}`);
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

  const saveCourseName = async () => {
    if (!activeEditingCourse) return;

    const trimmedName = editingCourseName.trim();
    if (!trimmedName) {
      setRenameError('Название курса не может быть пустым');
      return;
    }

    try {
      setRenamingCourseId(activeEditingCourse.id);
      setRenameError(null);

      const updatePayload: Record<string, unknown> = {
        name: trimmedName,
        updatedAt: serverTimestamp(),
      };

      if (activeEditingCourse.isCore) {
        // Keep core docs queryable as explicit overrides in Firestore.
        updatePayload.order = activeEditingCourse.order;
        updatePayload.icon = activeEditingCourse.icon;
        updatePayload.published = true;
      }

      await setDoc(
        doc(db, 'courses', activeEditingCourse.id),
        updatePayload,
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
    <div className="space-y-4">
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
                <div
                  key={course.id}
                  className="rounded-2xl border border-accent/30 bg-accent-100/70 p-3"
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-2 inline-flex w-6 justify-center text-base" aria-hidden>
                      {course.icon}
                    </span>
                    <span className="mt-2 inline-flex w-6 justify-center text-sm text-accent" aria-hidden>
                      ✏️
                    </span>
                    <div className="min-w-0 flex-1 space-y-2">
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
                          onClick={saveCourseName}
                          disabled={isRenaming}
                          className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                        >
                          {isRenaming ? 'Сохранение...' : 'Сохранить'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={course.id}
                className={cn(
                  'flex items-center gap-2 rounded-2xl border px-3 py-2 transition-colors',
                  isActive
                    ? 'bg-accent-100 border-accent/30 shadow-sm'
                    : 'border-transparent hover:bg-card2'
                )}
              >
                <span className="inline-flex w-6 justify-center text-base" aria-hidden>
                  {course.icon}
                </span>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    startRename(course.id, course.name);
                  }}
                  className={cn(
                    'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sm transition',
                    isActive
                      ? 'text-accent hover:bg-accent/15'
                      : 'text-muted hover:bg-white hover:text-fg'
                  )}
                  title={`Переименовать курс ${course.name}`}
                  aria-label={`Переименовать курс ${course.name}`}
                >
                  ✏️
                </button>
                <button
                  type="button"
                  onClick={() => handleCourseSelect(course.id)}
                  aria-pressed={isActive}
                  className={cn(
                    'min-w-0 flex-1 rounded-xl px-2 py-1.5 text-left text-sm font-medium leading-snug transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20',
                    isActive ? 'text-accent' : 'text-muted hover:text-fg'
                  )}
                >
                  <span className="block whitespace-normal break-words">{course.name}</span>
                </button>
              </div>
            );
          })}
        </nav>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card shadow-brand p-3 sm:p-4">
        <div className="mb-3 px-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Навигация курса</p>
        </div>
        {lessonsLoading ? (
          <p className="px-2 py-2 text-xs text-muted">Загружаю занятия...</p>
        ) : lessonItems.length === 0 ? (
          <p className="px-2 py-2 text-xs text-muted">Пока нет занятий.</p>
        ) : (
          <nav className="flex flex-col gap-2">
            {lessonItems.map((lesson) => (
              <button
                key={lesson.id}
                type="button"
                onClick={() => handleLessonSelect(lesson.id)}
                className={cn(
                  'rounded-2xl border border-transparent px-4 py-3 text-left text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20',
                  activeLessonId === lesson.id
                    ? 'bg-accent-100 text-accent border-accent/30 shadow-sm'
                    : 'text-muted hover:text-fg hover:bg-card2'
                )}
              >
                <span className="block whitespace-normal break-words">{lesson.label}</span>
                {!lesson.published && (
                  <span className="mt-0.5 inline-block text-[10px] uppercase tracking-[0.16em] text-amber-700">
                    Черновик
                  </span>
                )}
              </button>
            ))}
          </nav>
        )}
      </div>

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
