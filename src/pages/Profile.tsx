import { Link, useSearchParams } from 'react-router-dom';
import { useEffect, useCallback } from 'react';
import { SuperAdminBadge } from '../components/SuperAdminBadge';
import { GeminiKeySection, SearchHistorySection } from '../components/profile';
import { FeedbackButton } from '../components/FeedbackModal';
import { useAuth } from '../auth/AuthProvider';
import { useCourseStore } from '../stores';
import { triggerHaptic } from '../lib/haptics';
import { useCourses } from '../hooks/useCourses';
import type { CourseType } from '../types/tests';

interface StudentPanelProps {
  currentCourse: CourseType;
}

function StudentPanel({ currentCourse }: StudentPanelProps) {
  const features = [
    {
      icon: '📝',
      title: 'Мои заметки',
      description: 'Создавайте заметки к каждому периоду и возвращайтесь к ним в любое время',
      color: 'from-blue-500 to-blue-600',
      link: '/notes',
      disabled: currentCourse !== 'development',
    },
    {
      icon: '📚',
      title: 'Тесты - курс целиком',
      description: 'История ваших результатов по тестам и самопроверкам',
      color: 'from-green-500 to-green-600',
      link: '/tests',
      disabled: false,
    },
    {
      icon: '📊',
      title: 'Тесты - занятие',
      description: 'Отслеживайте какие занятия вы уже изучили и что осталось',
      color: 'from-purple-500 to-purple-600',
      link: '/tests-lesson',
      disabled: false,
    },
    {
      icon: '🗺️',
      title: 'Таймлайн жизни',
      description: 'Визуализируйте свой жизненный путь и ключевые решения',
      color: 'from-orange-500 to-orange-600',
      link: '/timeline',
      disabled: currentCourse !== 'development',
    },
  ];

  return (
    <div>
      <h2 className="hidden sm:flex text-lg font-semibold mb-6 items-center gap-2 text-gray-700 uppercase tracking-wide">
        <span className="text-2xl" role="img" aria-label="Студент">
          🎓
        </span>
        Панель студента
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map((feature, index) => {
          const isDisabled = feature.disabled;
          const content = (
            <>
              {isDisabled && (
                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
                    Скоро
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 sm:block">
                <div
                  className={`inline-flex shrink-0 items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} text-3xl sm:mb-4 shadow-md ${
                    isDisabled ? 'opacity-50' : ''
                  }`}
                >
                  {feature.icon}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className={`text-base sm:text-lg font-bold mb-1 sm:mb-2 leading-snug ${isDisabled ? 'text-gray-500' : 'text-gray-900'}`}>
                    {feature.title}
                  </h3>
                  <p className={`text-xs sm:text-sm leading-snug ${isDisabled ? 'text-gray-400' : 'text-gray-600'}`}>
                    {feature.description}
                  </p>
                </div>
              </div>

              {isDisabled && (
                <div className="absolute inset-0 hidden rounded-xl bg-gray-50/50 backdrop-blur-[1px] cursor-not-allowed sm:block" />
              )}
            </>
          );

          if (feature.link && !isDisabled) {
            return (
              <Link
                key={index}
                to={feature.link}
                className="relative group bg-white border-2 border-gray-200 rounded-xl px-4 py-5 sm:p-6 hover:border-blue-400 transition-all duration-300 hover:shadow-lg cursor-pointer"
              >
                {content}
              </Link>
            );
          }

          return (
            <div
              key={index}
              className="relative group bg-white border-2 border-gray-200 rounded-xl px-4 py-5 sm:p-6 transition-all duration-300"
            >
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Profile() {
  const { user, loading, userRole, isAdmin, isSuperAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const { currentCourse, setCurrentCourse } = useCourseStore();
  const { courses, loading: coursesLoading } = useCourses();

  // Синхронизация с URL параметром при первой загрузке
  useEffect(() => {
    const courseParam = searchParams.get('course');
    if (courseParam) {
      setCurrentCourse(courseParam as CourseType);
    }
  }, [searchParams, setCurrentCourse]);

  useEffect(() => {
    if (coursesLoading || !courses.length) return;
    const hasCurrent = courses.some((course) => course.id === currentCourse);
    if (!hasCurrent && courses[0]?.id) {
      setCurrentCourse(courses[0].id as CourseType);
    }
  }, [courses, coursesLoading, currentCourse, setCurrentCourse]);

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

  const handleHapticClick = useCallback((event: React.MouseEvent) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const clickable = target.closest('button, a, summary, [role="button"]') as HTMLElement | null;
    if (!clickable) return;
    if (clickable.getAttribute('aria-disabled') === 'true') return;
    if (clickable instanceof HTMLButtonElement && clickable.disabled) return;
    triggerHaptic();
  }, []);

  return (
    <div className="space-y-6" onClickCapture={handleHapticClick}>
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
              <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-4xl">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="ml-6 mb-4">
              {!user ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">
                  <span className="text-lg" role="img" aria-label="Гость">
                    👤
                  </span>
                  Гость
                </span>
              ) : role === 'super-admin' ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-sm font-semibold text-white shadow">
                  <span className="text-lg" role="img" aria-label="Супер-админ">
                    ⭐
                  </span>
                  Супер-админ
                </span>
              ) : role === 'admin' ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-4 py-2 text-sm font-semibold text-purple-800">
                  <span className="text-lg" role="img" aria-label="Администратор">
                    👑
                  </span>
                  Администратор
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-800">
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

        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-8">
          {/* Переключатель курсов (мобильная версия) */}
        <div className="sm:hidden">
          <h2 className="text-lg font-semibold mb-4 text-gray-700 uppercase tracking-wide">Выберите курс</h2>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-2 sm:border-b sm:border-gray-200">
            {courses.map((courseOption) => (
              <button
                key={courseOption.id}
                onClick={() => setCurrentCourse(courseOption.id)}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors sm:w-auto sm:justify-start sm:rounded-none sm:border-0 sm:px-4 sm:py-2 sm:text-base ${
                  currentCourse === courseOption.id
                    ? 'bg-blue-50 text-blue-700 border-blue-200 sm:bg-transparent sm:text-blue-600 sm:border-b-2 sm:border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 sm:bg-transparent sm:text-gray-600 sm:border-b-2 sm:border-transparent sm:hover:text-gray-900'
                }`}
                disabled={coursesLoading}
              >
                <span className="text-base">{courseOption.icon}</span>
                {courseOption.name}
              </button>
            ))}
          </div>
        </div>

        <div className="hidden sm:block">
          <StudentPanel currentCourse={currentCourse} />
        </div>
      </div>

      <div className="sm:hidden bg-white rounded-2xl shadow-xl p-4">
        <details className="group" open>
          <summary className="flex cursor-pointer items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <span role="img" aria-hidden="true">🎓</span>
              Панель студента
            </span>
            <svg
              className="h-4 w-4 text-gray-500 transition-transform group-open:rotate-90"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </summary>
          <div className="mt-4">
            <StudentPanel currentCourse={currentCourse} />
          </div>
        </details>
      </div>

      {/* Ссылка на страницу возможностей */}
      <Link
        to="/features"
        className="block bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow"
      >
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4 sm:px-8 sm:py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl sm:text-3xl">💡</span>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white">Возможности платформы</h3>
                <p className="text-sm text-white/80 hidden sm:block">
                  Узнайте обо всех функциях: тесты, заметки, таймлайн, научный поиск
                </p>
              </div>
            </div>
            <svg
              className="w-6 h-6 text-white/80"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </Link>

      {/* Обратная связь */}
      <FeedbackButton variant="profile" />

      {/* История поисков — только для авторизованных */}
      {user && <SearchHistorySection />}

      {/* API ключ Gemini (BYOK) — только для авторизованных */}
      {user && <GeminiKeySection />}
    </div>
  );
}
