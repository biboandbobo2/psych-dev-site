import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams, useLocation, useNavigate } from "react-router-dom";
import { orderBy, query, getDocs } from "firebase/firestore";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ROUTE_CONFIG, CLINICAL_ROUTE_CONFIG, GENERAL_ROUTE_CONFIG } from "../routes";
import { getPeriodColors } from "../constants/periods";
import { TestEditorModal } from "../components/TestEditorModal";
import { CreateLessonModal } from "../components/CreateLessonModal";
import { debugError, debugLog } from "../lib/debug";
import { useCourseStore } from "../stores";
import { useReorderLessons } from "../hooks/useReorderLessons";
import {
  getCourseLessonsCollectionRef,
  getLessonRouteOrderMap,
  getCoreCourseRoutes,
  mapCanonicalCourseLessons,
  sortCourseLessonItems,
} from "../lib/courseLessons";
import { isCoreCourse } from "../constants/courses";
import { useCourses } from "../hooks/useCourses";
import { useActiveCourse } from "../hooks/useActiveCourse";
import { useMyAnnouncementGroups } from "../hooks/useMyAnnouncementGroups";
import { useAuthStore } from "../stores/useAuthStore";
import { canEditCourse } from "../types/user";
import type { CourseType } from "../types/tests";

interface Period {
  period: string;
  title: string;
  subtitle: string;
  published: boolean;
  order?: number;
  accent: string;
  isPlaceholder?: boolean;
  [key: string]: any;
}

const FALLBACK_PLACEHOLDER_TEXT = "Контент для этого возраста пока не создан.";

const ACTION_BUTTON_CLASS =
  "inline-flex w-full min-h-[44px] items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white transition shadow-sm whitespace-nowrap sm:min-w-[220px] sm:min-h-[52px] sm:px-5 sm:py-2.5 sm:text-base";

// Sortable item component
interface SortableItemProps {
  period: Period;
  currentCourse: CourseType;
  canEdit: boolean;
}

function SortableItem({ period, currentCourse, canEdit }: SortableItemProps) {
  const navigate = useNavigate();
  const isPlaceholder = Boolean(period.isPlaceholder);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: period.period,
    disabled: isPlaceholder || !canEdit,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };

  const colors = getPeriodColors(period.period);
  const isIntro = period.period === "intro";

  const handleClick = () => {
    if (!canEdit) return;
    navigate(`/admin/content/edit/${period.period}?course=${currentCourse}`);
  };

  const dragCursor = !canEdit
    ? 'cursor-not-allowed'
    : isPlaceholder
      ? 'cursor-default'
      : 'cursor-grab active:cursor-grabbing';

  return (
    <div
      ref={setNodeRef}
      style={style}
      title={canEdit ? undefined : 'Нет прав на редактирование этого курса'}
      className={`block rounded-lg shadow transition-shadow ${
        canEdit ? 'hover:shadow-lg' : 'opacity-60'
      } ${dragCursor} ${
        isIntro ? "bg-gradient-to-r from-yellow-400 to-yellow-500 text-white" : "bg-white"
      } ${isPlaceholder && !isIntro ? "border border-dashed border-blue-200 opacity-70" : ""} ${
        isDragging ? "shadow-xl ring-2 ring-blue-400" : ""
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center p-4">
        {/* Drag handle indicator */}
        <div className="flex flex-col gap-0.5 mr-3 text-gray-400">
          <span className="text-xs">⋮⋮</span>
        </div>
        <div
          className="w-2 h-16 rounded mr-4"
          style={{ backgroundColor: period.accent || colors.accent }}
        />
        <div className="flex-1" onClick={handleClick}>
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-lg font-bold">
              {isIntro ? `✨ ${period.title || "Вводное занятие"}` : period.title}
            </h3>
            <span
              className={`px-2 py-1 text-xs rounded ${
                period.published ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"
              }`}
            >
              {period.published ? "Опубликовано" : "Черновик"}
            </span>
            {!isIntro && isPlaceholder && (
              <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                Новый период
              </span>
            )}
          </div>
          {period.subtitle && (
            <p className={`text-sm mb-2 ${isIntro ? "text-yellow-100" : "text-gray-600"}`}>
              {period.subtitle}
            </p>
          )}
          <div className={`flex gap-4 text-xs ${isIntro ? "text-yellow-50" : "text-gray-500"}`}>
            <span>ID: {period.period}</span>
            <span>Порядок: {period.order}</span>
          </div>
        </div>
        <button
          onClick={handleClick}
          disabled={!canEdit}
          title={canEdit ? 'Редактировать' : 'Нет прав на редактирование этого курса'}
          className={`text-2xl ml-4 transition-transform ${
            !canEdit
              ? 'cursor-not-allowed text-gray-300'
              : `${isIntro ? 'text-white' : 'text-gray-400'} hover:scale-110`
          }`}
        >
          ✏️
        </button>
      </div>
    </div>
  );
}

export default function AdminContent() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { currentCourse, setCurrentCourse } = useCourseStore();
  const { courses, loading: coursesLoading } = useCourses({ includeUnpublished: true });
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTestEditor, setShowTestEditor] = useState(false);
  const [showCreateLesson, setShowCreateLesson] = useState(false);
  const { reorderLessons, saving } = useReorderLessons();

  // Sensors for drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Требуется сдвиг на 8px перед началом drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Синхронизация с URL параметром и navigation state при первой загрузке
  useEffect(() => {
    // 1. Проверяем URL параметр
    const courseParam = searchParams.get('course');
    if (courseParam) {
      setCurrentCourse(courseParam as CourseType);
      return;
    }

    // 2. Проверяем state из navigation
    const stateC = (location.state as any)?.course;
    if (typeof stateC === 'string' && stateC.trim()) {
      setCurrentCourse(stateC as CourseType);
      return;
    }

    // 3. Проверяем referrer из document
    if (typeof document !== 'undefined' && document.referrer) {
      if (document.referrer.includes('/clinical/')) {
        setCurrentCourse('clinical');
        return;
      }
      if (document.referrer.includes('/general/')) {
        setCurrentCourse('general');
        return;
      }
    }
  }, [searchParams, location.state, setCurrentCourse]);

  const activeCourse = useActiveCourse(courses, coursesLoading);
  const isCore = isCoreCourse(activeCourse);
  const userRole = useAuthStore((s) => s.userRole);
  const adminEditableCourses = useAuthStore((s) => s.adminEditableCourses);
  const { groups: myAnnouncementGroups } = useMyAnnouncementGroups();
  const canEditActiveCourse = canEditCourse(userRole, adminEditableCourses, activeCourse);
  // Активно для super-admin всегда; для admin — если он в announcementAdminIds
  // хотя бы одной группы (см. useMyAnnouncementGroups).
  const canWriteAnnouncements =
    userRole === 'super-admin' || myAnnouncementGroups.length > 0;
  const loadRequestId = useRef(0);

  const loadPeriods = async (courseId: string = activeCourse) => {
    const requestId = ++loadRequestId.current;
    try {
      setLoading(true);
      const lessonsRef = getCourseLessonsCollectionRef(courseId);
      const q = query(lessonsRef, orderBy("order", "asc"));
      const snapshot = await getDocs(q);
      const data = mapCanonicalCourseLessons(courseId, snapshot.docs).map(({ sourceDocId, ...period }) => period);

      if (isCoreCourse(courseId)) {
        const coreRoutes = getCoreCourseRoutes(courseId);
        const routeOrderMap = getLessonRouteOrderMap(courseId);
        const existingIds = new Set(data.map((period) => period.period));
        const introIds = new Set(["intro", "clinical-intro"]);
        const placeholderPeriods = coreRoutes.filter(
          (config) => config.periodId && !existingIds.has(config.periodId) && !introIds.has(config.periodId)
        ).map((config) => ({
          period: config.periodId!,
          title: config.navLabel,
          subtitle:
            config.placeholderText ||
            config.meta?.description ||
            FALLBACK_PLACEHOLDER_TEXT,
          published: false,
          order: routeOrderMap[config.periodId!] ?? Number.MAX_SAFE_INTEGER,
          accent: "",
          isPlaceholder: true,
        }));

        const combined = sortCourseLessonItems(courseId, [...data, ...placeholderPeriods], {
          draftsLast: true,
        });

        if (requestId === loadRequestId.current) {
          setPeriods(combined);
        }
      } else {
        const combined = sortCourseLessonItems(courseId, [...data], {
          draftsLast: true,
        });
        if (requestId === loadRequestId.current) {
          setPeriods(combined);
        }
      }
    } catch (err: any) {
      debugError("Error loading periods:", err);
      alert("Failed to load periods: " + (err?.message || err));
    } finally {
      if (requestId === loadRequestId.current) {
        setLoading(false);
      }
    }
  };

  // Перезагружаем данные при смене курса
  useEffect(() => {
    loadPeriods();
  }, [activeCourse]);


  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = periods.findIndex((p) => p.period === active.id);
    const newIndex = periods.findIndex((p) => p.period === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Защита: не обрабатываем drag с участием placeholder'ов
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

    // Оптимистичное обновление UI
    const newPeriods = arrayMove(periods, oldIndex, newIndex);
    setPeriods(newPeriods);

    // Пересчитываем order для всех элементов (только реальные, не placeholder)
    const realPeriods = newPeriods.filter((p) => !p.isPlaceholder);
    const newOrder = realPeriods.map((p, index) => ({
      periodId: p.period,
      order: index,
    }));

    debugLog('Saving new order', {
      totalPeriods: newPeriods.length,
      realPeriods: realPeriods.length,
      newOrder: newOrder.map(o => o.periodId),
    });

    // Сохраняем в Firestore
    const result = await reorderLessons(activeCourse, newOrder);
    if (!result.success) {
      // Откатываем при ошибке
      alert("Не удалось сохранить порядок: " + result.error);
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
      <header className="flex items-center justify-between gap-3 mb-2">
        <h1 className="text-2xl font-bold sm:text-3xl">Управление контентом</h1>
        <div className="flex items-center gap-2">
          {canEditActiveCourse ? (
            <Link
              to={`/admin/content/course-intro/${activeCourse}`}
              className="inline-flex items-center gap-2 rounded-lg bg-[#E8F0FA] px-4 py-2 text-[#1F4F86] transition-colors hover:bg-[#D5E4F5]"
              title="«О курсе»: Идея, Авторы, Программа"
            >
              <span className="text-lg" aria-hidden>✨</span>
              <span className="text-sm font-medium">О курсе</span>
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-gray-400"
              title="Нет прав на редактирование этого курса"
            >
              <span className="text-lg" aria-hidden>✨</span>
              <span className="text-sm font-medium">О курсе</span>
            </button>
          )}
          {canWriteAnnouncements ? (
            <Link
              to="/admin/announcements"
              className="inline-flex items-center gap-2 rounded-lg bg-purple-100 px-4 py-2 text-purple-900 transition-colors hover:bg-purple-200"
              title="Объявления и события для студентов"
            >
              <span className="text-lg" aria-hidden>📢</span>
              <span className="text-sm font-medium">Кабинет объявлений</span>
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-gray-400"
              title="Супер-админ должен назначить вас администратором объявлений в настройках группы"
            >
              <span className="text-lg" aria-hidden>📢</span>
              <span className="text-sm font-medium">Кабинет объявлений</span>
            </button>
          )}
        </div>
      </header>

      <Link
        to={canEditActiveCourse ? `/admin/content/course-intro/${activeCourse}` : '#'}
        onClick={(e) => {
          if (!canEditActiveCourse) e.preventDefault();
        }}
        className={`block rounded-xl border p-4 transition ${
          canEditActiveCourse
            ? 'border-[#C6D7EA] bg-[#F4F9FF] hover:bg-[#E8F0FA]'
            : 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-60'
        }`}
        title={canEditActiveCourse ? undefined : 'Нет прав на редактирование этого курса'}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span aria-hidden>✨</span>
              <span className={`text-sm font-semibold ${canEditActiveCourse ? 'text-[#1F4F86]' : 'text-gray-500'}`}>
                Вводная страница курса
              </span>
            </div>
            <p className={`mt-1 text-xs ${canEditActiveCourse ? 'text-[#556476]' : 'text-gray-400'}`}>
              Идея, авторы и программа — показываются на странице «О курсе» этого курса.
            </p>
          </div>
          <span className={`text-xl ${canEditActiveCourse ? 'text-[#1F4F86]' : 'text-gray-400'}`}>→</span>
        </div>
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          {saving && (
            <span className="text-sm text-blue-600 animate-pulse">
              Сохранение порядка...
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <button
            onClick={() => canEditActiveCourse && setShowCreateLesson(true)}
            disabled={!canEditActiveCourse}
            title={canEditActiveCourse ? undefined : 'Нет прав на редактирование этого курса'}
            className={`${ACTION_BUTTON_CLASS} ${
              canEditActiveCourse
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'cursor-not-allowed bg-gray-300 text-gray-500'
            }`}
          >
            <span aria-hidden>➕</span>
            <span>Добавить занятие</span>
          </button>

          <button
            onClick={() => setShowTestEditor(true)}
            className={`${ACTION_BUTTON_CLASS} bg-blue-600 hover:bg-blue-700`}
          >
            <span aria-hidden>📝</span>
            <span>Создать тест</span>
          </button>

          <Link
            to="/admin/topics"
            className={`${ACTION_BUTTON_CLASS} bg-green-600 hover:bg-green-700`}
          >
            <span aria-hidden>📚</span>
            <span>Темы заметок</span>
          </Link>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
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
          💡 <strong>Совет:</strong> Перетащите {isCore ? (activeCourse === 'development' ? 'период' : 'тему') : 'занятие'}, чтобы изменить порядок.
          Нажмите на карандаш ✏️ для редактирования содержимого.
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
            loadPeriods(); // Перезагружаем список после создания
          }}
          defaultCourse={activeCourse}
        />
      )}
    </div>
  );
}
