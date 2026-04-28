import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { orderBy, query, getDocs } from 'firebase/firestore';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { TestEditorModal } from '../components/TestEditorModal';
import { CreateLessonModal } from '../components/CreateLessonModal';
import { debugError, debugLog } from '../lib/debug';
import { useCourseStore } from '../stores';
import { useReorderLessons } from '../hooks/useReorderLessons';
import {
  getCourseLessonsCollectionRef,
  mapCanonicalCourseLessons,
} from '../lib/courseLessons';
import { isCoreCourse } from '../constants/courses';
import { useCourses } from '../hooks/useCourses';
import { useActiveCourse } from '../hooks/useActiveCourse';
import { useMyAnnouncementGroups } from '../hooks/useMyAnnouncementGroups';
import { useAuthStore } from '../stores/useAuthStore';
import { canEditCourse } from '../types/user';
import type { CourseType } from '../types/tests';
import { AdminContentHeader } from './admin/content/AdminContentHeader';
import { AdminContentToolbar } from './admin/content/AdminContentToolbar';
import { SortableItem } from './admin/content/SortableItem';
import { mergeCoreCoursePlaceholders } from './admin/content/mergeCoreCoursePlaceholders';
import type { AdminPeriod } from './admin/content/types';

export default function AdminContent() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { setCurrentCourse } = useCourseStore();
  const { courses, loading: coursesLoading } = useCourses({ includeUnpublished: true });
  const [periods, setPeriods] = useState<AdminPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTestEditor, setShowTestEditor] = useState(false);
  const [showCreateLesson, setShowCreateLesson] = useState(false);
  const { reorderLessons, saving } = useReorderLessons();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Синхронизация активного курса с URL / navigation state / referrer.
  useEffect(() => {
    const courseParam = searchParams.get('course');
    if (courseParam) {
      setCurrentCourse(courseParam as CourseType);
      return;
    }

    const stateC = (location.state as { course?: unknown } | null)?.course;
    if (typeof stateC === 'string' && stateC.trim()) {
      setCurrentCourse(stateC as CourseType);
      return;
    }

    if (typeof document !== 'undefined' && document.referrer) {
      if (document.referrer.includes('/clinical/')) {
        setCurrentCourse('clinical');
        return;
      }
      if (document.referrer.includes('/general/')) {
        setCurrentCourse('general');
      }
    }
  }, [searchParams, location.state, setCurrentCourse]);

  const activeCourse = useActiveCourse(courses, coursesLoading);
  const isCore = isCoreCourse(activeCourse);
  const userRole = useAuthStore((s) => s.userRole);
  const adminEditableCourses = useAuthStore((s) => s.adminEditableCourses);
  const { groups: myAnnouncementGroups } = useMyAnnouncementGroups();
  const canEditActiveCourse = canEditCourse(userRole, adminEditableCourses, activeCourse);
  const canWriteAnnouncements =
    userRole === 'super-admin' || myAnnouncementGroups.length > 0;
  const loadRequestId = useRef(0);

  const loadPeriods = async (courseId: string = activeCourse) => {
    const requestId = ++loadRequestId.current;
    try {
      setLoading(true);
      const lessonsRef = getCourseLessonsCollectionRef(courseId);
      const q = query(lessonsRef, orderBy('order', 'asc'));
      const snapshot = await getDocs(q);
      const data = mapCanonicalCourseLessons(courseId, snapshot.docs).map(
        ({ sourceDocId: _drop, ...period }) => period,
      ) as AdminPeriod[];

      const combined = mergeCoreCoursePlaceholders(courseId, data, {
        isCore: isCoreCourse(courseId),
      });

      if (requestId === loadRequestId.current) {
        setPeriods(combined);
      }
    } catch (err) {
      debugError('Error loading periods:', err);
      const message = err instanceof Error ? err.message : String(err);
      alert('Failed to load periods: ' + message);
    } finally {
      if (requestId === loadRequestId.current) {
        setLoading(false);
      }
    }
  };

  // Перезагружаем данные при смене курса
  useEffect(() => {
    loadPeriods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCourse]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = periods.findIndex((p) => p.period === active.id);
    const newIndex = periods.findIndex((p) => p.period === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const activePeriod = periods[oldIndex];
    const overPeriod = periods[newIndex];

    debugLog('handleDragEnd details', {
      activeId: active.id,
      overId: over.id,
      activePeriod: { id: activePeriod?.period, isPlaceholder: activePeriod?.isPlaceholder },
      overPeriod: { id: overPeriod?.period, isPlaceholder: overPeriod?.isPlaceholder },
    });

    if (activePeriod?.isPlaceholder || overPeriod?.isPlaceholder) {
      debugLog('Drag cancelled: placeholder involved');
      return;
    }

    // Оптимистично переставляем UI и пересчитываем order для не-placeholder периодов.
    const newPeriods = arrayMove(periods, oldIndex, newIndex);
    setPeriods(newPeriods);

    const realPeriods = newPeriods.filter((p) => !p.isPlaceholder);
    const newOrder = realPeriods.map((p, index) => ({
      periodId: p.period,
      order: index,
    }));

    debugLog('Saving new order', {
      totalPeriods: newPeriods.length,
      realPeriods: realPeriods.length,
      newOrder: newOrder.map((o) => o.periodId),
    });

    const result = await reorderLessons(activeCourse, newOrder);
    if (!result.success) {
      alert('Не удалось сохранить порядок: ' + result.error);
      loadPeriods();
    }
  };

  if (loading || coursesLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-20 bg-gray-200 rounded" />
          <div className="h-20 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <AdminContentHeader
        activeCourse={activeCourse}
        canEditActiveCourse={canEditActiveCourse}
        canWriteAnnouncements={canWriteAnnouncements}
      />

      <AdminContentToolbar
        saving={saving}
        canEditActiveCourse={canEditActiveCourse}
        onCreateLesson={() => setShowCreateLesson(true)}
        onCreateTest={() => setShowTestEditor(true)}
      />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={periods.map((p) => p.period)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {periods.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                <p>Периоды не найдены.</p>
              </div>
            ) : (
              periods.map((period) => (
                <SortableItem
                  key={period.period}
                  period={period}
                  currentCourse={activeCourse}
                  canEdit={canEditActiveCourse}
                />
              ))
            )}
          </div>
        </SortableContext>
      </DndContext>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
        <p className="text-sm text-blue-700">
          💡 <strong>Совет:</strong>{' '}
          Перетащите{' '}
          {isCore ? (activeCourse === 'development' ? 'период' : 'тему') : 'занятие'}, чтобы
          изменить порядок. Нажмите на карандаш ✏️ для редактирования содержимого.
        </p>
      </div>

      {showTestEditor && (
        <TestEditorModal
          onClose={() => setShowTestEditor(false)}
          defaultCourse={isCore ? activeCourse : 'development'}
        />
      )}

      {showCreateLesson && (
        <CreateLessonModal
          onClose={() => {
            setShowCreateLesson(false);
            loadPeriods();
          }}
          defaultCourse={activeCourse}
        />
      )}
    </div>
  );
}
