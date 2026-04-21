import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { SITE_NAME } from '../../routes';
import { useCourses } from '../../hooks/useCourses';
import { useCoursesOpenness } from '../../hooks/useCoursesOpenness';
import { getCourseIntroPath } from '../../lib/courseLinks';
import { PageLoader } from '../../components/ui';

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
      className="flex h-full flex-col rounded-2xl border border-[#DDE5EE] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#9EB7D9] hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-3xl" aria-hidden>
          {course.icon || '📘'}
        </span>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
            isOpen
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          {isOpen ? '🔓 Открытый курс' : '🔒 Закрытый курс'}
        </span>
      </div>
      <h3 className="mt-3 text-lg font-semibold leading-snug text-[#2C3E50]">{course.name}</h3>
      <p className="mt-1 text-sm text-[#6B7A8D]">
        {course.isCore ? 'Основной курс платформы' : 'Дополнительный курс платформы'}
      </p>
      <span className="mt-auto pt-3 text-sm font-semibold text-[#3359CB]">
        Посмотреть курс →
      </span>
    </Link>
  );
}

export function GuestLanding() {
  const { courses, loading: coursesLoading } = useCourses();
  const { openCourseIds, loading: opennessLoading } = useCoursesOpenness(
    courses.map((course) => course.id)
  );

  if (coursesLoading) return <PageLoader />;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 py-6">
      <Helmet>
        <title>{SITE_NAME} — образовательная платформа по психологии</title>
        <meta
          name="description"
          content="Академия Дом — образовательная платформа по психологии и смежным с ней областям. Курсы, тесты, таймлайн, заметки, научный поиск и AI-помощник."
        />
      </Helmet>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#4A5FA5] to-[#6B7FB8] p-8 text-white sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] opacity-80">Платформа</p>
        <h1 className="mt-2 text-4xl font-black leading-tight sm:text-5xl">Академия Дом</h1>
        <p className="mt-3 max-w-2xl text-base opacity-90 sm:text-lg">
          Образовательная платформа по психологии и смежным с ней областям. Курсы, инструменты для
          самостоятельной работы и научный поиск.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#4A5FA5] transition hover:bg-slate-100"
          >
            Войти / Зарегистрироваться
          </Link>
          <a
            href="#catalog"
            className="inline-flex items-center justify-center rounded-xl border-2 border-white px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Посмотреть курсы
          </a>
        </div>
      </section>

      <section id="catalog" className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1F2F46]">Наши курсы</h2>
          <p className="mt-1 text-sm text-[#6B7A8D]">
            Нажмите на карточку, чтобы увидеть структуру курса и открыть вводную страницу.
            «Открытый курс» доступен без регистрации.
          </p>
        </div>
        {opennessLoading && courses.length > 0 ? (
          <p className="text-sm text-[#6B7A8D]">Проверяем доступность материалов...</p>
        ) : null}
        <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} isOpen={openCourseIds.has(course.id)} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1F2F46]">После регистрации</h2>
          <p className="mt-1 text-sm text-[#6B7A8D]">
            Зарегистрируйтесь, чтобы получить доступ к ключевым инструментам платформы.
          </p>
        </div>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {FEATURES_AFTER_SIGN_IN.map((feature) => (
            <li
              key={feature.title}
              className="flex items-start gap-3 rounded-2xl border border-[#DDE5EE] bg-white p-4"
            >
              <span className="text-2xl" aria-hidden>
                {feature.icon}
              </span>
              <div>
                <p className="text-sm font-semibold text-[#2C3E50]">{feature.title}</p>
                <p className="mt-1 text-xs text-[#6B7A8D]">{feature.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-[#DDE5EE] bg-[#F9FBFF] p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7A8D]">Партнёр</p>
        <h2 className="mt-1 text-xl font-bold text-[#1F2F46]">
          Психологический центр «Дом» в Тбилиси
        </h2>
        <p className="mt-2 text-sm text-[#556476]">
          Очные сессии и аренда кабинета для работы с клиентами. Мы объединяем Академию Дом с
          сервисом бронирования центра.
        </p>
        <Link
          to="/booking"
          className="mt-4 inline-flex items-center gap-1 rounded-xl bg-[#3359CB] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2A49A8]"
        >
          Бронирование кабинетов →
        </Link>
      </section>

      <Link
        to="/features"
        className="block overflow-hidden rounded-2xl shadow-xl transition hover:shadow-2xl"
      >
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4 sm:px-8 sm:py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl sm:text-3xl">💡</span>
              <div>
                <h3 className="text-lg font-bold text-white sm:text-xl">Возможности платформы</h3>
                <p className="hidden text-sm text-white/80 sm:block">
                  Узнайте обо всех функциях: тесты, заметки, таймлайн, научный поиск
                </p>
              </div>
            </div>
            <svg
              className="h-6 w-6 text-white/80"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </Link>

      <section className="rounded-2xl bg-gradient-to-br from-[#4A5FA5] to-[#6B7FB8] p-6 text-center text-white">
        <p className="text-2xl font-bold">Готовы начать?</p>
        <p className="mt-1 text-sm opacity-90">
          Регистрация занимает минуту — через Google.
        </p>
        <Link
          to="/login"
          className="mt-4 inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#4A5FA5] transition hover:bg-slate-100"
        >
          Зарегистрироваться
        </Link>
      </section>
    </div>
  );
}
