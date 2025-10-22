import { Link } from "react-router-dom";
import { signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth } from "../lib/firebase";

interface UserMenuProps {
  user: User;
}

export default function UserMenu({ user }: UserMenuProps) {
  const displayName = user.displayName || user.email?.split('@')[0] || "Пользователь";
  const photoURL = user.photoURL;

  const handleSignOut = async () => {
    if (window.confirm("Выйти из системы?")) {
      await signOut(auth);
    }
  };

  return (
    <div className="flex items-center gap-3">
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
  );
}
