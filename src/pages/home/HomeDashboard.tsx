import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCourses } from '../../hooks/useCourses';
import { useAuthStore } from '../../stores/useAuthStore';
import { useAuth } from '../../auth/AuthProvider';
import { getLastCourseLesson, getMostRecentlyWatchedCourseId } from '../../lib/lastCourseLesson';
import { getWatchedLessonIds } from '../../lib/courseWatchedLessons';
import { buildCourseContinuePath, getCourseVideoResumePoint } from '../../lib/courseVideoResume';
import type { CourseType } from '../../types/tests';
import {
  resolvePrimaryLesson,
  getEstimatedCourseLessons,
  formatTimeFromSeconds,
  resolveContinueCourses,
  toDateKey,
  tryParseDateLabel,
  type ParsedCalendarEvent,
} from './homeHelpers';
import { EventsCalendarModal } from './EventsCalendarModal';
import { CourseLessonsDrawer } from './CourseLessonsDrawer';
import { useMyGroupsFeed } from '../../hooks/useMyGroupsFeed';
import type { GroupFeedItem } from '../../types/groupFeed';
import { useMyGroups } from '../../hooks/useMyGroups';
import { useCourseProgressStore } from '../../stores/useCourseProgressStore';
import { GuestLanding } from './GuestLanding';
import { RegisteredGuestHome } from './RegisteredGuestHome';
import { useGuestStatus } from '../../hooks/useGuestStatus';
import { useCoursesOpenness } from '../../hooks/useCoursesOpenness';
import { usePlatformNews } from '../../hooks/usePlatformNews';
import { PlatformNewsSection } from './PlatformNewsSection';
import { MyAssignmentsSection } from './components/MyAssignmentsSection';
import { FeedItemModal } from './components/FeedItemModal';
import { GeneralEventsSection } from './components/GeneralEventsSection';
import { MyGroupsFeedSection } from './components/MyGroupsFeedSection';
import { MiniWeekCalendar } from './components/MiniWeekCalendar';
import { ContinueCourseCard } from './components/ContinueCourseCard';
import { CatalogCourseCard } from './components/CatalogCourseCard';

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

function StudentDashboard() {
  const { user } = useAuth();
  const { courses, courseMap } = useCourses();
  const { groups: myGroups } = useMyGroups();
  const userFeaturedCourseIds = useAuthStore((s) => s.featuredCourseIds);
  const hasCourseAccess = useAuthStore((s) => s.hasCourseAccess);
  const courseStreamLabel = myGroups.length > 0 ? 'Курс потока' : 'Мой курс';
  const { openCourseIds } = useCoursesOpenness(courses.map((course) => course.id));
  const { items: myFeedItems, loading: myFeedLoading } = useMyGroupsFeed();
  const { items: platformNews, loading: platformNewsLoading } = usePlatformNews();
  const [isEventsCalendarOpen, setIsEventsCalendarOpen] = useState(false);
  const [calendarCursor, setCalendarCursor] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedCalendarDateKey, setSelectedCalendarDateKey] = useState<string | null>(null);
  const [lessonsDrawerCourseId, setLessonsDrawerCourseId] = useState<string | null>(null);
  const [openFeedItem, setOpenFeedItem] = useState<GroupFeedItem | null>(null);

  const accessibleCourseIds = useMemo(
    () => courses.filter((c) => hasCourseAccess(c.id as CourseType)).map((c) => c.id),
    [courses, hasCourseAccess],
  );

  // Bump-tик store'а прогресса. Включаем в deps, чтобы карточки «продолжить»
  // на /home обновлялись после cloud-snapshot или локальной записи.
  const progressVersion = useCourseProgressStore((s) => s.version);

  const continueResolution = useMemo(() => {
    void progressVersion;
    return resolveContinueCourses({
      userFeaturedCourseIds,
      groups: myGroups,
      lastWatchedCourseId: getMostRecentlyWatchedCourseId(),
      accessibleCourseIds,
    });
  }, [userFeaturedCourseIds, myGroups, accessibleCourseIds, progressVersion]);

  const primaryContinueCourses = useMemo(() => {
    void progressVersion;
    return continueResolution.ids.flatMap((courseId) => {
      const course = courseMap.get(courseId);
      if (!course) return [];
      const fallbackPrimaryLesson = resolvePrimaryLesson(course.id);
      const lastCourseLesson = getLastCourseLesson(course.id);
      const resumePoint = getCourseVideoResumePoint(course.id);
      const fallbackPath = lastCourseLesson?.path ?? fallbackPrimaryLesson.link;
      const continuePath = buildCourseContinuePath(course.id, fallbackPath);
      const lessonTitle =
        lastCourseLesson?.label ?? resumePoint?.lessonLabel ?? fallbackPrimaryLesson.title;
      const completed = getWatchedLessonIds(course.id).size;
      const total = getEstimatedCourseLessons(course.id);
      const percent = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;

      return [
        {
          id: course.id,
          name: course.name,
          icon: course.icon,
          continuePath,
          lessonTitle,
          progress: { completed, total, percent },
          resumeTimeLabel:
            resumePoint && resumePoint.timeSec > 0
              ? `Продолжим с ${formatTimeFromSeconds(resumePoint.timeSec)}`
              : null,
        },
      ];
    });
  }, [continueResolution, courseMap, progressVersion]);

  // Календарь справа показывает события из подписок группы (useMyGroupsFeed).
  // Для events c точным startAt берём его; для legacy без startAt пытаемся
  // распарсить `dateLabel` регэкспом (обратная совместимость).
  const parsedCalendarEvents = useMemo<ParsedCalendarEvent[]>(
    () =>
      myFeedItems
        .filter((item) => item.kind === 'event')
        .map((item) => {
          const startDate = item.startAt?.toDate ? item.startAt.toDate() : null;
          const fallback = startDate ? null : tryParseDateLabel(item.dateLabel);
          const parsedDate = startDate ?? fallback ?? null;
          return {
            id: item.id,
            text: item.text,
            dateLabel: item.dateLabel ?? '',
            parsedDate,
            dateKey: parsedDate ? toDateKey(parsedDate) : null,
          };
        }),
    [myFeedItems],
  );

  const calendarEventsByDate = useMemo(() => {
    const map = new Map<string, ParsedCalendarEvent[]>();
    parsedCalendarEvents.forEach((event) => {
      if (!event.dateKey) return;
      const current = map.get(event.dateKey);
      if (current) current.push(event);
      else map.set(event.dateKey, [event]);
    });
    return map;
  }, [parsedCalendarEvents]);

  const undatedCalendarEvents = useMemo(
    () => parsedCalendarEvents.filter((event) => !event.dateKey),
    [parsedCalendarEvents],
  );

  const openEventsCalendar = () => {
    const firstDatedEvent = parsedCalendarEvents.find((event) => event.parsedDate);
    if (firstDatedEvent?.parsedDate) {
      setCalendarCursor(
        new Date(
          firstDatedEvent.parsedDate.getFullYear(),
          firstDatedEvent.parsedDate.getMonth(),
          1,
        ),
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
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted">Добрый день, {displayName}</p>
            <h1 className="mt-1 text-3xl font-bold text-fg sm:text-4xl">Мои курсы</h1>
          </div>
          <Link
            to="/about"
            aria-label="О проекте: DOM Academy — Development Of Mind"
            className="inline-flex flex-col items-start rounded-2xl border border-border bg-gradient-to-br from-accent-100 to-mark px-4 py-2.5 shadow-brand transition hover:opacity-90"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              DOM Academy
            </span>
            <span className="mt-0.5 text-[11px] italic text-muted">Development Of Mind</span>
          </Link>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          {/* LEFT */}
          <div className="space-y-6">
            <div className="grid auto-rows-fr grid-cols-1 gap-4">
              {primaryContinueCourses.map((course) => (
                <ContinueCourseCard
                  key={course.id}
                  course={course}
                  streamLabel={courseStreamLabel}
                  onOpenLessons={setLessonsDrawerCourseId}
                />
              ))}
              {primaryContinueCourses.length === 0 ? (
                <article className="rounded-2xl border border-border bg-card p-6">
                  <h2 className="text-lg font-bold text-fg">Нет актуальных курсов</h2>
                  <p className="mt-2 text-sm text-muted">
                    Выберите курсы, которые сейчас активно проходите, — они будут показаны здесь.
                  </p>
                  <Link
                    to="/profile"
                    className="mt-4 inline-flex items-center gap-2 rounded-xl border border-accent/30 bg-accent-100 px-4 py-2 text-sm font-semibold text-accent transition hover:bg-accent-100/70"
                  >
                    Выбрать актуальные курсы в профиле →
                  </Link>
                </article>
              ) : null}
            </div>

            <MyAssignmentsSection
              items={myFeedItems}
              loading={myFeedLoading}
              onOpen={setOpenFeedItem}
            />

            <PlatformNewsSection items={platformNews} loading={platformNewsLoading} showEmpty />
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

            <MyGroupsFeedSection
              items={myFeedItems}
              loading={myFeedLoading}
              onOpen={setOpenFeedItem}
            />
            <GeneralEventsSection />
          </aside>
        </div>
        <FeedItemModal item={openFeedItem} onClose={() => setOpenFeedItem(null)} />

        {/* Каталог */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-brand">
          <h3 className="mb-4 text-xl font-bold text-fg">Каталог платформы</h3>
          {catalogCourses.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {catalogCourses.map((course) => (
                <CatalogCourseCard
                  key={course.id}
                  course={course}
                  isOpen={openCourseIds.has(course.id)}
                  onOpenLessons={setLessonsDrawerCourseId}
                />
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-border bg-card2 px-4 py-3 text-sm text-muted">
              Дополнительные курсы пока не добавлены.
            </p>
          )}
        </section>

        {/* Партнёр — центр Dom */}
        <section className="rounded-2xl border border-border bg-card2 p-5 shadow-brand">
          <p className="text-sm font-semibold text-muted">Приходите знакомиться лично</p>
          <h2 className="mt-1 text-xl font-bold text-fg">
            Психологический центр «Dom» в Тбилиси
          </h2>
          <p className="mt-2 text-sm text-muted">
            Очные сессии и аренда кабинета для работы с клиентами.
          </p>
          <Link
            to="/booking"
            className="mt-3 inline-flex items-center gap-1 rounded-xl border border-accent/30 bg-accent-100 px-4 py-2 text-sm font-semibold text-accent transition hover:bg-accent-100/70"
          >
            Бронирование кабинетов →
          </Link>
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
      </div>
    </section>
  );
}
