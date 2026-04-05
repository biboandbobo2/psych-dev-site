import { useMemo, useState } from 'react';
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
import { FeedbackModal } from '../components/FeedbackModal';
import { getLastCourseLesson } from '../lib/lastCourseLesson';
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
  const { user, isAdmin } = useAuth();
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
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
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
  const currentCourseName = courses.find((course) => course.id === currentCourse)?.name ?? 'Текущий курс';
  const fallbackPrimaryLesson = resolvePrimaryLesson(currentCourse);
  const lastCourseLesson = getLastCourseLesson(currentCourse);
  const primaryLessonLink = lastCourseLesson?.path ?? fallbackPrimaryLesson.link;
  const primaryLessonTitle = lastCourseLesson?.label ?? fallbackPrimaryLesson.title;
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

    return (
      <section className="py-8 sm:py-10">
        <div className="space-y-4">
          <div className="rounded-3xl border border-[#B7CCFF] bg-gradient-to-br from-[#2E4DD7] via-[#3C63F0] to-[#00A7E1] p-6 text-white shadow-lg sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/80">ЦЕНТР ПЛАТФОРМЫ</p>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black leading-tight sm:text-4xl">Дом</h2>
                <p className="mt-2 max-w-2xl text-sm text-white/90 sm:text-base">
                  {user ? `Здравствуйте, ${user.displayName || user.email?.split('@')[0] || 'студент'}!` : 'Добро пожаловать!'}
                  {' '}Здесь вы видите ключевые предметы, объявления и ближайшие события платформы.
                </p>
              </div>
              {!user && (
                <NavLink
                  to="/login"
                  className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#2444C8] shadow transition hover:bg-[#F3F7FF]"
                >
                  Войти
                </NavLink>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[#DDE5EE] bg-white p-5 shadow-sm sm:p-6">
            <h3 className="text-lg font-semibold text-[#2C3E50]">Курсы</h3>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {subjects.map((subject) => (
                <button
                  key={subject.id}
                  type="button"
                  onClick={() => {
                    void handleOpenSubject(subject.id);
                  }}
                  disabled={openingCourseId === subject.id}
                  className="group rounded-xl border border-[#D8E2EE] bg-[#F9FBFF] p-4 text-left transition hover:-translate-y-0.5 hover:border-[#9EB7D9] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{subject.icon}</span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#4A5FA5]">
                      {openingCourseId === subject.id ? 'Открытие...' : 'Открыть'}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-[#2C3E50]">{subject.name}</p>
                </button>
              ))}
            </div>
            {courseOpenError ? (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {courseOpenError}
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-[#C8D7ED] bg-gradient-to-r from-[#FFFFFF] to-[#F1F7FF] p-5 shadow-sm sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3E5EB3]">Быстрый шаг</p>
            <h3 className="mt-1 text-2xl font-extrabold text-[#1F335B] sm:text-3xl">Продолжить обучение</h3>
            <p className="mt-1 text-sm text-[#5D6B7D]">
              Курс сейчас: <span className="font-semibold text-[#1F335B]">{currentCourseName}</span>
            </p>
            <p className="mt-1 text-sm text-[#2B3F65]">
              Следующая лекция: <span className="font-semibold">{primaryLessonTitle}</span>
            </p>
            <div className="mt-4">
              <NavLink
                to={primaryLessonLink}
                className="inline-flex min-w-[220px] items-center justify-center rounded-xl bg-[#274AD6] px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#1E3FC0] hover:shadow-xl"
              >
                Продолжить обучение
              </NavLink>
            </div>
          </div>

          <div className="space-y-4">
            <article className="rounded-xl border border-[#DDE5EE] bg-white p-4">
              <h3 className="text-base font-semibold text-[#2C3E50]">Объявления</h3>
              {feedLoading ? (
                <p className="mt-2 text-sm text-[#667788]">Загрузка объявлений...</p>
              ) : announcements.length === 0 ? (
                <p className="mt-2 rounded-lg bg-[#F5F8FC] px-3 py-2 text-sm text-[#5E6D7A]">
                  Пока нет объявлений. Администратор добавит их здесь.
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {announcements.map((item) => (
                    <li key={item.id} className="rounded-lg bg-[#F5F8FC] px-3 py-2 text-sm text-[#5E6D7A]">
                      {item.text}
                    </li>
                  ))}
                </ul>
              )}
              {isAdmin && (
                <div className="mt-3 space-y-2 rounded-lg border border-[#DFE7F3] bg-[#FAFCFF] p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#4A5FA5]">Добавить объявление</p>
                  <textarea
                    value={announcementDraft}
                    onChange={(event) => setAnnouncementDraft(event.target.value)}
                    rows={3}
                    maxLength={400}
                    placeholder="Текст объявления для всех пользователей..."
                    className="w-full rounded-lg border border-[#C9D6E6] px-3 py-2 text-sm text-[#243447] focus:border-[#5B7FD1] focus:outline-none focus:ring-2 focus:ring-[#DCE7FF]"
                  />
                  <button
                    type="button"
                    onClick={handleAddAnnouncement}
                    disabled={isFeedSaving}
                    className="inline-flex rounded-lg bg-[#3359CB] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#2A49A8] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isFeedSaving ? 'Сохранение...' : 'Опубликовать объявление'}
                  </button>
                </div>
              )}
            </article>

            <article className="rounded-xl border border-[#DDE5EE] bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-[#2C3E50]">События</h3>
                <button
                  type="button"
                  onClick={openEventsCalendar}
                  className="inline-flex rounded-lg border border-[#C5D6EE] bg-[#F4F8FF] px-3 py-1.5 text-xs font-semibold text-[#3359CB] transition hover:bg-[#E9F1FF]"
                >
                  Открыть календарь
                </button>
              </div>
              {feedLoading ? (
                <p className="mt-2 text-sm text-[#667788]">Загрузка событий...</p>
              ) : events.length === 0 ? (
                <p className="mt-2 rounded-lg bg-[#F8FAFD] px-3 py-2 text-sm text-[#5E6D7A]">
                  Пока нет событий. Администратор может добавить их в этом блоке.
                </p>
              ) : (
                <div className="mt-2 space-y-2">
                  {events.map((event) => (
                    <div key={event.id} className="rounded-lg bg-[#F8FAFD] px-3 py-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#4A5FA5]">{event.dateLabel}</p>
                      <p className="mt-1 text-sm text-[#5E6D7A]">{event.text}</p>
                    </div>
                  ))}
                </div>
              )}
              {isAdmin && (
                <div className="mt-3 space-y-2 rounded-lg border border-[#DFE7F3] bg-[#FAFCFF] p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#4A5FA5]">Добавить событие</p>
                  <input
                    type="date"
                    value={eventDateDraft}
                    onChange={(event) => setEventDateDraft(event.target.value)}
                    maxLength={80}
                    className="w-full rounded-lg border border-[#C9D6E6] px-3 py-2 text-sm text-[#243447] focus:border-[#5B7FD1] focus:outline-none focus:ring-2 focus:ring-[#DCE7FF]"
                  />
                  <textarea
                    value={eventTextDraft}
                    onChange={(event) => setEventTextDraft(event.target.value)}
                    rows={3}
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
                    {isFeedSaving ? 'Сохранение...' : 'Опубликовать событие'}
                  </button>
                </div>
              )}
            </article>

            <article className="rounded-xl border border-[#DDE5EE] bg-white p-4">
              <h3 className="text-base font-semibold text-[#2C3E50]">Обратная связь</h3>
              <p className="mt-2 text-sm text-[#5E6D7A]">
                Есть идея по улучшению платформы или замечание по учебному процессу? Напишите нам.
              </p>
              <button
                type="button"
                onClick={() => setIsFeedbackOpen(true)}
                className="mt-3 inline-flex rounded-lg bg-[#0E9F8E] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#0A8A7A]"
              >
                Открыть форму обратной связи
              </button>
            </article>
          </div>

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

      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
    </Motion.div>
  );
}
