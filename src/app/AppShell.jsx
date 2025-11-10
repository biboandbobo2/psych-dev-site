// File: src/app/AppShell.jsx
// AppShell отвечает за отображение основного контента и маршрутов,
// опираясь на ROUTE_CONFIG, Zustand-сторы и UI-компоненты. Провайдеры (Router/Auth) живут в src/App.jsx.
import React, { useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { AnimatePresence } from 'framer-motion';
import { ROUTE_CONFIG, SITE_NAME } from '../routes';
import { usePeriods } from '../hooks/usePeriods';
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

function RoutePager({ currentPath }) {
  const normalizedPath = currentPath?.endsWith('/') && currentPath.length > 1
    ? currentPath.slice(0, -1)
    : currentPath;
  const currentIndex = ROUTE_CONFIG.findIndex((route) => route.path === normalizedPath);
  if (currentIndex === -1) return null;
  const prev = currentIndex > 0 ? ROUTE_CONFIG[currentIndex - 1] : null;
  const next = currentIndex < ROUTE_CONFIG.length - 1 ? ROUTE_CONFIG[currentIndex + 1] : null;
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
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const authLoading = useAuthStore((state) => state.loading);
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin);
  const { isOpen, openModal, closeModal } = useLoginModal();

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

  const navItems = useMemo(
    () =>
      ROUTE_CONFIG.map((config) => {
        const periodData = config.periodId ? periodMap.get(config.periodId) : null;
        return {
          path: config.path,
          label: periodData?.label || config.navLabel,
        };
      }),
    [periodMap]
  );

  if (loading) return <LoadingSplash />;
  if (error) return <ErrorState message={error.message} />;
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
          <AppRoutes location={location} periodMap={periodMap} isSuperAdmin={isSuperAdmin} />
        </AnimatePresence>
        <RoutePager currentPath={location.pathname} />
      </AppLayout>
    </>
  );
}
