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
  const location = useLocation();
  const displayName = user.displayName || user.email?.split('@')[0] || "Пользователь";
  const photoURL = user.photoURL;
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin);
  const { isOpen: isSearchOpen, openSearch, closeSearch } = useContentSearchStore();

  // Определяем курс на основе текущего пути
  const isClinicalPage = location.pathname.startsWith('/clinical');
  const isGeneralPage = location.pathname.startsWith('/general');
  const adminContentLink = isClinicalPage ? '/admin/content?course=clinical' :
                           isGeneralPage ? '/admin/content?course=general' :
                           '/admin/content?course=development';

  const handleSignOut = async () => {
    if (window.confirm("Выйти из системы?")) {
      await signOut(auth);
    }
  };

  return (
    <div className="flex flex-nowrap items-center justify-start gap-2 overflow-x-auto sm:flex-wrap sm:overflow-visible sm:justify-end">
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
      >
        <span aria-hidden className="text-base">🔎</span>
        <span className="hidden sm:inline">Поиск</span>
      </button>

      <button
        type="button"
        onClick={() => setIsAiOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-200"
        aria-label="AI помощник"
      >
        <span aria-hidden className="text-base">🤖</span>
        <span className="hidden sm:inline">AI</span>
      </button>

      {isAdmin && (
        <Link
          to={adminContentLink}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-100 px-3 py-2 text-sm font-medium text-teal-800 transition hover:bg-teal-200"
        >
          <span aria-hidden className="text-base">✏️</span>
          <span className="hidden sm:inline">Редактор</span>
        </Link>
      )}

      {isSuperAdmin && (
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-accent-600"
        >
          <span aria-hidden className="text-base">⚙️</span>
          <span className="hidden sm:inline">Админ-панель</span>
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

      <CombinedSearchDrawer open={isSearchOpen} onClose={closeSearch} />
      <AiAssistantDrawer open={isAiOpen} onClose={() => setIsAiOpen(false)} />
    </div>
  );
}
