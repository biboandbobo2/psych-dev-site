// File: src/app/AppShell.tsx
// AppShell отвечает за отображение основного контента и маршрутов,
// опираясь на ROUTE_CONFIG, Zustand-сторы и UI-компоненты. Провайдеры (Router/Auth) живут в src/App.tsx.
import { useMemo, useEffect, useRef, type ReactNode } from 'react';
import { NavLink, useLocation, type Location } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { AnimatePresence } from 'framer-motion';
import { ROUTE_CONFIG, CLINICAL_ROUTE_CONFIG, GENERAL_ROUTE_CONFIG, SITE_NAME } from '../routes';
import { usePeriods } from '../hooks/usePeriods';
import { useClinicalTopics } from '../hooks/useClinicalTopics';
import { useGeneralTopics } from '../hooks/useGeneralTopics';
import { useDynamicCourseLessons } from '../hooks/useDynamicCourseLessons';
import { Button } from '../components/ui/Button';
import { NavigationProgress } from '../components/ui/NavigationProgress';
import { BackToTop } from '../components/ui/BackToTop';
import { useAuthStore } from '../stores/useAuthStore';
import { useCourseStore } from '../stores/useCourseStore';
import { useLoginModal } from '../hooks/useLoginModal';
import LoginModal from '../components/LoginModal';
import TelegramOpenInBrowser from '../components/TelegramOpenInBrowser';
import { useAuthSync } from '../hooks/useAuthSync';
import { AppLayout } from '../layouts/AppLayout';
import { LoadingSplash, ErrorState, EmptyState } from '../shared/ui/states';
import { useScrollRestoration } from '../hooks/useScrollRestoration';
import { AppRoutes } from './AppRoutes';
import SuperAdminTaskPanel from '../components/SuperAdminTaskPanel';
import AdminCourseSidebar from '../components/AdminCourseSidebar';
import StudentCourseSidebar from '../components/StudentCourseSidebar';
import { isCoreCourse } from '../constants/courses';
import { buildCourseNavItems, type CourseNavItem } from '../lib/courseNavItems';
import { getPageCourseId, shouldShowStudentCourseSidebar } from './courseNavigation';
import { saveLastCourseLesson } from '../lib/lastCourseLesson';
import type { Period, ClinicalTopic, GeneralTopic } from '../types/content';

function normalizePath(path: string): string;
function normalizePath(path: string | undefined | null): string | undefined | null;
function normalizePath(path: string | undefined | null): string | undefined | null {
  return path && path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;
}
const EMPTY_ROUTE_DATA: Map<string, Period> = new Map();

function getCourseNavTopicsMap(
  courseId: string | null,
  periodMap: Map<string, Period>,
  clinicalTopicsMap: Map<string, ClinicalTopic>,
  generalTopicsMap: Map<string, GeneralTopic>,
  dynamicLessonsMap: Map<string, Period>
): Map<string, Period> {
  if (courseId === 'development') return periodMap;
  if (courseId === 'clinical') return clinicalTopicsMap as Map<string, Period>;
  if (courseId === 'general') return generalTopicsMap as Map<string, Period>;
  return dynamicLessonsMap;
}

function RoutePager({ currentPath, navItems }: { currentPath: string; navItems: CourseNavItem[] }) {
  const normalizedPath = normalizePath(currentPath);
  const currentIndex = navItems.findIndex((item) => normalizePath(item.path) === normalizedPath);
  if (currentIndex === -1) return null;
  const prev = currentIndex > 0 ? navItems[currentIndex - 1] : null;
  const next = currentIndex < navItems.length - 1 ? navItems[currentIndex + 1] : null;

  return (
    <div className="mt-10 w-full grid items-center gap-3 grid-cols-1 sm:grid-cols-[1fr_auto_1fr] sm:gap-4">
      <div className="justify-self-start">
        {prev ? (
          <Button
            as={NavLink}
            to={prev.path}
            variant="secondary"
            className="w-full sm:w-auto flex items-center justify-center gap-2"
          >
            <span aria-hidden="true">←</span>
            <span>{prev.label}</span>
          </Button>
        ) : (
          <span className="hidden sm:block" />
        )}
      </div>
      <div className="justify-self-center">
        <BackToTop />
      </div>
      <div className="justify-self-end">
        {next ? (
          <Button
            as={NavLink}
            to={next.path}
            className="w-full sm:w-auto flex items-center justify-center gap-2"
          >
            <span>{next.label}</span>
            <span aria-hidden="true">→</span>
          </Button>
        ) : (
          <span className="hidden sm:block" />
        )}
      </div>
    </div>
  );
}

interface StandaloneLandingShellProps {
  location: Location;
  isSuperAdmin: boolean;
  isCoAdmin: boolean;
}

function StandaloneLandingShell({ location, isSuperAdmin, isCoAdmin }: StandaloneLandingShellProps) {
  return (
    <AppRoutes
      location={location}
      periodMap={EMPTY_ROUTE_DATA}
      clinicalTopicsMap={EMPTY_ROUTE_DATA}
      generalTopicsMap={EMPTY_ROUTE_DATA}
      isSuperAdmin={isSuperAdmin}
      isCoAdmin={isCoAdmin}
    />
  );
}

interface MainAppShellProps {
  location: Location;
  normalizedPath: string;
  isSuperAdmin: boolean;
  isCoAdmin: boolean;
}

function MainAppShell({ location, normalizedPath, isSuperAdmin, isCoAdmin }: MainAppShellProps) {
  const { periods, loading, error } = usePeriods();
  const { topics: clinicalTopics, loading: clinicalLoading, error: clinicalError } = useClinicalTopics();
  const { topics: generalTopics, loading: generalLoading, error: generalError } = useGeneralTopics();
  const user = useAuthStore((state) => state.user);
  const authLoading = useAuthStore((state) => state.loading);
  const setCurrentCourse = useCourseStore((state) => state.setCurrentCourse);
  const isSuperAdminPage = normalizedPath === '/superadmin';
  const isAdminContentPage = normalizedPath.startsWith('/admin/content');
  const isHomePage = normalizedPath === '/home' || normalizedPath === '/homepage';
  const isProfilePage = normalizedPath === '/profile';
  const isNotesPage = normalizedPath === '/notes';
  const isAboutPage = normalizedPath === '/about';
  const isProjectsPage = normalizedPath.startsWith('/projects/');
  const hideNavigation =
    normalizedPath.startsWith('/admin') ||
    normalizedPath.startsWith('/superadmin') ||
    normalizedPath.startsWith('/coadmin') ||
    normalizedPath.startsWith('/_debug') ||
    isHomePage ||
    isProfilePage ||
    isAboutPage ||
    isProjectsPage;
  const { isOpen, openModal, closeModal } = useLoginModal();

  // Используем глобальный store для курса
  const currentCourse = useCourseStore((state) => state.currentCourse);
  const pageCourseId = getPageCourseId(normalizedPath);
  const showStudentSidebar = !isProfilePage && shouldShowStudentCourseSidebar(normalizedPath);
  const lastSidebarPathRef = useRef<string | null>(null);
  const shouldMirrorPageCourseInSidebar = Boolean(pageCourseId && lastSidebarPathRef.current !== normalizedPath);
  const sidebarCourseId = shouldMirrorPageCourseInSidebar ? pageCourseId : currentCourse;

  useEffect(() => {
    // Ищем роут во всех трех конфигурациях
    const route = ROUTE_CONFIG.find((entry) => entry.path === normalizedPath) ||
                  CLINICAL_ROUTE_CONFIG.find((entry) => entry.path === normalizedPath) ||
                  GENERAL_ROUTE_CONFIG.find((entry) => entry.path === normalizedPath);

    if (!route && normalizedPath !== '/development/intro') {
      document.title = SITE_NAME;
      return;
    }

    if (normalizedPath === '/development/intro') {
      document.title = `Психология развития — главная страница курса — ${SITE_NAME}`;
      return;
    }

    const label = route.navLabel || SITE_NAME;
    const title = route.meta?.title ?? `${label} — ${SITE_NAME}`;
    document.title = title;
  }, [normalizedPath]);

  useEffect(() => {
    lastSidebarPathRef.current = normalizedPath;

    if (pageCourseId) {
      setCurrentCourse(pageCourseId);
    }
  }, [normalizedPath, pageCourseId, setCurrentCourse]);

  const periodMap = useMemo(() => {
    const map = new Map<string, Period>();
    periods.forEach((period) => {
      const key = (period as Period & { id?: string }).id ?? period.period;
      if (key) {
        map.set(key, period);
      }
    });
    return map;
  }, [periods]);

  const clinicalTopicsMap = useMemo(() => {
    return clinicalTopics || new Map();
  }, [clinicalTopics]);

  const generalTopicsMap = useMemo(() => {
    return generalTopics || new Map();
  }, [generalTopics]);

  // Определяем курс: либо по пути (для страниц курсов), либо из store (для профиля/админки/тестов)
  const isProfileOrAdmin = normalizedPath === '/' || normalizedPath === '/profile' || normalizedPath.startsWith('/admin/content');
  const isTestsPage = normalizedPath.startsWith('/tests');
  const useCourseFromStore = isProfileOrAdmin || isTestsPage || isNotesPage;
  const pageNavigationCourseId = useCourseFromStore ? currentCourse : (pageCourseId ?? 'development');
  const pageDynamicCourseId = pageNavigationCourseId && !isCoreCourse(pageNavigationCourseId)
    ? pageNavigationCourseId
    : null;
  const sidebarDynamicCourseId = sidebarCourseId && !isCoreCourse(sidebarCourseId)
    ? sidebarCourseId
    : null;
  const { topics: pageDynamicLessonsMap, loading: pageDynamicLoading, error: pageDynamicError } =
    useDynamicCourseLessons(pageDynamicCourseId, true);
  const { topics: sidebarDynamicLessonsMap, loading: sidebarDynamicLoading, error: sidebarDynamicError } =
    useDynamicCourseLessons(sidebarDynamicCourseId, true);
  const navItems = useMemo(
    () => buildCourseNavItems(
      pageNavigationCourseId,
      getCourseNavTopicsMap(
        pageNavigationCourseId,
        periodMap,
        clinicalTopicsMap,
        generalTopicsMap,
        pageDynamicLessonsMap,
      ),
      { includeMissingStaticRoutes: false }
    ),
    [pageNavigationCourseId, periodMap, clinicalTopicsMap, generalTopicsMap, pageDynamicLessonsMap]
  );
  const sidebarNavItems = useMemo(
    () => buildCourseNavItems(
      sidebarCourseId,
      getCourseNavTopicsMap(
        sidebarCourseId,
        periodMap,
        clinicalTopicsMap,
        generalTopicsMap,
        sidebarDynamicLessonsMap,
      ),
      { includeMissingStaticRoutes: false }
    ),
    [sidebarCourseId, periodMap, clinicalTopicsMap, generalTopicsMap, sidebarDynamicLessonsMap]
  );
  const dynamicNavigationLoading = Boolean(pageDynamicCourseId) && pageDynamicLoading;
  const dynamicNavigationErrorMessage = pageDynamicError ? 'Не удалось загрузить навигацию курса.' : null;
  const sidebarNavigationLoading = Boolean(sidebarDynamicCourseId) && sidebarDynamicLoading;
  const sidebarNavigationErrorMessage = sidebarDynamicError ? 'Не удалось загрузить навигацию курса.' : null;

  useEffect(() => {
    if (!pageCourseId) return;

    const activeNavItem = navItems.find((item) => normalizePath(item.path) === normalizedPath);
    if (!activeNavItem) {
      return;
    }
    saveLastCourseLesson(pageCourseId, normalizedPath, activeNavItem?.label);
  }, [pageCourseId, normalizedPath, navItems]);

  const sidebar = isSuperAdmin && isSuperAdminPage
    ? <SuperAdminTaskPanel />
    : isAdminContentPage
      ? <AdminCourseSidebar />
      : showStudentSidebar
        ? (
          <StudentCourseSidebar
            navItems={sidebarNavItems}
            courseNavigationLoading={sidebarNavigationLoading}
            courseNavigationError={sidebarNavigationErrorMessage}
          />
        )
        : undefined;
  const sidebarWidthClass = isSuperAdmin && isSuperAdminPage
    ? "lg:w-[360px] xl:w-[420px]"
    : isAdminContentPage || showStudentSidebar
      ? "lg:w-64 xl:w-72"
      : undefined;

  if (loading || clinicalLoading || generalLoading) return <LoadingSplash />;
  if (error) return <ErrorState message={(error as unknown as { message: string }).message} />;
  if (clinicalError) return <ErrorState message={clinicalError.message} />;
  if (generalError) return <ErrorState message={generalError.message} />;
  if (!periods.length && !pageDynamicCourseId) return <EmptyState />;

  return (
    <>
      <Helmet>
        <title>{SITE_NAME}</title>
        <meta
          name="description"
          content="Образовательный ресурс по возрастной психологии."
        />
      </Helmet>
      <NavigationProgress />
      <LoginModal isOpen={isOpen} onClose={closeModal} />
      <TelegramOpenInBrowser />
      <AppLayout
        navItems={navItems}
        user={user}
        authLoading={authLoading}
        onLoginClick={openModal}
        hideNavigation={hideNavigation}
        sidebar={sidebar}
        sidebarWidthClass={sidebarWidthClass}
        navigationLoading={dynamicNavigationLoading}
        navigationErrorMessage={dynamicNavigationErrorMessage}
      >
        <AnimatePresence mode="wait" initial={false}>
          <AppRoutes location={location} periodMap={periodMap} clinicalTopicsMap={clinicalTopicsMap} generalTopicsMap={generalTopicsMap} isSuperAdmin={isSuperAdmin} isCoAdmin={isCoAdmin} />
        </AnimatePresence>
        <RoutePager currentPath={location.pathname} navItems={navItems} />
      </AppLayout>
    </>
  );
}

export function AppShell() {
  useAuthSync();
  useScrollRestoration();
  const location = useLocation();
  const normalizedPath = normalizePath(location.pathname);
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin);
  const isCoAdmin = useAuthStore((state) => state.isCoAdmin);

  // Standalone routes should not pay the cost of unrelated content hooks or generic loaders.
  const isStandaloneLanding = normalizedPath === '/warm_springs2' || normalizedPath.startsWith('/booking');
  if (isStandaloneLanding) {
    return (
      <StandaloneLandingShell
        location={location}
        isSuperAdmin={isSuperAdmin}
        isCoAdmin={isCoAdmin}
      />
    );
  }

  return (
    <MainAppShell
      location={location}
      normalizedPath={normalizedPath}
      isSuperAdmin={isSuperAdmin}
      isCoAdmin={isCoAdmin}
    />
  );
}
