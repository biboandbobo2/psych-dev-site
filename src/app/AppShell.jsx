// File: src/app/AppShell.jsx
// AppShell отвечает за отображение основного контента и маршрутов,
// опираясь на ROUTE_CONFIG, Zustand-сторы и UI-компоненты. Провайдеры (Router/Auth) живут в src/App.jsx.
import React, { useMemo, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { AnimatePresence } from 'framer-motion';
import { ROUTE_CONFIG, CLINICAL_ROUTE_CONFIG, GENERAL_ROUTE_CONFIG, SITE_NAME } from '../routes';
import { usePeriods } from '../hooks/usePeriods';
import { useClinicalTopics } from '../hooks/useClinicalTopics';
import { useGeneralTopics } from '../hooks/useGeneralTopics';
import { Button } from '../components/ui/Button';
import { NavigationProgress } from '../components/ui/NavigationProgress';
import { BackToTop } from '../components/ui/BackToTop';
import { useAuthStore } from '../stores/useAuthStore';
import { useLoginModal } from '../hooks/useLoginModal';
import LoginModal from '../components/LoginModal';
import { useAuthSync } from '../hooks/useAuthSync';
import { AppLayout } from '../layouts/AppLayout';
import { LoadingSplash, ErrorState, EmptyState } from '../shared/ui/states';
import { useScrollRestoration } from '../hooks/useScrollRestoration';
import { AppRoutes } from './AppRoutes';

const normalizePath = (path) =>
  path && path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;

function RoutePager({ currentPath }) {
  const normalizedPath = normalizePath(currentPath);

  // Определяем, на какой странице мы находимся, и используем соответствующую конфигурацию
  const isClinical = normalizedPath.startsWith('/clinical');
  const isGeneral = normalizedPath.startsWith('/general');
  const routes = isClinical ? CLINICAL_ROUTE_CONFIG :
                 isGeneral ? GENERAL_ROUTE_CONFIG :
                 ROUTE_CONFIG;

  const currentIndex = routes.findIndex((route) => route.path === normalizedPath);
  if (currentIndex === -1) return null;
  const prev = currentIndex > 0 ? routes[currentIndex - 1] : null;
  const next = currentIndex < routes.length - 1 ? routes[currentIndex + 1] : null;
  if (!prev && !next) return null;

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
            <span>{prev.navLabel}</span>
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
            <span>{next.navLabel}</span>
            <span aria-hidden="true">→</span>
          </Button>
        ) : (
          <span className="hidden sm:block" />
        )}
      </div>
    </div>
  );
}

export function AppShell() {
  useAuthSync();
  useScrollRestoration();
  const { periods, loading, error } = usePeriods();
  const { topics: clinicalTopics, loading: clinicalLoading, error: clinicalError } = useClinicalTopics();
  const { topics: generalTopics, loading: generalLoading, error: generalError } = useGeneralTopics();
  const location = useLocation();
  const normalizedPath = normalizePath(location.pathname);
  const user = useAuthStore((state) => state.user);
  const authLoading = useAuthStore((state) => state.loading);
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin);
  const { isOpen, openModal, closeModal } = useLoginModal();

  // Проверяем параметр course из URL для страниц редактирования
  const searchParams = new URLSearchParams(location.search);
  const courseParam = searchParams.get('course');

  useEffect(() => {
    // Ищем роут во всех трех конфигурациях
    const route = ROUTE_CONFIG.find((entry) => entry.path === normalizedPath) ||
                  CLINICAL_ROUTE_CONFIG.find((entry) => entry.path === normalizedPath) ||
                  GENERAL_ROUTE_CONFIG.find((entry) => entry.path === normalizedPath);

    if (!route) {
      document.title = SITE_NAME;
      return;
    }

    const label = route.navLabel || SITE_NAME;
    const title = route.meta?.title ?? `${label} — ${SITE_NAME}`;
    document.title = title;
  }, [normalizedPath]);

  const periodMap = useMemo(() => {
    const map = new Map();
    periods.forEach((period) => {
      const key = period.id ?? period.period;
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

  // Определяем курс: development (по умолчанию), clinical или general
  // Проверяем либо путь, либо параметр course
  const isClinicalPage = normalizedPath.startsWith('/clinical') || courseParam === 'clinical';
  const isGeneralPage = normalizedPath.startsWith('/general') || courseParam === 'general';

  const navItems = useMemo(() => {
    // Выбираем конфигурацию в зависимости от курса
    const routes = isClinicalPage ? CLINICAL_ROUTE_CONFIG :
                   isGeneralPage ? GENERAL_ROUTE_CONFIG :
                   ROUTE_CONFIG;
    const dataMap = isClinicalPage ? clinicalTopicsMap :
                    isGeneralPage ? generalTopicsMap :
                    periodMap;

    return routes.map((config) => {
      const data = config.periodId ? dataMap.get(config.periodId) : null;
      return {
        path: config.path,
        label: data?.label || data?.title || config.navLabel,
      };
    });
  }, [periodMap, clinicalTopicsMap, generalTopicsMap, isClinicalPage, isGeneralPage]);

  if (loading || clinicalLoading || generalLoading) return <LoadingSplash />;
  if (error) return <ErrorState message={error.message} />;
  if (clinicalError) return <ErrorState message={clinicalError.message} />;
  if (generalError) return <ErrorState message={generalError.message} />;
  if (!periods.length) return <EmptyState />;

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
      <AppLayout
        navItems={navItems}
        user={user}
        authLoading={authLoading}
        onLoginClick={openModal}
      >
        <AnimatePresence mode="wait" initial={false}>
          <AppRoutes location={location} periodMap={periodMap} clinicalTopicsMap={clinicalTopicsMap} generalTopicsMap={generalTopicsMap} isSuperAdmin={isSuperAdmin} />
        </AnimatePresence>
        <RoutePager currentPath={location.pathname} />
      </AppLayout>
    </>
  );
}
