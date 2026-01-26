import { useRef, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import type { User } from 'firebase/auth';
import { cn } from '../lib/cn';
import UserMenu from '../components/UserMenu';

type NavigationItem = {
  path: string;
  label: string;
};

interface AppLayoutProps {
  navItems: NavigationItem[];
  user: User | null;
  authLoading: boolean;
  onLoginClick: () => void;
  hideNavigation?: boolean;
  sidebar?: ReactNode;
  sidebarWidthClass?: string;
  children: ReactNode;
}

export function AppLayout({
  navItems,
  user,
  authLoading,
  onLoginClick,
  hideNavigation = false,
  sidebar,
  sidebarWidthClass,
  children,
}: AppLayoutProps) {
  const mobileNavRef = useRef<HTMLDetailsElement | null>(null);
  const showNavigation = !hideNavigation && navItems.length > 0;
  const showAside = Boolean(sidebar) || showNavigation;
  const asideWidthClass = sidebarWidthClass ?? "lg:w-72";

  const handleMobileNavClick = () => {
    if (mobileNavRef.current) {
      mobileNavRef.current.open = false;
    }
  };

  const renderNavList = (onItemClick?: () => void) => (
    <nav className="flex flex-col gap-2">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end
          onClick={onItemClick}
          className={({ isActive }) =>
            cn(
              'block rounded-2xl px-4 py-3 text-base font-medium transition-colors duration-150 border border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20',
              isActive
                ? 'bg-accent-100 text-accent border-accent/30 shadow-sm'
                : 'text-muted hover:text-fg hover:bg-card2'
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <main className="relative bg-bg text-fg min-h-screen">
      <div id="page-top" aria-hidden="true" />
      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 md:py-12">
        <div className="mb-6 flex flex-wrap items-center justify-end gap-2 sm:mb-8">
          {!user ? (
            <button
              onClick={onLoginClick}
              disabled={authLoading}
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-md transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Войти
            </button>
          ) : (
            <UserMenu user={user} />
          )}
        </div>
        <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 lg:gap-12">
          {showAside && (
            <aside className={`${asideWidthClass} flex-shrink-0 lg:sticky lg:top-8`}>
              {sidebar ?? (
                <div className="rounded-2xl border border-border/60 bg-card shadow-brand p-3 sm:p-4 md:p-5 space-y-2">
                  <p className="hidden text-sm leading-6 text-muted uppercase tracking-[0.3em] lg:block">
                    Навигация
                  </p>
                  <div className="hidden lg:block">{renderNavList()}</div>
                  <details ref={mobileNavRef} className="group lg:hidden">
                    <summary className="flex cursor-pointer items-center justify-between rounded-xl border border-border/60 bg-card2 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted [&::-webkit-details-marker]:hidden">
                      <span>Навигация</span>
                      <svg
                        className="h-4 w-4 text-muted transition-transform group-open:rotate-90"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </summary>
                    <div className="mt-3">{renderNavList(handleMobileNavClick)}</div>
                  </details>
                </div>
              )}
            </aside>
          )}

          <div className="flex-1">{children}</div>
        </div>
      </div>
    </main>
  );
}
