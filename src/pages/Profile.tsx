import { Link } from 'react-router-dom';
import { SuperAdminBadge } from '../components/SuperAdminBadge';
import {
  EmailPreferencesSection,
  FeaturedCoursesSection,
  GeminiKeySection,
  SearchHistorySection,
} from '../components/profile';
import { FeedbackButton } from '../components/FeedbackModal';
import { useAuth } from '../auth/AuthProvider';
import { triggerHaptic } from '../lib/haptics';

export default function Profile() {
  const { user, loading, userRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Загрузка профиля...</p>
        </div>
      </div>
    );
  }

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Гость';
  const memberSince = user?.metadata.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;
  const role = userRole ?? 'student';

  const handleHapticClick = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const clickable = target.closest('button, a, summary, [role="button"]') as HTMLElement | null;
    if (!clickable) return;
    if (clickable.getAttribute('aria-disabled') === 'true') return;
    if (clickable instanceof HTMLButtonElement && clickable.disabled) return;
    triggerHaptic();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6" onClickCapture={handleHapticClick}>
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-32" />

        <div className="px-8 pb-8">
          <div className="flex items-end -mt-16 mb-6">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={displayName}
                className="w-32 h-32 rounded-full border-4 border-white shadow-lg"
              />
            ) : (
              <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-accent flex items-center justify-center text-white font-bold text-4xl">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="ml-6 mb-4">
              {!user ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-card2 border border-border px-4 py-2 text-sm font-semibold text-muted">
                  <span className="text-lg" role="img" aria-label="Гость">
                    👤
                  </span>
                  Гость
                </span>
              ) : role === 'super-admin' ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white">
                  <span className="text-lg" role="img" aria-label="Супер-админ">
                    ⭐
                  </span>
                  Супер-админ
                </span>
              ) : role === 'admin' ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-mark px-4 py-2 text-sm font-semibold text-[#5a4b00]">
                  <span className="text-lg" role="img" aria-label="Администратор">
                    ✏️
                  </span>
                  Администратор
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full bg-accent-100 px-4 py-2 text-sm font-semibold text-accent">
                  <span className="text-lg" role="img" aria-label="Студент">
                    🎓
                  </span>
                  Студент
                </span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {user ? (
              <>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{displayName}</h1>
                  <span className="hidden sm:inline-flex">
                    <SuperAdminBadge />
                  </span>
                </div>
                <div className="flex flex-wrap gap-6 text-gray-600">
                  <div className="flex items-center gap-2">
                    <span className="text-xl" role="img" aria-hidden="true">
                      ✉️
                    </span>
                    <span>{user.email}</span>
                  </div>
                  {memberSince && (
                    <div className="flex items-center gap-2">
                      <span className="text-xl" role="img" aria-hidden="true">
                        📅
                      </span>
                      <span>С нами с {memberSince}</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Добро пожаловать!</h1>
                <p className="text-gray-600 max-w-lg">
                  Зарегистрируйтесь или войдите в аккаунт, чтобы получить доступ к видео-лекциям,
                  заметкам и другим материалам курсов.
                </p>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Войти / Зарегистрироваться
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <FeedbackButton variant="profile" />

      {user && <FeaturedCoursesSection />}

      {user && <SearchHistorySection />}

      {user && <EmailPreferencesSection />}

      {user && <GeminiKeySection />}
    </div>
  );
}
