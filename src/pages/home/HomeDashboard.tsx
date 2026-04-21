import { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { useCourses } from '../../hooks/useCourses';
import { useHomeFeed } from '../../hooks/useHomeFeed';
import { useCourseStore } from '../../stores';
import { useAuth } from '../../auth/AuthProvider';
import { getLastCourseLesson } from '../../lib/lastCourseLesson';
import { getWatchedLessonIds } from '../../lib/courseWatchedLessons';
import { buildCourseContinuePath, getCourseVideoResumePoint } from '../../lib/courseVideoResume';
import { BaseModal, ModalCancelButton } from '../../components/ui/BaseModal';
import type { CourseType } from '../../types/tests';
import {
  resolvePrimaryLesson,
  getEstimatedCourseLessons,
  WEEKDAY_LABELS,
  formatTimeFromSeconds,
  toDateKey,
  formatDateKey,
  tryParseDateLabel,
  type ParsedCalendarEvent,
} from './homeHelpers';

export function HomeDashboard() {
  const { user, isAdmin, userRole, studentStream } = useAuth();
  const { currentCourse, setCurrentCourse } = useCourseStore();
  const { courses } = useCourses();
  const {
    announcements,
    events,
    loading: feedLoading,
    error: feedError,
    addAnnouncement,
    addEvent,
  } = useHomeFeed();
  const [announcementDraft, setAnnouncementDraft] = useState('');
  const [eventDateDraft, setEventDateDraft] = useState('');
  const [eventTextDraft, setEventTextDraft] = useState('');
  const [isFeedSaving, setIsFeedSaving] = useState(false);
  const [feedActionError, setFeedActionError] = useState<string | null>(null);
  const [isEventsCalendarOpen, setIsEventsCalendarOpen] = useState(false);
  const [calendarCursor, setCalendarCursor] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedCalendarDateKey, setSelectedCalendarDateKey] = useState<string | null>(null);

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

  const handleAddAnnouncement = async () => {
    if (!isAdmin || isFeedSaving) return;
    setFeedActionError(null);
    setIsFeedSaving(true);
    try {
      await addAnnouncement(announcementDraft, user?.displayName || user?.email || 'Администратор');
      setAnnouncementDraft('');
    } catch (err: any) {
      setFeedActionError(err?.message || 'Не удалось добавить объявление');
    } finally {
      setIsFeedSaving(false);
    }
  };

  const handleAddEvent = async () => {
    if (!isAdmin || isFeedSaving) return;
    setFeedActionError(null);
    setIsFeedSaving(true);
    try {
      await addEvent(eventDateDraft, eventTextDraft, user?.displayName || user?.email || 'Администратор');
      setEventDateDraft('');
      setEventTextDraft('');
    } catch (err: any) {
      setFeedActionError(err?.message || 'Не удалось добавить событие');
    } finally {
      setIsFeedSaving(false);
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
  const monthStart = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth(), 1);
  const firstWeekday = (monthStart.getDay() + 6) % 7;
  const daysInMonth = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 0).getDate();
  const calendarCells: Array<{ day: number; dateKey: string } | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const date = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth(), day);
      return { day, dateKey: toDateKey(date) };
    }),
  ];
  const selectedDayEvents = selectedCalendarDateKey
    ? calendarEventsByDate.get(selectedCalendarDateKey) ?? []
    : [];
  const calendarMonthLabel = calendarCursor.toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  });
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
                  <div
                    className="flex w-full items-center justify-center bg-gradient-to-br from-[#EAF1FF] to-[#DCE8FF] p-6 sm:w-[34%] sm:self-stretch"
                  >
                    <span className="text-[54px]" aria-hidden>
                      {course.icon || '📘'}
                    </span>
                  </div>
                  <div className="flex w-full flex-col justify-between p-5 sm:w-[66%]">
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
                        onClick={() => setCurrentCourse(course.id as CourseType)}
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
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="space-y-2 rounded-xl border border-[#DFE7F3] bg-[#FAFCFF] p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#4A5FA5]">Добавить объявление</p>
                <textarea
                  value={announcementDraft}
                  onChange={(event) => setAnnouncementDraft(event.target.value)}
                  rows={3}
                  maxLength={400}
                  placeholder="Текст объявления..."
                  className="w-full rounded-lg border border-[#C9D6E6] px-3 py-2 text-sm text-[#243447] focus:border-[#5B7FD1] focus:outline-none focus:ring-2 focus:ring-[#DCE7FF]"
                />
                <button
                  type="button"
                  onClick={handleAddAnnouncement}
                  disabled={isFeedSaving}
                  className="inline-flex rounded-lg bg-[#3359CB] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#2A49A8] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isFeedSaving ? 'Сохранение...' : 'Опубликовать'}
                </button>
              </div>
              <div className="space-y-2 rounded-xl border border-[#DFE7F3] bg-[#FAFCFF] p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#4A5FA5]">Добавить событие</p>
                <input
                  type="date"
                  value={eventDateDraft}
                  onChange={(event) => setEventDateDraft(event.target.value)}
                  className="w-full rounded-lg border border-[#C9D6E6] px-3 py-2 text-sm text-[#243447] focus:border-[#5B7FD1] focus:outline-none focus:ring-2 focus:ring-[#DCE7FF]"
                />
                <textarea
                  value={eventTextDraft}
                  onChange={(event) => setEventTextDraft(event.target.value)}
                  rows={2}
                  maxLength={400}
                  placeholder="Описание события..."
                  className="w-full rounded-lg border border-[#C9D6E6] px-3 py-2 text-sm text-[#243447] focus:border-[#5B7FD1] focus:outline-none focus:ring-2 focus:ring-[#DCE7FF]"
                />
                <button
                  type="button"
                  onClick={handleAddEvent}
                  disabled={isFeedSaving}
                  className="inline-flex rounded-lg bg-[#3359CB] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#2A49A8] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isFeedSaving ? 'Сохранение...' : 'Опубликовать'}
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-[#DDE5EE] bg-white p-4 text-[#2C3E50]">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-2xl font-bold">Каталог платформы</h3>
            <span className="text-sm font-semibold text-[#3359CB]">Смотреть всё →</span>
          </div>
          {catalogCourses.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {catalogCourses.map((course) => (
                <div key={course.id} className="rounded-xl border border-[#D8E2EE] bg-[#F9FBFF] p-4">
                  <p className="text-2xl">{course.icon || '🎓'}</p>
                  <p className="mt-2 text-xl font-semibold text-[#2C3E50]">{course.name}</p>
                  <p className="text-sm text-[#5E6D7A]">
                    {course.isCore ? 'Основной курс платформы' : 'Дополнительный курс платформы'}
                  </p>
                  <span className="mt-2 inline-flex rounded-full border border-[#D6DFED] bg-white px-2.5 py-1 text-xs font-semibold text-[#6B7A8D]">
                    Доступен
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-[#F5F8FC] px-4 py-3 text-sm text-[#5E6D7A]">
              Дополнительные курсы пока не добавлены.
            </div>
          )}
        </section>

        <BaseModal
          isOpen={isEventsCalendarOpen}
          onClose={() => setIsEventsCalendarOpen(false)}
          title="Календарь событий"
          maxWidth="2xl"
          footer={<ModalCancelButton onClick={() => setIsEventsCalendarOpen(false)}>Закрыть</ModalCancelButton>}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-[#DDE5EE] bg-[#F8FAFD] px-3 py-2">
              <button
                type="button"
                onClick={() =>
                  setCalendarCursor(
                    new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1)
                  )
                }
                className="rounded-lg border border-[#C9D6E6] bg-white px-3 py-1 text-sm font-semibold text-[#3359CB] transition hover:bg-[#F0F5FF]"
              >
                ←
              </button>
              <p className="text-sm font-bold capitalize text-[#2C3E50]">{calendarMonthLabel}</p>
              <button
                type="button"
                onClick={() =>
                  setCalendarCursor(
                    new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1)
                  )
                }
                className="rounded-lg border border-[#C9D6E6] bg-white px-3 py-1 text-sm font-semibold text-[#3359CB] transition hover:bg-[#F0F5FF]"
              >
                →
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="px-1 py-1 text-center text-xs font-semibold uppercase text-[#6B7A8D]">
                  {label}
                </div>
              ))}
              {calendarCells.map((cell, index) => {
                if (!cell) {
                  return <div key={`empty-${index}`} className="h-10 rounded-md bg-transparent" />;
                }

                const isSelected = selectedCalendarDateKey === cell.dateKey;
                const hasEvents = calendarEventsByDate.has(cell.dateKey);
                return (
                  <button
                    key={cell.dateKey}
                    type="button"
                    onClick={() => setSelectedCalendarDateKey(cell.dateKey)}
                    className={cn(
                      'relative h-10 rounded-md border text-sm transition',
                      isSelected
                        ? 'border-[#3359CB] bg-[#3359CB] text-white'
                        : hasEvents
                        ? 'border-[#9EB7D9] bg-[#EEF4FF] text-[#244A8F] hover:bg-[#E3EEFF]'
                        : 'border-[#E5EBF3] bg-white text-[#465A75] hover:bg-[#F8FAFD]'
                    )}
                  >
                    {cell.day}
                    {hasEvents && !isSelected ? (
                      <span className="absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#3359CB]" />
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="rounded-xl border border-[#DDE5EE] bg-[#FAFCFF] p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#4A5FA5]">
                {selectedCalendarDateKey
                  ? `События на ${formatDateKey(selectedCalendarDateKey)}`
                  : 'Выберите дату в календаре'}
              </p>
              {selectedDayEvents.length ? (
                <ul className="mt-2 space-y-2">
                  {selectedDayEvents.map((event) => (
                    <li key={event.id} className="rounded-lg bg-white px-3 py-2 text-sm text-[#44566F]">
                      <p className="font-semibold text-[#2C3E50]">{event.dateLabel}</p>
                      <p className="mt-1">{event.text}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-[#6B7A8D]">На выбранную дату событий пока нет.</p>
              )}
            </div>

            {undatedCalendarEvents.length ? (
              <div className="rounded-xl border border-[#E7EEF8] bg-[#F7FAFF] p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#5F6F87]">
                  События без точной даты
                </p>
                <ul className="mt-2 space-y-2">
                  {undatedCalendarEvents.map((event) => (
                    <li key={event.id} className="rounded-lg bg-white px-3 py-2 text-sm text-[#556880]">
                      <p className="font-semibold text-[#2C3E50]">{event.dateLabel}</p>
                      <p className="mt-1">{event.text}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </BaseModal>

        {(feedError || feedActionError) && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {feedActionError ?? feedError}
          </div>
        )}
      </div>
    </section>
  );
}
