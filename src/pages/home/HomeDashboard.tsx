import { useMemo, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useCourses } from '../../hooks/useCourses';
import { useHomeFeed } from '../../hooks/useHomeFeed';
import { useCourseStore } from '../../stores';
import { useAuth } from '../../auth/AuthProvider';
import { getLastCourseLesson } from '../../lib/lastCourseLesson';
import { getWatchedLessonIds } from '../../lib/courseWatchedLessons';
import { buildCourseContinuePath, getCourseVideoResumePoint } from '../../lib/courseVideoResume';
import type { CourseType } from '../../types/tests';
import {
  resolvePrimaryLesson,
  getEstimatedCourseLessons,
  formatTimeFromSeconds,
  toDateKey,
  tryParseDateLabel,
  type ParsedCalendarEvent,
} from './homeHelpers';
import { EventsCalendarModal } from './EventsCalendarModal';
import { CourseLessonsDrawer } from './CourseLessonsDrawer';
import { useMyGroupsFeed } from '../../hooks/useMyGroupsFeed';
import { useMyGroups } from '../../hooks/useMyGroups';
import { GuestLanding } from './GuestLanding';
import { RegisteredGuestHome } from './RegisteredGuestHome';
import { useGuestStatus } from '../../hooks/useGuestStatus';
import { useCoursesOpenness } from '../../hooks/useCoursesOpenness';

export function HomeDashboard() {
  const { status } = useGuestStatus();
  if (status === 'unauthorized') {
    return <GuestLanding />;
  }
  if (status === 'registered-guest') {
    return <RegisteredGuestHome />;
  }
  return <StudentDashboard />;
}

function getCourseIntroPath(courseId: string): string {
  if (courseId === 'development') return '/development/intro';
  if (courseId === 'clinical') return '/clinical/intro';
  if (courseId === 'general') return '/general/intro';
  return `/course/${encodeURIComponent(courseId)}/intro`;
}

function StudentDashboard() {
  const { user } = useAuth();
  const { setCurrentCourse } = useCourseStore();
  const navigate = useNavigate();
  const { courses } = useCourses();
  const { groups: myGroups } = useMyGroups();
  const courseStreamLabel = myGroups.length > 0 ? 'Курс потока' : 'Мой курс';
  const { openCourseIds } = useCoursesOpenness(courses.map((course) => course.id));
  const {
    announcements,
    events,
    loading: feedLoading,
    error: feedError,
  } = useHomeFeed();
  const [isEventsCalendarOpen, setIsEventsCalendarOpen] = useState(false);
  const [calendarCursor, setCalendarCursor] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedCalendarDateKey, setSelectedCalendarDateKey] = useState<string | null>(null);
  const [lessonsDrawerCourseId, setLessonsDrawerCourseId] = useState<string | null>(null);

  const featuredSubjects = courses.slice(0, 4).map((course) => ({
    id: course.id,
    name: course.name,
    icon: course.icon,
  }));
  const fallbackSubjects = [
    { id: 'development', name: 'Психология развития', icon: '👶' },
    { id: 'clinical', name: 'Основы патопсихологии', icon: '🧠' },
    { id: 'general', name: 'Введение в клиническую психологию', icon: '📘' },
  ];
  const subjects = featuredSubjects.length >= 4
    ? featuredSubjects
    : [...featuredSubjects, ...fallbackSubjects.filter((item) => !featuredSubjects.some((course) => course.id === item.id))].slice(0, 4);

  const progressByCourse = useMemo(() => {
    const map = new Map<string, { completed: number; total: number; percent: number }>();
    subjects.forEach((course) => {
      const completed = getWatchedLessonIds(course.id).size;
      const total = getEstimatedCourseLessons(course.id);
      const percent = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
      map.set(course.id, { completed, total, percent });
    });
    return map;
  }, [subjects]);

  const primaryContinueCourses = useMemo(() => {
    const selectedCourses = (courses.length > 0 ? courses : subjects).slice(0, 2);

    return selectedCourses.map((course) => {
      const fallbackPrimaryLesson = resolvePrimaryLesson(course.id);
      const lastCourseLesson = getLastCourseLesson(course.id);
      const resumePoint = getCourseVideoResumePoint(course.id);
      const fallbackPath = lastCourseLesson?.path ?? fallbackPrimaryLesson.link;
      const continuePath = buildCourseContinuePath(course.id, fallbackPath);
      const lessonTitle = lastCourseLesson?.label ?? resumePoint?.lessonLabel ?? fallbackPrimaryLesson.title;
      const progress = progressByCourse.get(course.id) ?? { completed: 0, total: 0, percent: 0 };

      return {
        id: course.id,
        name: course.name,
        icon: course.icon,
        continuePath,
        lessonTitle,
        progress,
        resumeTimeLabel:
          resumePoint && resumePoint.timeSec > 0
            ? `Продолжим с ${formatTimeFromSeconds(resumePoint.timeSec)}`
            : null,
      };
    });
  }, [courses, progressByCourse, subjects]);

  const latestFeedItems = useMemo(
    () =>
      [
        ...announcements.map((item) => ({
          id: `announcement-${item.id}`,
          title: 'Объявление',
          text: item.text,
          createdAt: item.createdAt,
        })),
        ...events.map((item) => ({
          id: `event-${item.id}`,
          title: item.dateLabel,
          text: item.text,
          createdAt: item.createdAt,
        })),
      ]
        .sort((left, right) => (right.createdAt || '').localeCompare(left.createdAt || ''))
        .slice(0, 5),
    [announcements, events]
  );

  const parsedCalendarEvents = useMemo<ParsedCalendarEvent[]>(
    () =>
      events.map((event) => {
        const parsedDate = tryParseDateLabel(event.dateLabel) ?? null;
        return {
          id: event.id,
          text: event.text,
          dateLabel: event.dateLabel,
          parsedDate,
          dateKey: parsedDate ? toDateKey(parsedDate) : null,
        };
      }),
    [events]
  );

  const calendarEventsByDate = useMemo(() => {
    const map = new Map<string, ParsedCalendarEvent[]>();
    parsedCalendarEvents.forEach((event) => {
      if (!event.dateKey) return;
      const current = map.get(event.dateKey);
      if (current) {
        current.push(event);
      } else {
        map.set(event.dateKey, [event]);
      }
    });
    return map;
  }, [parsedCalendarEvents]);

  const undatedCalendarEvents = useMemo(
    () => parsedCalendarEvents.filter((event) => !event.dateKey),
    [parsedCalendarEvents]
  );

  const openEventsCalendar = () => {
    const firstDatedEvent = parsedCalendarEvents.find((event) => event.parsedDate);
    if (firstDatedEvent?.parsedDate) {
      setCalendarCursor(
        new Date(firstDatedEvent.parsedDate.getFullYear(), firstDatedEvent.parsedDate.getMonth(), 1)
      );
      if (!selectedCalendarDateKey) {
        setSelectedCalendarDateKey(firstDatedEvent.dateKey);
      }
    } else if (!selectedCalendarDateKey) {
      setSelectedCalendarDateKey(toDateKey(new Date()));
    }
    setIsEventsCalendarOpen(true);
  };

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'студент';
  const currentCourseIds = new Set(primaryContinueCourses.map((course) => course.id));
  const catalogCourses = [
    ...courses.filter((course) => !currentCourseIds.has(course.id) && !course.isCore),
    ...courses.filter((course) => !currentCourseIds.has(course.id) && course.isCore),
  ].slice(0, 6);

  return (
    <section className="min-h-screen bg-bg py-8 sm:py-10">
      <div className="mx-auto max-w-6xl space-y-6 px-4">
        <header>
          <p className="text-sm text-muted">Добрый день, {displayName}</p>
          <h1 className="mt-1 text-3xl font-bold text-fg sm:text-4xl">Мои курсы</h1>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          {/* LEFT */}
          <div className="space-y-6">
            {/* Карточки курсов */}
            <div className="grid auto-rows-fr grid-cols-1 gap-4">
              {primaryContinueCourses.map((course) => (
                <article
                  key={course.id}
                  className="group overflow-hidden rounded-2xl border border-border bg-card shadow-brand transition"
                >
                  <div className="grid h-full auto-rows-fr grid-cols-[104px_minmax(0,1fr)] sm:grid-cols-[200px_minmax(0,1fr)]">
                    <button
                      type="button"
                      onClick={() => setLessonsDrawerCourseId(course.id)}
                      className="relative flex h-full items-center justify-center bg-[#CFEAD0] p-4 transition group-hover:bg-[#A8D6AA] hover:bg-[#A8D6AA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                      aria-label={`Открыть список занятий курса «${course.name}»`}
                    >
                      <span className="text-[44px] sm:text-[64px]" aria-hidden>
                        {course.icon || '📘'}
                      </span>
                      <span className="absolute bottom-2 left-3 text-[10px] font-medium uppercase tracking-[0.12em] text-[#1F4D22]/70 sm:bottom-3">
                        Список занятий
                      </span>
                    </button>
                    <div
                      role="link"
                      tabIndex={0}
                      onClick={() => navigate(getCourseIntroPath(course.id))}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          navigate(getCourseIntroPath(course.id));
                        }
                      }}
                      className="flex min-w-0 cursor-pointer flex-col justify-between gap-3 p-5 transition group-hover:bg-accent-100/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
                      aria-label={`Открыть главную страницу курса «${course.name}»`}
                    >
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                          {courseStreamLabel}
                        </p>
                        <h2 className="mt-1 break-words text-xl font-bold leading-tight text-fg sm:text-3xl">
                          {course.name}
                        </h2>
                        <p className="mt-2 text-sm text-muted">Лекция: {course.lessonTitle}</p>
                        <p className="mt-1 text-xs font-semibold text-accent">
                          {course.resumeTimeLabel ?? 'Продолжим с последнего урока'}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <NavLink
                          to={course.continuePath}
                          onClick={(event) => {
                            event.stopPropagation();
                            setCurrentCourse(course.id as CourseType);
                          }}
                          className="inline-flex items-center gap-2 rounded-xl border border-accent/30 bg-accent-100 px-5 py-2.5 text-sm font-semibold text-accent transition hover:bg-accent-100/70"
                        >
                          ▶ Продолжить
                        </NavLink>
                        <div className="rounded-xl border border-border bg-card2 px-3 py-2 text-right">
                          <p className="text-lg font-bold leading-none text-fg">
                            {course.progress.percent}%
                          </p>
                          <p className="mt-1 text-[11px] text-muted">
                            {course.progress.total > 0
                              ? `${course.progress.completed}/${course.progress.total} занятий`
                              : `${course.progress.completed} занятий`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
              {primaryContinueCourses.length === 0 ? (
                <article className="rounded-2xl border border-border bg-card p-6">
                  <p className="text-base text-muted">
                    Курсы для продолжения пока не найдены. Откройте нужный курс в профиле.
                  </p>
                </article>
              ) : null}
            </div>

            <MyAssignmentsSection />

            {/* Общие объявления */}
            <section className="rounded-2xl border border-border bg-card p-5 shadow-brand">
              <h3 className="mb-3 text-xl font-bold text-fg">Общие объявления</h3>
              <div className="rounded-xl border border-border bg-card2 px-4 py-3 text-sm text-muted">
                {feedLoading ? (
                  'Загрузка новостей...'
                ) : latestFeedItems.length === 0 ? (
                  'Пока нет общих новостей — появятся здесь, когда администратор добавит их.'
                ) : (
                  <ul className="space-y-2">
                    {latestFeedItems.map((item) => (
                      <li key={item.id}>
                        <span className="font-semibold text-fg">{item.title}:</span> {item.text}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>

          {/* RIGHT (sticky) */}
          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <MiniWeekCalendar
              calendarEventsByDate={calendarEventsByDate}
              onSelectDate={(dateKey) => {
                setSelectedCalendarDateKey(dateKey);
                openEventsCalendar();
              }}
              onOpen={openEventsCalendar}
            />

            <section className="rounded-2xl border border-border bg-card p-4 shadow-brand">
              <h3 className="mb-3 text-lg font-bold text-fg">Ближайшие события</h3>
              {events.length === 0 ? (
                <p className="text-sm text-muted">Нет предстоящих событий.</p>
              ) : (
                <ul className="space-y-3">
                  {events.slice(0, 3).map((event) => (
                    <li key={event.id} className="rounded-xl border border-border bg-card2 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 flex-1 text-sm text-fg">{event.text}</p>
                        <span className="whitespace-nowrap rounded-md bg-mark px-2 py-1 text-[11px] font-semibold text-[#5a4b00]">
                          {event.dateLabel}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <MyGroupsFeedSection />
          </aside>
        </div>

        {/* Каталог */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-brand">
          <h3 className="mb-4 text-xl font-bold text-fg">Каталог платформы</h3>
          {catalogCourses.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {catalogCourses.map((course) => (
                <article
                  key={course.id}
                  role="link"
                  tabIndex={0}
                  onClick={() => navigate(getCourseIntroPath(course.id))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      navigate(getCourseIntroPath(course.id));
                    }
                  }}
                  className="flex aspect-square cursor-pointer flex-col justify-between rounded-xl border border-border bg-card2 p-4 transition hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                  aria-label={`Открыть главную страницу курса «${course.name}»`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-3xl" aria-hidden>
                      {course.icon || '🎓'}
                    </span>
                    {openCourseIds.has(course.id) ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-100 px-2 py-0.5 text-[10px] font-semibold text-accent">
                        🔓
                      </span>
                    ) : null}
                  </div>
                  <div>
                    <h4 className="line-clamp-3 text-sm font-semibold leading-tight text-fg">
                      {course.name}
                    </h4>
                    <p className="mt-1 text-xs text-muted">
                      {course.isCore ? 'Основной курс' : 'Дополнительный курс'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setLessonsDrawerCourseId(course.id);
                    }}
                    className="self-start rounded-md text-xs font-semibold text-accent transition hover:text-[#1F4D22]"
                  >
                    Занятия →
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-border bg-card2 px-4 py-3 text-sm text-muted">
              Дополнительные курсы пока не добавлены.
            </p>
          )}
        </section>

        {/* Возможности платформы */}
        <Link
          to="/features"
          className="block rounded-2xl border border-[#E8D880] bg-mark p-5 transition hover:bg-[#FFE98C]"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl" aria-hidden>
                💡
              </span>
              <div>
                <h3 className="text-lg font-bold text-[#5a4b00]">Возможности платформы</h3>
                <p className="hidden text-sm text-[#5a4b00]/75 sm:block">
                  Тесты, заметки, таймлайн, научный поиск
                </p>
              </div>
            </div>
            <span className="text-xl text-[#5a4b00]">→</span>
          </div>
        </Link>

        <EventsCalendarModal
          isOpen={isEventsCalendarOpen}
          onClose={() => setIsEventsCalendarOpen(false)}
          cursor={calendarCursor}
          onCursorChange={setCalendarCursor}
          selectedDateKey={selectedCalendarDateKey}
          onSelectDate={setSelectedCalendarDateKey}
          eventsByDate={calendarEventsByDate}
          undatedEvents={undatedCalendarEvents}
        />

        <CourseLessonsDrawer
          courseId={lessonsDrawerCourseId}
          onClose={() => setLessonsDrawerCourseId(null)}
        />

        {feedError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {feedError}
          </div>
        )}
      </div>
    </section>
  );
}

function formatDueDateRu(iso: string | null | undefined): string {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${m[3]}.${m[2]}`;
}

function MyAssignmentsSection() {
  const { items, loading } = useMyGroupsFeed();
  if (loading) return null;

  const assignments = items.filter((item) => item.kind === 'assignment');
  if (assignments.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-brand">
      <h3 className="mb-3 text-xl font-bold text-fg">Задания</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {assignments.slice(0, 6).map((item) => (
          <article key={item.id} className="rounded-xl border border-border bg-card2 p-4">
            <p className="text-sm font-semibold text-fg">{item.groupName}</p>
            <p className="mt-2 text-sm text-muted">{item.text}</p>
            <p className="mt-3 text-xs">
              <span className="inline-flex items-center gap-1 rounded-md bg-mark px-2 py-0.5 font-semibold text-[#5a4b00]">
                Дедлайн: {formatDueDateRu(item.dueDate)}
              </span>
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function MyGroupsFeedSection() {
  const { items: allItems, loading } = useMyGroupsFeed();
  // Assignments выведены в свою секцию — здесь только объявления и события.
  const items = allItems.filter((item) => item.kind !== 'assignment');

  if (loading) return null;

  if (items.length === 0) {
    return (
      <section className="rounded-2xl border border-border bg-accent-100/60 p-4">
        <h3 className="mb-1 text-sm font-bold text-fg">Объявления моей группы</h3>
        <p className="text-xs text-muted">На этой неделе нет новых.</p>
      </section>
    );
  }

  const byGroup = new Map<string, typeof items>();
  for (const item of items) {
    const list = byGroup.get(item.groupName) ?? [];
    list.push(item);
    byGroup.set(item.groupName, list);
  }
  // Внутри группы: сначала будущие события по startAt ASC, потом объявления
  // по createdAt DESC. Прошедшие события уходят в конец.
  const nowMs = Date.now();
  for (const [groupName, list] of byGroup) {
    list.sort((a, b) => {
      const aIsEvent = a.kind === 'event';
      const bIsEvent = b.kind === 'event';
      if (aIsEvent && bIsEvent) {
        const aMs = a.startAt?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? 0;
        const bMs = b.startAt?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? 0;
        const aFuture = aMs >= nowMs ? 0 : 1;
        const bFuture = bMs >= nowMs ? 0 : 1;
        if (aFuture !== bFuture) return aFuture - bFuture;
        return aFuture === 0 ? aMs - bMs : bMs - aMs;
      }
      if (aIsEvent) return -1;
      if (bIsEvent) return 1;
      const aMs = a.createdAt?.toMillis?.() ?? 0;
      const bMs = b.createdAt?.toMillis?.() ?? 0;
      return bMs - aMs;
    });
    byGroup.set(groupName, list);
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-brand">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-bold text-fg">Моя группа</h3>
        <span className="text-xs text-muted">
          {byGroup.size === 1 ? '1 группа' : `${byGroup.size} групп`}
        </span>
      </div>
      <div className="space-y-3">
        {Array.from(byGroup.entries()).map(([groupName, list]) => (
          <div key={groupName} className="rounded-xl border border-border bg-card2 p-3">
            <div className="mb-2 text-sm font-semibold text-fg">👥 {groupName}</div>
            <ul className="space-y-2 text-xs text-muted">
              {list.slice(0, 6).map((item) => (
                <li key={item.id}>
                  {item.kind === 'event' && item.dateLabel ? (
                    <span className="mr-1 inline-flex whitespace-nowrap rounded-md bg-mark px-1.5 py-0.5 text-[10px] font-semibold text-[#5a4b00]">
                      {item.dateLabel}
                    </span>
                  ) : (
                    <span className="font-semibold text-fg">Объявление: </span>
                  )}
                  {item.text}
                  {item.zoomLink ? (
                    <>
                      {' '}
                      <a
                        href={item.zoomLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent underline"
                      >
                        Zoom
                      </a>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function MiniWeekCalendar({
  calendarEventsByDate,
  onSelectDate,
  onOpen,
}: {
  calendarEventsByDate: Map<string, ParsedCalendarEvent[]>;
  onSelectDate: (dateKey: string) => void;
  onOpen: () => void;
}) {
  const days = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    const weekday = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
    const todayKey = toDateKey(today);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const key = toDateKey(d);
      return {
        n: d.getDate(),
        d: weekday[i],
        dateKey: key,
        isToday: key === todayKey,
      };
    });
  }, []);

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-brand">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-bold text-fg">Календарь</h3>
        <button
          type="button"
          onClick={onOpen}
          className="text-xs text-muted transition hover:text-accent"
        >
          Открыть →
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map((day) => {
          const hasEvents = calendarEventsByDate.has(day.dateKey);
          return (
            <button
              key={day.dateKey}
              type="button"
              onClick={() => onSelectDate(day.dateKey)}
              className="py-1 transition hover:opacity-80"
            >
              <div className="text-[10px] uppercase text-muted">{day.d}</div>
              <div
                className={`mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                  day.isToday ? 'bg-mark font-bold text-[#5a4b00]' : 'text-fg'
                }`}
              >
                {day.n}
              </div>
              <div
                className={`mx-auto mt-1 h-1.5 w-1.5 rounded-full ${
                  hasEvents ? 'bg-accent' : 'bg-transparent'
                }`}
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}
