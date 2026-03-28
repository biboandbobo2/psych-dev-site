import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useCallback, useState } from 'react';
import { getDocs, orderBy, query } from 'firebase/firestore';
import { SuperAdminBadge } from '../components/SuperAdminBadge';
import { GeminiKeySection, SearchHistorySection } from '../components/profile';
import { FeedbackButton, FeedbackModal } from '../components/FeedbackModal';
import { useAuth } from '../auth/AuthProvider';
import { useCourseStore } from '../stores';
import { triggerHaptic } from '../lib/haptics';
import { useCourses, type CourseOption } from '../hooks/useCourses';
import { getCourseLessonsCollectionRef } from '../lib/courseLessons';
import { getLastCourseLesson } from '../lib/lastCourseLesson';
import { CLINICAL_ROUTE_CONFIG, GENERAL_ROUTE_CONFIG, ROUTE_CONFIG } from '../routes';
import type { CourseType } from '../types/tests';

function getCoreCourseStartPath(courseId: string): string | null {
  if (courseId === 'development') return ROUTE_CONFIG[0]?.path ?? '/intro';
  if (courseId === 'clinical') return CLINICAL_ROUTE_CONFIG[0]?.path ?? '/clinical/intro';
  if (courseId === 'general') return GENERAL_ROUTE_CONFIG[0]?.path ?? '/general/1';
  return null;
}

interface StudentPanelProps {
  currentCourse: CourseType;
  currentCourseName: string;
}

interface StudentPersonalCard {
  icon: string;
  title: string;
  description: string;
  badge?: string;
  value?: string;
}

interface StudentToolFeature {
  icon: string;
  title: string;
  description: string;
  color: string;
  link: string;
  disabled: boolean;
}

interface CourseGridProps {
  courses: CourseOption[];
  openingCourseId: string | null;
  onOpenCourse: (course: CourseOption) => void;
}

function CourseGrid({ courses, openingCourseId, onOpenCourse }: CourseGridProps) {
  const featuredCourses = courses.slice(0, 4);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900 sm:text-lg">Курсы</h3>
        <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
          Основные
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {featuredCourses.map((course) => {
          const lastLesson = getLastCourseLesson(course.id);
          const isOpening = openingCourseId === course.id;

          return (
            <button
              key={course.id}
              type="button"
              onClick={() => onOpenCourse(course)}
              disabled={isOpening}
              className="group rounded-xl border-2 border-gray-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-2xl">{course.icon}</span>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                  {isOpening ? 'Открытие...' : 'Открыть'}
                </span>
              </div>
              <h4 className="mt-2 text-sm font-semibold text-gray-900">{course.name}</h4>
              <p className="mt-1 text-xs text-gray-600">
                {lastLesson?.label
                  ? `Последняя лекция: ${lastLesson.label}`
                  : 'Начать с первой лекции курса'}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function StudentPanel({ currentCourse, currentCourseName }: StudentPanelProps) {
  const notesLink = `/notes?course=${encodeURIComponent(currentCourse)}`;
  const timelineFeature: StudentToolFeature = {
    icon: '🗺️',
    title: 'Таймлайн жизни',
    description: 'Визуализируйте свой жизненный путь и ключевые решения',
    color: 'from-orange-500 to-orange-600',
    link: '/timeline',
    disabled: false,
  };

  const personalCards: StudentPersonalCard[] = [
    {
      icon: '🎯',
      title: 'Мой фокус',
      description: 'Текущий курс для работы и повторения материалов.',
      value: currentCourseName,
    },
    {
      icon: '🗓️',
      title: 'Мой календарь',
      description: 'Личные дедлайны и расписание занятий в одном месте.',
      badge: 'Скоро',
    },
    {
      icon: '🔔',
      title: 'Мои уведомления',
      description: 'Комментарии преподавателей и важные напоминания.',
      badge: 'Скоро',
    },
    {
      icon: '🏆',
      title: 'Мои достижения',
      description: 'Ваш прогресс, завершённые темы и персональные результаты.',
      badge: 'Скоро',
    },
  ];

  const tools: StudentToolFeature[] = [
    {
      icon: '📝',
      title: 'Мои заметки',
      description: 'Создавайте заметки к занятиям и лекциям курса и возвращайтесь к ним в любое время',
      color: 'from-blue-500 to-blue-600',
      link: notesLink,
      disabled: false,
    },
    {
      icon: '📚',
      title: 'Тесты по курсу',
      description: 'История ваших результатов по тестам и самопроверкам',
      color: 'from-green-500 to-green-600',
      link: '/tests',
      disabled: false,
    },
    {
      icon: '📊',
      title: 'Тесты по занятиям',
      description: 'Отслеживайте, какие занятия уже изучены и что осталось пройти',
      color: 'from-purple-500 to-purple-600',
      link: '/tests-lesson',
      disabled: false,
    },
    timelineFeature,
  ];

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900 sm:text-lg">Личное пространство</h3>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
            Личное
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {personalCards.map((card) => (
            <div
              key={card.title}
              className="relative rounded-xl border-2 border-gray-200 bg-white px-4 py-5 shadow-sm"
            >
              {card.badge && (
                <div className="absolute right-3 top-3">
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600">
                    {card.badge}
                  </span>
                </div>
              )}
              <div className="flex items-start gap-3">
                <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-2xl">
                  {card.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-base font-bold text-gray-900">{card.title}</h4>
                  <p className="mt-1 text-sm text-gray-600">{card.description}</p>
                  {card.value && (
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-blue-700">
                      {card.value}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900 sm:text-lg">Учебные инструменты</h3>
          <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-700">
            Учёба
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {tools.map((feature, index) => {
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
                  className="relative group rounded-xl border-2 border-gray-200 bg-white px-4 py-5 transition-all duration-300 hover:border-blue-400 hover:shadow-lg sm:p-6"
                >
                  {content}
                </Link>
              );
            }

            return (
              <div
                key={index}
                className="relative group rounded-xl border-2 border-gray-200 bg-white px-4 py-5 transition-all duration-300 sm:p-6"
              >
                {content}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default function Profile() {
  const { user, loading, userRole, isAdmin, isSuperAdmin } = useAuth();
  const [isCoopModalOpen, setIsCoopModalOpen] = useState(false);
  const [openingCourseId, setOpeningCourseId] = useState<string | null>(null);
  const [courseOpenError, setCourseOpenError] = useState<string | null>(null);
  const navigate = useNavigate();
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
  const currentCourseName = courses.find((course) => course.id === currentCourse)?.name ?? 'Текущий курс';
  const featuredCourses = courses.slice(0, 4);

  const resolveCourseStartPath = useCallback(async (course: CourseOption) => {
    const corePath = getCoreCourseStartPath(course.id);
    if (corePath) return corePath;

    const lessonsRef = getCourseLessonsCollectionRef(course.id);
    const snapshot = await getDocs(query(lessonsRef, orderBy('order', 'asc')));
    const firstLessonDoc = snapshot.docs.find((docSnap) => docSnap.data().published !== false);
    if (!firstLessonDoc) {
      return `/profile?course=${encodeURIComponent(course.id as CourseType)}`;
    }

    const lessonData = firstLessonDoc.data() as Record<string, unknown>;
    const lessonId = typeof lessonData.period === 'string' && lessonData.period.trim()
      ? lessonData.period.trim()
      : firstLessonDoc.id;

    return `/course/${encodeURIComponent(course.id)}/${encodeURIComponent(lessonId)}`;
  }, []);

  const handleOpenCourse = useCallback(async (course: CourseOption) => {
    setCourseOpenError(null);
    setOpeningCourseId(course.id);
    setCurrentCourse(course.id as CourseType);

    try {
      const path = await resolveCourseStartPath(course);
      navigate(path);
    } catch {
      setCourseOpenError('Не удалось открыть курс. Попробуйте ещё раз.');
    } finally {
      setOpeningCourseId(null);
    }
  }, [navigate, resolveCourseStartPath, setCurrentCourse]);

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

      <div className="bg-white rounded-2xl shadow-xl p-8">
        <CourseGrid
          courses={featuredCourses}
          openingCourseId={openingCourseId}
          onOpenCourse={handleOpenCourse}
        />
        {courseOpenError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {courseOpenError}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
        <StudentPanel currentCourse={currentCourse} currentCourseName={currentCourseName} />
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

      {/* Призыв к сотрудничеству */}
      <button
        onClick={() => setIsCoopModalOpen(true)}
        className="w-full text-left bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow"
      >
        <div className="bg-gradient-to-r from-indigo-500 to-blue-500 px-6 py-4 sm:px-8 sm:py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl sm:text-3xl">🤝</span>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white">Приглашаем к сотрудничеству</h3>
                <p className="text-sm text-white/80 hidden sm:block">
                  Предложите идею партнёрства или совместного проекта
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
      </button>
      <FeedbackModal
        isOpen={isCoopModalOpen}
        onClose={() => setIsCoopModalOpen(false)}
        title="Приглашаем к сотрудничеству"
        introText={[
          'Мы открыты к новым идеям и партнёрствам. Если вы дизайнер, разработчик, вайбкодер или создаёте собственные образовательные продукты в сфере психологии — будем рады сотрудничеству. Мы также приглашаем авторов курсов и преподавателей, которые хотят разместить свои программы на нашей платформе и развивать их вместе с нами.',
          'Если вам откликается наш проект — напишите нам, и давайте создадим что-то ценное вместе. ✨',
        ]}
        lockedType="idea"
        messagePrefix="🤝 Сотрудничество\n\n"
        messageLabel="Ваше сообщение"
        placeholder="Расскажите о себе и о формате сотрудничества..."
        successMessage="Спасибо! Сообщение отправлено в Telegram."
        cancelLabel="Закрыть"
      />

      {/* История поисков — только для авторизованных */}
      {user && <SearchHistorySection />}

      {/* API ключ Gemini (BYOK) — только для авторизованных */}
      {user && <GeminiKeySection />}
    </div>
  );
}
