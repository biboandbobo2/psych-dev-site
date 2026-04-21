import { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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
import { AnnouncementAdminForm } from './AnnouncementAdminForm';
import { CourseLessonsDrawer } from './CourseLessonsDrawer';
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
  const { user, isAdmin, userRole, studentStream } = useAuth();
  const { currentCourse, setCurrentCourse } = useCourseStore();
  const navigate = useNavigate();
  const { courses } = useCourses();
  const { openCourseIds } = useCoursesOpenness(courses.map((course) => course.id));
  const {
    announcements,
    events,
    loading: feedLoading,
    error: feedError,
    addAnnouncement,
    addEvent,
  } = useHomeFeed();
  const [feedActionError, setFeedActionError] = useState<string | null>(null);
  const [isEventsCalendarOpen, setIsEventsCalendarOpen] = useState(false);
  const [calendarCursor, setCalendarCursor] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedCalendarDateKey, setSelectedCalendarDateKey] = useState<string | null>(null);
  const [lessonsDrawerCourseId, setLessonsDrawerCourseId] = useState<string | null>(null);

  const streamCourseIds = useMemo(() => {
    if (userRole !== 'student') return null;

    const availableCourseIds = new Set(courses.map((course) => course.id));
    const clinicalIntroCourseId = availableCourseIds.has('vvedenie-v-osnovy-klinicheskoy-psihologii')
      ? 'vvedenie-v-osnovy-klinicheskoy-psihologii'
      : 'general';

    if (studentStream === 'first') return ['clinical', 'general'];
    if (studentStream === 'second') return [clinicalIntroCourseId, 'development'];
    return null;
  }, [courses, studentStream, userRole]);

  const streamCourses = useMemo(() => {
    if (!streamCourseIds) return courses;
    const courseById = new Map(courses.map((course) => [course.id, course]));
    return streamCourseIds
      .map((courseId) => courseById.get(courseId))
      .filter((course): course is typeof courses[number] => Boolean(course));
  }, [courses, streamCourseIds]);

  const featuredSubjects = streamCourses.slice(0, 4).map((course) => ({
    id: course.id,
    name: course.name,
    icon: course.icon,
  }));
  const fallbackSubjects = [
    { id: 'development', name: 'Психология развития', icon: '👶' },
    { id: 'clinical', name: 'Основы патопсихологии', icon: '🧠' },
    { id: 'general', name: 'Введение в клиническую психологию', icon: '📘' },
  ];
  const subjects = streamCourseIds
    ? featuredSubjects
    : featuredSubjects.length >= 4
    ? featuredSubjects
    : [...featuredSubjects, ...fallbackSubjects.filter((item) => !featuredSubjects.some((course) => course.id === item.id))].slice(0, 4);

  const effectiveCurrentCourse = useMemo(() => {
    if (!streamCourseIds?.length) return currentCourse;
    if (streamCourseIds.includes(currentCourse)) return currentCourse;
    return streamCourseIds[0];
  }, [currentCourse, streamCourseIds]);

  useEffect(() => {
    if (effectiveCurrentCourse !== currentCourse) {
      setCurrentCourse(effectiveCurrentCourse as CourseType);
    }
  }, [currentCourse, effectiveCurrentCourse, setCurrentCourse]);

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
    const selectedCourses = (streamCourses.length > 0 ? streamCourses : subjects).slice(0, 2);

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
  }, [progressByCourse, streamCourses, subjects]);

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

  const authorName = user?.displayName || user?.email || 'Администратор';

  const submitAnnouncement = async (text: string) => {
    setFeedActionError(null);
    try {
      await addAnnouncement(text, authorName);
    } catch (err: any) {
      setFeedActionError(err?.message || 'Не удалось добавить объявление');
      throw err;
    }
  };

  const submitEvent = async (date: string, text: string) => {
    setFeedActionError(null);
    try {
      await addEvent(date, text, authorName);
    } catch (err: any) {
      setFeedActionError(err?.message || 'Не удалось добавить событие');
      throw err;
    }
  };

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
    <section className="py-8 sm:py-10">
      <div className="space-y-4">
        <section className="space-y-3">
          <p className="text-sm font-medium text-[#556476]">Добрый день, {displayName}</p>
          <h2 className="text-2xl font-black text-[#1F2F46] sm:text-3xl">Мои текущие курсы</h2>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {primaryContinueCourses.map((course) => (
              <article
                key={course.id}
                className="h-full overflow-hidden rounded-2xl border border-[#D4E4FF] bg-white shadow-[0_12px_26px_rgba(18,44,84,0.12)]"
              >
                <div className="flex h-full min-h-[220px] flex-col sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setLessonsDrawerCourseId(course.id)}
                    className="relative flex w-full items-center justify-center bg-gradient-to-br from-[#EAF1FF] to-[#DCE8FF] p-6 transition hover:from-[#DFEAFF] hover:to-[#CFDCFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3359CB] focus-visible:ring-offset-2 sm:w-[34%] sm:self-stretch"
                    aria-label={`Открыть список занятий курса «${course.name}»`}
                  >
                    <span className="text-[54px]" aria-hidden>
                      {course.icon || '📘'}
                    </span>
                    <span className="absolute bottom-3 left-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#3359CB]">
                      Список занятий →
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
                    className="flex w-full cursor-pointer flex-col justify-between p-5 transition hover:bg-[#F9FBFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3359CB] focus-visible:ring-inset sm:w-[66%]"
                    aria-label={`Открыть главную страницу курса «${course.name}»`}
                  >
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5D73A1]">
                        Курс потока
                      </p>
                      <h2 className="text-3xl font-black leading-tight text-[#1F2F46]">{course.name}</h2>
                      <p className="text-sm text-[#4D607B]">Лекция: {course.lessonTitle}</p>
                      {course.resumeTimeLabel ? (
                        <p className="text-xs font-semibold text-[#3359CB]">{course.resumeTimeLabel}</p>
                      ) : (
                        <p className="text-xs font-semibold text-[#5E6D7A]">Продолжим с последнего урока</p>
                      )}
                    </div>
                    <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
                      <NavLink
                        to={course.continuePath}
                        onClick={(event) => {
                          event.stopPropagation();
                          setCurrentCourse(course.id as CourseType);
                        }}
                        className="inline-flex items-center justify-center rounded-xl bg-[#3359CB] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2A49A8]"
                      >
                        ▶ Продолжить
                      </NavLink>
                      <div className="rounded-xl border border-[#D2DDF0] bg-[#F5F8FF] px-3 py-2 text-right">
                        <p className="text-xl font-black leading-none text-[#1F2F46]">{course.progress.percent}%</p>
                        <p className="mt-1 text-[11px] font-medium text-[#5E6D7A]">
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
              <article className="rounded-2xl border border-[#DDE5EE] bg-white p-6">
                <p className="text-base text-[#5E6D7A]">
                  Курсы для продолжения пока не найдены. Откройте нужный курс в профиле.
                </p>
              </article>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-[#DDE5EE] bg-white p-4 text-[#2C3E50]">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-2xl font-bold">Объявления и события</h3>
            <button
              type="button"
              onClick={openEventsCalendar}
              className="inline-flex rounded-lg border border-[#C5D6EE] bg-[#F4F8FF] px-3 py-1.5 text-xs font-semibold text-[#3359CB] transition hover:bg-[#E9F1FF]"
            >
              Календарь
            </button>
          </div>
          <div className="rounded-xl bg-[#F5F8FC] px-4 py-3 text-sm text-[#5E6D7A]">
            {feedLoading ? (
              'Загрузка новостей...'
            ) : latestFeedItems.length === 0 ? (
              'Пока нет новостей — появятся здесь, когда администратор добавит их.'
            ) : (
              <ul className="space-y-2">
                {latestFeedItems.map((item) => (
                  <li key={item.id}>
                    <span className="font-semibold text-[#2C3E50]">{item.title}:</span> {item.text}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {isAdmin ? (
            <AnnouncementAdminForm
              onSubmitAnnouncement={submitAnnouncement}
              onSubmitEvent={submitEvent}
            />
          ) : null}
        </section>

        <section className="rounded-2xl border border-[#DDE5EE] bg-white p-4 text-[#2C3E50]">
          <h3 className="mb-3 text-2xl font-bold">Каталог платформы</h3>
          {catalogCourses.length > 0 ? (
            <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2 xl:grid-cols-3">
              {catalogCourses.map((course) => (
                <div
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
                  className="flex h-full cursor-pointer flex-col rounded-xl border border-[#D8E2EE] bg-[#F9FBFF] p-4 transition hover:border-[#B8CBEA] hover:bg-[#F3F7FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3359CB] focus-visible:ring-offset-1"
                  aria-label={`Открыть главную страницу курса «${course.name}»`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-2xl">{course.icon || '🎓'}</p>
                    {openCourseIds.has(course.id) ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
                        🔓 Открытый
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 line-clamp-3 text-lg font-semibold leading-snug text-[#2C3E50]">
                    {course.name}
                  </p>
                  <p className="text-sm text-[#5E6D7A]">
                    {course.isCore ? 'Основной курс платформы' : 'Дополнительный курс платформы'}
                  </p>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setLessonsDrawerCourseId(course.id);
                    }}
                    className="mt-auto inline-flex items-center justify-center gap-1 rounded-lg border border-[#C5D6EE] bg-white px-3 py-2 text-xs font-semibold text-[#3359CB] transition hover:bg-[#EEF4FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3359CB] focus-visible:ring-offset-1"
                  >
                    Посмотреть занятия →
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-[#F5F8FC] px-4 py-3 text-sm text-[#5E6D7A]">
              Дополнительные курсы пока не добавлены.
            </div>
          )}
        </section>

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

        {(feedError || feedActionError) && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {feedActionError ?? feedError}
          </div>
        )}
      </div>
    </section>
  );
}
