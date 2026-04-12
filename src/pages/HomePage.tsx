import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion as Motion } from 'framer-motion';
import { NavLink, useNavigate } from 'react-router-dom';
import { pageTransition } from '../theme/motion';
import { CLINICAL_ROUTE_CONFIG, GENERAL_ROUTE_CONFIG, ROUTE_CONFIG, SITE_NAME } from '../routes';
import { cn } from '../lib/cn';
import { useHomePageContent } from '../hooks/useHomePageContent';
import { useCourses } from '../hooks/useCourses';
import { useHomeFeed } from '../hooks/useHomeFeed';
import { useCourseStore } from '../stores';
import { useAuth } from '../auth/AuthProvider';
import { getLastCourseLesson } from '../lib/lastCourseLesson';
import { getWatchedLessonIds } from '../lib/courseWatchedLessons';
import { buildCourseContinuePath, getCourseVideoResumePoint } from '../lib/courseVideoResume';
import { PageLoader } from '../components/ui';
import { BaseModal, ModalCancelButton } from '../components/ui/BaseModal';
import type { CourseType } from '../types/tests';
import type {
  HomePageSection,
  HeroSection,
  EssenceSection,
  StructureSection,
  PeriodsSection,
  OrganizationSection,
  InstructorsSection,
  FormatSection,
  CTASection,
  CTAClinicalSection,
  CTAGeneralSection,
} from '../types/homePage';

// Helper to extract background color from bgColor field
function getBgClass(bgColor?: string): string {
  if (!bgColor) return 'bg-[#F5F7FA]';
  return `bg-[${bgColor}]`;
}

// Helper to extract border color class from borderColor field
function getBorderClass(borderColor?: string): string {
  if (!borderColor) return 'border-l-[#4A5FA5]';
  return `border-l-[${borderColor}]`;
}

function resolvePrimaryLesson(courseId: string): { link: string; title: string } {
  if (courseId === 'development') {
    return {
      link: ROUTE_CONFIG[0]?.path ?? '/profile?course=development',
      title: ROUTE_CONFIG[0]?.navLabel ?? 'Вводное занятие',
    };
  }
  if (courseId === 'clinical') {
    return {
      link: CLINICAL_ROUTE_CONFIG[0]?.path ?? '/profile?course=clinical',
      title: CLINICAL_ROUTE_CONFIG[0]?.navLabel ?? 'Введение',
    };
  }
  if (courseId === 'general') {
    return {
      link: GENERAL_ROUTE_CONFIG[0]?.path ?? '/profile?course=general',
      title: GENERAL_ROUTE_CONFIG[0]?.navLabel ?? 'Первое занятие курса',
    };
  }
  return {
    link: `/profile?course=${encodeURIComponent(courseId as CourseType)}`,
    title: 'Первое занятие выбранного курса',
  };
}

function getCoreCourseStartPath(courseId: string): string | null {
  if (courseId === 'development') return '/development/intro';
  if (courseId === 'clinical') return CLINICAL_ROUTE_CONFIG[0]?.path ?? '/clinical/intro';
  if (courseId === 'general') return GENERAL_ROUTE_CONFIG[0]?.path ?? '/general/intro';
  return null;
}

function getEstimatedCourseLessons(courseId: string): number {
  if (courseId === 'development') return ROUTE_CONFIG.length;
  if (courseId === 'clinical') return CLINICAL_ROUTE_CONFIG.length;
  if (courseId === 'general') return GENERAL_ROUTE_CONFIG.length;
  return 0;
}

const RU_MONTH_INDEX: Record<string, number> = {
  январ: 0,
  феврал: 1,
  март: 2,
  апрел: 3,
  ма: 4,
  июн: 5,
  июл: 6,
  август: 7,
  сентябр: 8,
  октябр: 9,
  ноябр: 10,
  декабр: 11,
};

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

type ParsedCalendarEvent = {
  id: string;
  text: string;
  dateLabel: string;
  dateKey: string | null;
  parsedDate: Date | null;
};

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function formatTimeFromSeconds(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hours > 0) {
    return `${hours}:${pad2(minutes)}:${pad2(secs)}`;
  }
  return `${minutes}:${pad2(secs)}`;
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function formatDateKey(dateKey: string): string {
  const [yearRaw, monthRaw, dayRaw] = dateKey.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!year || !month || !day) return dateKey;
  return new Date(year, month - 1, day).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function tryParseDateLabel(dateLabel: string): Date | null {
  const normalized = dateLabel.trim().toLowerCase();
  if (!normalized) return null;

  const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]) - 1;
    const day = Number(isoMatch[3]);
    return new Date(year, month, day);
  }

  const dotMatch = normalized.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dotMatch) {
    const day = Number(dotMatch[1]);
    const month = Number(dotMatch[2]) - 1;
    const year = Number(dotMatch[3]);
    return new Date(year, month, day);
  }

  const dayMonthYear = normalized.match(/^(\d{1,2})\s+([а-яёa-z]+)\s+(\d{4})$/i);
  if (dayMonthYear) {
    const day = Number(dayMonthYear[1]);
    const monthWord = dayMonthYear[2];
    const year = Number(dayMonthYear[3]);
    const month = Object.entries(RU_MONTH_INDEX).find(([prefix]) => monthWord.startsWith(prefix))?.[1];
    if (month !== undefined) {
      return new Date(year, month, day);
    }
  }

  const monthYear = normalized.match(/^([а-яёa-z]+)\s+(\d{4})$/i);
  if (monthYear) {
    const monthWord = monthYear[1];
    const year = Number(monthYear[2]);
    const month = Object.entries(RU_MONTH_INDEX).find(([prefix]) => monthWord.startsWith(prefix))?.[1];
    if (month !== undefined) {
      return new Date(year, month, 1);
    }
  }

  const parsedNative = new Date(dateLabel);
  if (!Number.isNaN(parsedNative.getTime())) {
    return new Date(parsedNative.getFullYear(), parsedNative.getMonth(), parsedNative.getDate());
  }

  return null;
}

export function HomePage() {
  const { user, isAdmin, userRole, studentStream } = useAuth();
  const { currentCourse, setCurrentCourse } = useCourseStore();
  const navigate = useNavigate();
  const { courses } = useCourses();
  const {
    announcements,
    events,
    loading: feedLoading,
    error: feedError,
    addAnnouncement,
    addEvent,
  } = useHomeFeed();
  const { content, loading, error } = useHomePageContent();
  const [announcementDraft, setAnnouncementDraft] = useState('');
  const [eventDateDraft, setEventDateDraft] = useState('');
  const [eventTextDraft, setEventTextDraft] = useState('');
  const [isFeedSaving, setIsFeedSaving] = useState(false);
  const [feedActionError, setFeedActionError] = useState<string | null>(null);
  const [openingCourseId, setOpeningCourseId] = useState<string | null>(null);
  const [courseOpenError, setCourseOpenError] = useState<string | null>(null);
  const [isEventsCalendarOpen, setIsEventsCalendarOpen] = useState(false);
  const [calendarCursor, setCalendarCursor] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedCalendarDateKey, setSelectedCalendarDateKey] = useState<string | null>(null);

  const activeSections: HomePageSection[] = [];
  const streamCourseIds = useMemo(() => {
    if (userRole !== 'student') return null;
    if (studentStream === 'first') return ['clinical', 'general'];
    if (studentStream === 'second') return ['clinical', 'development'];
    return null;
  }, [studentStream, userRole]);

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

  if (loading) {
    return <PageLoader />;
  }

  if (error || !content) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-700 mb-2">Ошибка загрузки страницы</p>
          {error && <p className="text-sm text-muted">{error.message}</p>}
        </div>
      </div>
    );
  }

  const resolveSubjectPath = async (courseId: string): Promise<string | null> => {
    const coreStartPath = getCoreCourseStartPath(courseId);
    if (coreStartPath) {
      return coreStartPath;
    }
    return `/course/${encodeURIComponent(courseId)}/intro`;
  };

  const handleOpenSubject = async (courseId: string) => {
    if (openingCourseId) {
      return;
    }

    setCourseOpenError(null);
    setOpeningCourseId(courseId);
    setCurrentCourse(courseId as CourseType);

    try {
      const path = await resolveSubjectPath(courseId);
      if (!path) {
        setCourseOpenError('Для этого курса пока нет опубликованных занятий.');
        return;
      }
      navigate(path);
    } catch (err: any) {
      setCourseOpenError(err?.message || 'Не удалось открыть курс. Попробуйте ещё раз.');
    } finally {
      setOpeningCourseId(null);
    }
  };

  const nonHeroSections: HomePageSection[] = [];

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

  // Helper function to render each section based on type
  const renderSection = (section: HomePageSection) => {
    switch (section.type) {
      case 'hero':
        return renderHeroSection(section as HeroSection);
      case 'essence':
        return renderEssenceSection(section as EssenceSection);
      case 'structure':
        return renderStructureSection(section as StructureSection);
      case 'periods':
        return renderPeriodsSection(section as PeriodsSection);
      case 'organization':
        return renderOrganizationSection(section as OrganizationSection);
      case 'instructors':
        return renderInstructorsSection(section as InstructorsSection);
      case 'format':
        return renderFormatSection(section as FormatSection);
      case 'cta':
        return renderCTASection(section as CTASection);
      case 'cta-clinical':
        return renderSimpleCTASection(section as CTAClinicalSection);
      case 'cta-general':
        return renderSimpleCTASection(section as CTAGeneralSection);
      default:
        return null;
    }
  };

  function renderHeroSection(section: HeroSection) {
    const { title, subtitle, primaryCta, secondaryCta } = section.content;
    return (
      <section
        key="hero"
        className="relative -mx-4 sm:-mx-6 lg:-mx-8 bg-gradient-to-br from-[#4A5FA5] to-[#6B7FB8] text-white min-h-[500px] flex items-center"
      >
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE2YzAtMS4xLjktMiAyLTJzMiAuOSAyIDItLjkgMi0yIDItMi0uOS0yLTJ6bS0xNiAwYzAtMS4xLjktMiAyLTJzMiAuOSAyIDItLjkgMi0yIDItMi0uOS0yLTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        <div className="container relative mx-auto px-5 sm:px-8 lg:px-10 py-20">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">{title}</h1>
            <p className="text-lg sm:text-xl leading-relaxed text-white/90 max-w-3xl mx-auto">{subtitle}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <NavLink
                to={primaryCta.link}
                className="inline-flex items-center justify-center px-8 py-3.5 bg-white text-[#4A5FA5] font-semibold rounded-lg hover:bg-gray-50 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                {primaryCta.text}
              </NavLink>
              <a
                href={secondaryCta.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-8 py-3.5 bg-transparent text-white font-semibold rounded-lg border-2 border-white hover:bg-white/10 transition-all duration-300"
              >
                {secondaryCta.text}
              </a>
            </div>
          </div>
        </div>
      </section>
    );
  }

  function renderEssenceSection(section: EssenceSection) {
    const { title, cards } = section.content;
    return (
      <section key="essence" className="py-16 sm:py-20">
        <h2 className="text-3xl sm:text-4xl font-bold text-[#2C3E50] mb-10 text-center">{title}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((card, index) => (
            <div
              key={index}
              className="bg-[#F5F7FA] rounded-xl p-8 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              <div className="text-5xl mb-4 text-center">{card.icon}</div>
              <h3 className="text-lg font-semibold text-[#2C3E50] mb-3 text-center">{card.title}</h3>
              <p className="text-sm leading-relaxed text-[#7F8C8D]">{card.description}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  function renderStructureSection(section: StructureSection) {
    const { title, subtitle, cards } = section.content;
    return (
      <section key="structure" className="py-16 sm:py-20">
        <h2 className="text-3xl sm:text-4xl font-bold text-[#2C3E50] mb-4 text-center">{title}</h2>
        {subtitle && <p className="text-base text-[#7F8C8D] max-w-3xl mx-auto mb-10 text-center">{subtitle}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card, index) => (
            <div
              key={index}
              className={cn(
                'rounded-xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300',
                getBgClass(card.bgColor)
              )}
            >
              <div className="text-5xl mb-3">{card.icon}</div>
              <h4 className="text-lg font-semibold text-[#2C3E50] mb-2">{card.title}</h4>
              <p className="text-sm leading-relaxed text-[#7F8C8D]">{card.description}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  function renderPeriodsSection(section: PeriodsSection) {
    const { title, periods } = section.content;
    return (
      <section key="periods" className="py-16 sm:py-20">
        <h2 className="text-3xl sm:text-4xl font-bold text-[#2C3E50] mb-10 text-center">{title}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {periods.map((period, index) => (
            <NavLink
              key={index}
              to={period.to}
              className="group bg-white rounded-lg border-2 border-[#E0E0E0] p-5 text-center hover:bg-[#4A5FA5] hover:border-[#4A5FA5] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="text-5xl mb-2">{period.icon}</div>
              <div className="text-sm font-semibold text-[#2C3E50] group-hover:text-white transition-colors">
                {period.label}
              </div>
              {period.years && (
                <div className="text-xs text-[#7F8C8D] mt-1 group-hover:text-white/80 transition-colors">
                  {period.years}
                </div>
              )}
            </NavLink>
          ))}
        </div>
      </section>
    );
  }

  function renderOrganizationSection(section: OrganizationSection) {
    const { title, cards } = section.content;
    return (
      <section key="organization" className="py-16 sm:py-20">
        <h2 className="text-3xl sm:text-4xl font-bold text-[#2C3E50] mb-10 text-center">{title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cards.map((card, index) => (
            <div
              key={index}
              className={cn(
                'bg-white rounded-xl border-2 border-[#E0E0E0] border-l-4 p-7 hover:shadow-lg transition-all duration-300',
                getBorderClass(card.borderColor)
              )}
            >
              <h3 className="text-lg font-semibold text-[#2C3E50] mb-3">{card.title}</h3>
              <div className="text-sm leading-relaxed text-[#7F8C8D]">{card.description}</div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  function renderInstructorsSection(section: InstructorsSection) {
    const { title, instructors, guestSpeakers } = section.content;
    return (
      <section key="instructors" className="py-16 sm:py-20">
        <h2 className="text-3xl sm:text-4xl font-bold text-[#2C3E50] mb-10 text-center">{title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {instructors.map((instructor, index) => (
            <div
              key={index}
              className="bg-[#FAFAFA] rounded-xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#4A5FA5] to-[#6B7FB8] flex items-center justify-center text-5xl">
                {instructor.icon}
              </div>
              <h3 className="text-xl font-semibold text-[#2C3E50] text-center mb-1">{instructor.name}</h3>
              <p className="text-sm font-medium text-[#7F8C8D] text-center mb-3">{instructor.role}</p>
              <p className="text-sm leading-relaxed text-[#7F8C8D] mb-3">{instructor.bio}</p>
              {instructor.expertise && (
                <p className="text-sm leading-relaxed text-[#7F8C8D]">
                  <span className="font-semibold text-[#2C3E50]">Экспертиза:</span> {instructor.expertise}
                </p>
              )}
            </div>
          ))}
        </div>
        {guestSpeakers && (
          <div className="bg-[#FAFAFA] rounded-xl p-6">
            <h3 className="text-lg font-semibold text-[#2C3E50] mb-3">👥 Приглашённые спикеры</h3>
            <p className="text-sm leading-relaxed text-[#7F8C8D]">{guestSpeakers}</p>
          </div>
        )}
      </section>
    );
  }

  function renderFormatSection(section: FormatSection) {
    const { title, details } = section.content;
    return (
      <section key="format" className="py-16 sm:py-20">
        <h2 className="text-3xl sm:text-4xl font-bold text-[#2C3E50] mb-10 text-center">{title}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {details.map((detail, index) => (
            <div key={index} className="bg-[#F9F9F9] rounded-lg p-5 hover:shadow-md transition-all duration-300">
              <div className="text-5xl mb-3">{detail.icon}</div>
              <h4 className="text-base font-semibold text-[#2C3E50] mb-2">{detail.title}</h4>
              <p className="text-sm text-[#7F8C8D]">{detail.description}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  function renderCTASection(section: CTASection) {
    const { title, subtitle, primaryCta, secondaryCta, contacts } = section.content;
    return (
      <section key="cta" className="py-16 sm:py-20 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-[#2C3E50] mb-4">{title}</h2>
        {subtitle && <p className="text-base text-[#7F8C8D] max-w-2xl mx-auto mb-8">{subtitle}</p>}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <NavLink
            to={primaryCta.link}
            className="inline-flex items-center justify-center px-8 py-3.5 bg-[#4A5FA5] text-white font-semibold rounded-lg hover:bg-[#3A4F95] transition-all duration-300 shadow-md hover:shadow-lg active:scale-[0.98]"
          >
            {primaryCta.text}
          </NavLink>
          <a
            href={secondaryCta.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-8 py-3.5 bg-transparent text-[#4A5FA5] font-semibold rounded-lg border-2 border-[#4A5FA5] hover:bg-[#F0F4F8] transition-all duration-300 active:scale-[0.98]"
          >
            {secondaryCta.text}
          </a>
        </div>
        {contacts && (
          <div className="text-sm text-[#7F8C8D] space-y-1 max-w-md mx-auto">
            <p className="font-semibold text-[#2C3E50]">Контакты организаторов:</p>
            <p>
              📞{' '}
              <a href={`tel:${contacts.phone.replace(/\s/g, '')}`} className="text-[#4A5FA5] hover:underline">
                {contacts.phone}
              </a>
            </p>
            <p>
              📧{' '}
              <a href={`mailto:${contacts.email}`} className="text-[#4A5FA5] hover:underline">
                {contacts.email}
              </a>
            </p>
            <p>💬 Telegram: {contacts.telegram}</p>
          </div>
        )}
      </section>
    );
  }

  function renderSimpleCTASection(section: CTAClinicalSection | CTAGeneralSection) {
    const { title, subtitle, primaryCta, secondaryCta } = section.content;
    const key = section.type; // 'cta-clinical' or 'cta-general'
    return (
      <section key={key} className="py-16 sm:py-20 text-center bg-gradient-to-br from-[#F5F7FA] to-[#E8EFF5] rounded-2xl">
        <h2 className="text-3xl sm:text-4xl font-bold text-[#2C3E50] mb-4">{title}</h2>
        {subtitle && <p className="text-base text-[#7F8C8D] max-w-2xl mx-auto mb-8">{subtitle}</p>}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <NavLink
            to={primaryCta.link}
            className="inline-flex items-center justify-center px-8 py-3.5 bg-[#4A5FA5] text-white font-semibold rounded-lg hover:bg-[#3A4F95] transition-all duration-300 shadow-md hover:shadow-lg active:scale-[0.98]"
          >
            {primaryCta.text}
          </NavLink>
          <NavLink
            to={secondaryCta.link}
            className="inline-flex items-center justify-center px-8 py-3.5 bg-transparent text-[#4A5FA5] font-semibold rounded-lg border-2 border-[#4A5FA5] hover:bg-white transition-all duration-300 active:scale-[0.98]"
          >
            {secondaryCta.text}
          </NavLink>
        </div>
      </section>
    );
  }

  function renderHomeMvpDashboard() {
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
    const placeholderCatalog = [
      { icon: '🧬', title: 'Нейропсихология', lessons: '14 лекций' },
      { icon: '💬', title: 'Психология общения', lessons: '10 лекций' },
      { icon: '🌱', title: 'Позитивная психология', lessons: '8 лекций' },
    ];

    return (
      <section className="py-8 sm:py-10">
        <div className="space-y-4">
          <section className="space-y-3">
            <p className="text-sm font-medium text-[#556476]">Добрый день, {displayName}</p>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {primaryContinueCourses.map((course, index) => (
                <article
                  key={course.id}
                  className={cn(
                    'overflow-hidden rounded-2xl border bg-white shadow-[0_12px_26px_rgba(18,44,84,0.12)]',
                    index === 0 ? 'border-[#D4E4FF]' : 'border-[#DDE5EE]'
                  )}
                >
                  <div className="flex min-h-[220px] flex-col sm:flex-row">
                    <div
                      className={cn(
                        'flex w-full items-center justify-center p-6 sm:w-[34%]',
                        index === 0
                          ? 'bg-gradient-to-br from-[#EAF1FF] to-[#DCE8FF]'
                          : 'bg-gradient-to-br from-[#F0F5FF] to-[#E6EEFF]'
                      )}
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
                    Курсы для продолжения пока не найдены. Откройте любой курс из блока «Мои курсы».
                  </p>
                </article>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl border border-[#DDE5EE] bg-white p-4 text-[#2C3E50]">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-2xl font-bold">Мои курсы</h3>
              <NavLink to="/profile" className="text-sm font-semibold text-[#3359CB] hover:text-[#2A49A8]">
                Все курсы →
              </NavLink>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {subjects.map((subject) => {
                const progress = progressByCourse.get(subject.id) ?? { completed: 0, total: 0, percent: 0 };
                const active = subject.id === currentCourse;
                return (
                  <button
                    key={subject.id}
                    type="button"
                    onClick={() => {
                      void handleOpenSubject(subject.id);
                    }}
                    disabled={openingCourseId === subject.id}
                    className={cn(
                      'rounded-xl border p-4 text-left transition',
                      active
                        ? 'border-[#8eb7ff] bg-[#d7e6ff] text-[#1e2b3a]'
                        : 'border-[#D8E2EE] bg-[#F9FBFF] text-[#2C3E50] hover:border-[#9EB7D9]'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{subject.icon}</span>
                      <span className={cn('text-xs font-semibold', active ? 'text-[#4e5d74]' : 'text-[#6B7A8D]')}>
                        {progress.percent}%
                      </span>
                    </div>
                    <p className={cn('mt-2 text-lg font-semibold leading-tight', active ? 'text-[#233149]' : 'text-[#2C3E50]')}>
                      {subject.name}
                    </p>
                    <div className={cn('mt-3 h-1.5 rounded-full', active ? 'bg-[#bcd5ff]' : 'bg-[#DEE8F5]')}>
                      <div
                        className={cn('h-full rounded-full', active ? 'bg-[#3f78ff]' : 'bg-[#7aa2ff]')}
                        style={{ width: `${Math.max(progress.percent, 4)}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
            {courseOpenError ? (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {courseOpenError}
              </p>
            ) : null}
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
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {placeholderCatalog.map((course, index) => (
                <div key={course.title} className={cn(
                  'rounded-xl border p-4',
                  index === 0 ? 'border-[#8eb7ff] bg-[#d7e6ff]' : 'border-[#D8E2EE] bg-[#F9FBFF]'
                )}>
                  <p className="text-2xl">{course.icon}</p>
                  <p className="mt-2 text-xl font-semibold text-[#2C3E50]">{course.title}</p>
                  <p className="text-sm text-[#5E6D7A]">{course.lessons}</p>
                  <span className="mt-2 inline-flex rounded-full border border-[#D6DFED] bg-white px-2.5 py-1 text-xs font-semibold text-[#6B7A8D]">
                    Скоро
                  </span>
                </div>
              ))}
            </div>
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

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: pageTransition }}
      exit={{ opacity: 0, transition: pageTransition }}
      className="flex-1"
    >
      <Helmet>
        <title>{SITE_NAME} — Психология развития от рождения до глубокой старости</title>
        <meta
          name="description"
          content="Интерактивный курс по психологии развития человека. 14 возрастных периодов, видео-лекции, тесты и практические инструменты."
        />
      </Helmet>

      {/* Render all other sections inside container */}
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-10">
        {renderHomeMvpDashboard()}
        {activeSections
          .filter((s) => s.type === 'hero')
          .map((section) => renderSection(section))}
        {nonHeroSections.map((section) => renderSection(section))}
      </div>
    </Motion.div>
  );
}
