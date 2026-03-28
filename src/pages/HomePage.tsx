import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion as Motion } from 'framer-motion';
import { NavLink } from 'react-router-dom';
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

export function HomePage() {
  const { user, isAdmin } = useAuth();
  const { currentCourse } = useCourseStore();
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

  // Sort sections by order and filter enabled ones
  const activeSections = content.sections.filter((s) => s.enabled).sort((a, b) => a.order - b.order);
  const currentCourseName = courses.find((course) => course.id === currentCourse)?.name ?? 'Текущий курс';
  const fallbackPrimaryLesson = resolvePrimaryLesson(currentCourse);
  const lastCourseLesson = getLastCourseLesson(currentCourse);
  const primaryLessonLink = lastCourseLesson?.path ?? fallbackPrimaryLesson.link;
  const primaryLessonTitle = lastCourseLesson?.label ?? fallbackPrimaryLesson.title;
  const featuredSubjects = courses.slice(0, 4).map((course) => ({
    id: course.id,
    name: course.name,
    icon: course.icon,
    link: `/profile?course=${encodeURIComponent(course.id as CourseType)}`,
  }));
  const fallbackSubjects = [
    { id: 'development', name: 'Психология развития', icon: '👶', link: '/profile?course=development' },
    { id: 'clinical', name: 'Основы патопсихологии', icon: '🧠', link: '/profile?course=clinical' },
    { id: 'general', name: 'Введение в клиническую психологию', icon: '📘', link: '/profile?course=general' },
    { id: 'personal-tools', name: 'Личный кабинет', icon: '🎓', link: '/profile' },
  ];
  const subjects = featuredSubjects.length >= 4
    ? featuredSubjects
    : [...featuredSubjects, ...fallbackSubjects.filter((item) => !featuredSubjects.some((course) => course.id === item.id))].slice(0, 4);

  const recommendations = [
    {
      title: 'Перейти к текущему курсу',
      description: 'Откройте основное занятие выбранного курса и продолжите обучение.',
      link: primaryLessonLink,
      action: 'Открыть занятие',
    },
    {
      title: 'Проверить прогресс по тестам',
      description: 'Просмотрите результаты и продолжите тренировки по текущему курсу.',
      link: '/tests',
      action: 'Открыть тесты',
    },
    {
      title: 'Открыть личный кабинет',
      description: 'Календарь, уведомления и достижения находятся в профиле студента.',
      link: '/profile',
      action: 'Перейти в профиль',
    },
  ];

  const nonHeroSections = activeSections
    .filter((section) => section.type !== 'hero')
    .sort((a, b) => {
      const typePriority = (type: HomePageSection['type']) => {
        if (type === 'essence') return 0;
        if (type === 'periods') return 2;
        return 1;
      };

      const priorityA = typePriority(a.type);
      const priorityB = typePriority(b.type);
      if (priorityA !== priorityB) return priorityA - priorityB;
      return a.order - b.order;
    });

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
            <h3 className="text-lg font-semibold text-[#2C3E50]">Предметы</h3>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {subjects.map((subject) => (
                <NavLink
                  key={subject.id}
                  to={subject.link}
                  className="group rounded-xl border border-[#D8E2EE] bg-[#F9FBFF] p-4 transition hover:-translate-y-0.5 hover:border-[#9EB7D9] hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{subject.icon}</span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#4A5FA5]">
                      Открыть
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-[#2C3E50]">{subject.name}</p>
                </NavLink>
              ))}
            </div>
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

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
              <h3 className="text-base font-semibold text-[#2C3E50]">События</h3>
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
                    type="text"
                    value={eventDateDraft}
                    onChange={(event) => setEventDateDraft(event.target.value)}
                    maxLength={80}
                    placeholder="Период, например: Май 2026"
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

            <article className="rounded-xl border border-[#DDE5EE] bg-white p-4 lg:col-span-2">
              <h3 className="text-base font-semibold text-[#2C3E50]">Рекомендуем пройти дальше</h3>
              <div className="mt-2 space-y-2">
                {recommendations.map((item) => (
                  <div key={item.title} className="rounded-lg border border-[#E6EDF5] bg-[#FCFDFF] px-3 py-3">
                    <p className="text-sm font-semibold text-[#2C3E50]">{item.title}</p>
                    <p className="mt-1 text-sm text-[#6B7B88]">{item.description}</p>
                    <NavLink
                      to={item.link}
                      className="mt-2 inline-flex text-xs font-semibold text-[#4A5FA5] hover:underline"
                    >
                      {item.action}
                    </NavLink>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-lg border border-[#D7E3EF] bg-[#EFF5FB] px-3 py-2">
                <p className="text-sm text-[#37516B]">
                  Есть идея по улучшению платформы? Напишите нам через обратную связь.
                </p>
                <button
                  type="button"
                  onClick={() => setIsFeedbackOpen(true)}
                  className="mt-2 inline-flex rounded-lg bg-[#0E9F8E] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#0A8A7A]"
                >
                  Обратная связь
                </button>
              </div>
            </article>
          </div>

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
