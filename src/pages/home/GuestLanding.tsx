import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { SITE_NAME } from '../../routes';
import { useCourses } from '../../hooks/useCourses';
import { useCoursesOpenness } from '../../hooks/useCoursesOpenness';
import { getCourseIntroPath } from '../../lib/courseLinks';
import { PageLoader } from '../../components/ui';
import { usePlatformNews } from '../../hooks/usePlatformNews';
import { PlatformNewsSection } from './PlatformNewsSection';

interface FeatureItem {
  icon: string;
  title: string;
  description: string;
}

const FEATURES_AFTER_SIGN_IN: FeatureItem[] = [
  {
    icon: '📝',
    title: 'Тесты по занятиям и по курсу',
    description: 'Закрепляйте материал — результаты сохраняются в истории.',
  },
  {
    icon: '🗺️',
    title: 'Таймлайн жизни',
    description: 'Визуализируйте свой путь и связывайте события с теориями развития.',
  },
  {
    icon: '📓',
    title: 'Заметки по лекциям',
    description: 'Ведите конспекты прямо во время просмотра видео; всё привязано к курсу.',
  },
  {
    icon: '🤖',
    title: 'AI-помощник и научный поиск',
    description: 'Задавайте вопросы по лекциям, ищите статьи в OpenAlex и Semantic Scholar.',
  },
  {
    icon: '🔑',
    title: 'Свой Gemini-ключ (BYOK)',
    description: 'Подключите собственный API-ключ Gemini — и используйте его на сайте.',
  },
];

function CourseCard({
  course,
  isOpen,
}: {
  course: { id: string; name: string; icon: string; isCore?: boolean };
  isOpen: boolean;
}) {
  return (
    <Link
      to={getCourseIntroPath(course.id)}
      className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-brand transition hover:-translate-y-0.5 hover:border-accent/40 hover:bg-accent-100/40"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-3xl" aria-hidden>
          {course.icon || '📘'}
        </span>
        {isOpen ? (
          <span className="inline-flex shrink-0 items-center rounded-full bg-accent-100 px-2.5 py-1 text-xs font-semibold text-accent">
            Открытый доступ
          </span>
        ) : null}
      </div>
      <h3 className="mt-3 text-lg font-semibold leading-snug text-fg">{course.name}</h3>
      <p className="mt-1 text-sm text-muted">Курс платформы</p>
      <span className="mt-auto pt-3 text-sm font-semibold text-accent">
        {isOpen ? 'Посмотреть курс →' : 'Посмотреть структуру →'}
      </span>
    </Link>
  );
}

export function GuestLanding() {
  const { courses, loading: coursesLoading } = useCourses();
  const { openCourseIds, loading: opennessLoading } = useCoursesOpenness(
    courses.map((course) => course.id)
  );
  const { items: platformNews, loading: newsLoading } = usePlatformNews();

  if (coursesLoading) return <PageLoader />;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 py-6">
      <Helmet>
        <title>{SITE_NAME} — образовательная платформа по психологии</title>
        <meta
          name="description"
          content="DOM Academy — образовательная платформа по психологии и смежным с ней областям. Курсы, тесты, таймлайн, заметки, научный поиск и AI-помощник."
        />
      </Helmet>

      <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-accent-100 to-mark p-8 shadow-brand sm:p-10">
        <Link
          to="/about"
          className="inline-flex flex-col items-start rounded-xl px-3 py-2 -ml-3 transition hover:bg-card/60"
        >
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
            DOM Academy
          </span>
          <span className="mt-0.5 text-[11px] italic text-muted">Development Of Mind</span>
        </Link>
        <h1 className="mt-3 text-4xl font-black leading-tight text-fg sm:text-5xl">DOM Academy</h1>
        <p className="mt-3 max-w-2xl text-base text-fg/80 sm:text-lg">
          Образовательная платформа по психологии и смежным с ней областям. Курсы, инструменты для
          самостоятельной работы и научный поиск.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Войти / Зарегистрироваться
          </Link>
          <a
            href="#catalog"
            className="inline-flex items-center justify-center rounded-xl border border-accent/40 bg-card px-5 py-3 text-sm font-semibold text-accent transition hover:bg-accent-100/70"
          >
            Посмотреть курсы
          </a>
        </div>
      </section>

      <PlatformNewsSection items={platformNews} loading={newsLoading} />

      <section id="catalog" className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-fg">Наши курсы</h2>
          <p className="mt-1 text-sm text-muted">
            Нажмите на карточку, чтобы увидеть структуру курса и открыть вводную страницу.
            «Открытый курс» доступен без регистрации.
          </p>
        </div>
        {opennessLoading && courses.length > 0 ? (
          <p className="text-sm text-muted">Проверяем доступность материалов...</p>
        ) : null}
        <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} isOpen={openCourseIds.has(course.id)} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-fg">После регистрации</h2>
          <p className="mt-1 text-sm text-muted">
            Зарегистрируйтесь, чтобы получить доступ к ключевым инструментам платформы.
          </p>
        </div>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {FEATURES_AFTER_SIGN_IN.map((feature) => (
            <li
              key={feature.title}
              className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <span className="text-2xl" aria-hidden>
                {feature.icon}
              </span>
              <div>
                <p className="text-sm font-semibold text-fg">{feature.title}</p>
                <p className="mt-1 text-xs text-muted">{feature.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-card2 p-6 shadow-brand">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Партнёр</p>
        <h2 className="mt-1 text-xl font-bold text-fg">
          Психологический центр «Dom» в Тбилиси
        </h2>
        <p className="mt-2 text-sm text-muted">
          Очные сессии и аренда кабинета для работы с клиентами. Мы объединяем DOM Academy с
          сервисом бронирования центра.
        </p>
        <Link
          to="/booking"
          className="mt-4 inline-flex items-center gap-1 rounded-xl border border-accent/30 bg-accent-100 px-4 py-2 text-sm font-semibold text-accent transition hover:bg-accent-100/70"
        >
          Бронирование кабинетов →
        </Link>
      </section>

      <Link
        to="/features"
        className="block overflow-hidden rounded-2xl border border-border bg-mark shadow-brand transition hover:bg-[#FFE98C]"
      >
        <div className="px-6 py-4 sm:px-8 sm:py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl sm:text-3xl">💡</span>
              <div>
                <h3 className="text-lg font-bold text-[#5a4b00] sm:text-xl">Возможности платформы</h3>
                <p className="hidden text-sm text-[#5a4b00]/75 sm:block">
                  Узнайте обо всех функциях: тесты, заметки, таймлайн, научный поиск
                </p>
              </div>
            </div>
            <svg
              className="h-6 w-6 text-[#5a4b00]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </Link>

      <section className="rounded-2xl border border-border bg-gradient-to-br from-accent-100 to-mark p-6 text-center shadow-brand">
        <p className="text-2xl font-bold text-fg">Готовы начать?</p>
        <p className="mt-1 text-sm text-fg/75">
          Регистрация занимает минуту — через Google.
        </p>
        <Link
          to="/login"
          className="mt-4 inline-flex items-center justify-center rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Зарегистрироваться
        </Link>
      </section>
    </div>
  );
}
