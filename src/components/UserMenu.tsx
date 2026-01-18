import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useAuthStore, useContentSearchStore } from "../stores";
import { CombinedSearchDrawer } from "./CombinedSearchDrawer";
import { AiAssistantDrawer } from "../features/researchSearch/components/AiAssistantDrawer";

interface UserMenuProps {
  user: User;
}

export default function UserMenu({ user }: UserMenuProps) {
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const displayName = user.displayName || user.email?.split('@')[0] || "Пользователь";
  const photoURL = user.photoURL;
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin);
  const { isOpen: isSearchOpen, openSearch, closeSearch } = useContentSearchStore();

  // Определяем курс на основе текущего пути
  const isClinicalPage = location.pathname.startsWith('/clinical');
  const isGeneralPage = location.pathname.startsWith('/general');
  const isProfilePage = location.pathname === '/' || location.pathname === '/profile';
  const adminContentLink = isClinicalPage ? '/admin/content?course=clinical' :
                           isGeneralPage ? '/admin/content?course=general' :
                           '/admin/content?course=development';

  const handleSignOut = async () => {
    if (window.confirm("Выйти из системы?")) {
      await signOut(auth);
    }
  };

  return (
    <>
      <div className="flex items-center justify-end gap-2 sm:hidden">
        <button
          type="button"
          onClick={() => openSearch()}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-200"
          aria-label="Поиск"
          data-testid="user-menu-search-button"
        >
          <span aria-hidden className="text-base">🔎</span>
          <span className="sr-only">Поиск</span>
        </button>
        {!isProfilePage && (
          <Link
            to="/profile"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-gray-200"
            aria-label="Профиль"
          >
            {photoURL ? (
              <img src={photoURL} alt={displayName} className="h-8 w-8 rounded-full" />
            ) : (
              <span className="text-sm font-semibold text-gray-700">
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </Link>
        )}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
          aria-label="Меню пользователя"
        >
          <span aria-hidden className="text-base">☰</span>
          <span>Меню</span>
        </button>
      </div>

      <div className="hidden sm:flex sm:flex-wrap sm:items-center sm:justify-end sm:gap-2">
        <Link
          to="/notes"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-100 px-3 py-2 text-sm font-medium text-blue-800 transition hover:bg-blue-200"
        >
          <span aria-hidden className="text-base">📝</span>
          <span>Заметки</span>
        </Link>

        <button
          type="button"
          onClick={() => openSearch()}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-200"
          aria-label="Поиск"
          data-testid="user-menu-search-button"
        >
          <span aria-hidden className="text-base">🔎</span>
          <span>Поиск</span>
        </button>

        <button
          type="button"
          onClick={() => setIsAiOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-200"
          aria-label="AI помощник"
        >
          <span aria-hidden className="text-base">🤖</span>
          <span>AI</span>
        </button>

        {isAdmin && (
          <Link
            to={adminContentLink}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-100 px-3 py-2 text-sm font-medium text-teal-800 transition hover:bg-teal-200"
          >
            <span aria-hidden className="text-base">✏️</span>
            <span>Редактор</span>
          </Link>
        )}

        {isSuperAdmin && (
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-accent-600"
          >
            <span aria-hidden className="text-base">⚙️</span>
            <span>Админ-панель</span>
          </Link>
        )}

        <Link
          to="/profile"
          className="flex items-center gap-2 bg-white rounded-lg shadow-lg px-3 py-2 hover:shadow-xl transition-shadow"
        >
          {photoURL ? (
            <img src={photoURL} alt={displayName} className="w-8 h-8 rounded-full" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}

          <span className="text-sm font-medium text-gray-700 max-w-[120px] truncate">
            {displayName}
          </span>

          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        <button
          onClick={handleSignOut}
          className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Выйти"
        >
          Выйти
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 sm:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Меню</h2>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-full p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                aria-label="Закрыть"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 grid gap-2">
              <Link
                to="/notes"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-800"
              >
                <span aria-hidden>📝</span>
                Заметки
              </Link>
              <button
                type="button"
                onClick={() => {
                  openSearch();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-800"
              >
                <span aria-hidden>🔎</span>
                Поиск
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAiOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-800"
              >
                <span aria-hidden>🤖</span>
                AI помощник
              </button>
              {isAdmin && (
                <Link
                  to={adminContentLink}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-800"
                >
                  <span aria-hidden>✏️</span>
                  Редактор
                </Link>
              )}
              {isSuperAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-800"
                >
                  <span aria-hidden>⚙️</span>
                  Админ-панель
                </Link>
              )}
              <Link
                to="/profile"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-800"
              >
                <span aria-hidden>👤</span>
                Профиль
              </Link>
              <button
                type="button"
                onClick={async () => {
                  await handleSignOut();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 rounded-lg border border-red-100 px-3 py-2 text-sm font-medium text-red-600"
              >
                <span aria-hidden>🚪</span>
                Выйти
              </button>
            </div>
          </div>
        </div>
      )}

      <CombinedSearchDrawer open={isSearchOpen} onClose={closeSearch} />
      <AiAssistantDrawer open={isAiOpen} onClose={() => setIsAiOpen(false)} />
    </>
  );
}
