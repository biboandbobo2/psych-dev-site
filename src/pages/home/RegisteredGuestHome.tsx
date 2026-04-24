import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { SITE_NAME } from '../../routes';
import { useAuth } from '../../auth/AuthProvider';
import { useCourses } from '../../hooks/useCourses';
import { useCoursesOpenness } from '../../hooks/useCoursesOpenness';
import { getCourseIntroPath } from '../../lib/courseLinks';
import { FeedbackModal } from '../../components/FeedbackModal';
import { usePlatformNews } from '../../hooks/usePlatformNews';
import { PlatformNewsSection } from './PlatformNewsSection';

const TELEGRAM_CONTACT = 'https://t.me/BiboiBobo2';

export function RegisteredGuestHome() {
  const { user } = useAuth();
  const { courses, loading: coursesLoading } = useCourses();
  const { openCourseIds, loading: opennessLoading } = useCoursesOpenness(
    courses.map((course) => course.id)
  );
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const { items: platformNews, loading: newsLoading } = usePlatformNews();

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'гость';

  const openCourses = courses.filter((course) => openCourseIds.has(course.id));
  const closedCourses = courses.filter((course) => !openCourseIds.has(course.id));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 py-6">
      <Helmet>
        <title>{SITE_NAME} — ваш кабинет</title>
      </Helmet>

      <section className="rounded-2xl border border-[#DDE5EE] bg-white p-6">
        <Link
          to="/about"
          className="inline-flex flex-col items-start rounded-xl px-2.5 py-1.5 -ml-2.5 transition hover:bg-[#F0F4FA]"
        >
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3359CB]">
            DOM Academy
          </span>
          <span className="mt-0.5 text-[11px] italic text-[#6B7A8D]">Development Of Mind</span>
        </Link>
        <h1 className="mt-3 text-2xl font-black leading-tight text-[#1F2F46] sm:text-3xl">
          {displayName}, добро пожаловать
        </h1>
        <p className="mt-2 text-sm text-[#556476]">
          У вас пока нет доступа к курсам DOM Academy. Ниже — что открыто уже сейчас и как получить
          доступ к закрытым курсам.
        </p>
      </section>

      <PlatformNewsSection items={platformNews} loading={newsLoading} />

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-[#1F2F46]">Вам уже открыто</h2>
        {coursesLoading || opennessLoading ? (
          <p className="text-sm text-[#6B7A8D]">Проверяем доступные материалы...</p>
        ) : openCourses.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#DDE5EE] bg-[#F9FBFF] p-4 text-sm text-[#6B7A8D]">
            Полностью открытых курсов пока нет. В некоторых закрытых курсах могут быть отдельные
            бесплатные лекции — откройте курс, чтобы посмотреть его структуру.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {openCourses.map((course) => (
              <li key={course.id}>
                <Link
                  to={getCourseIntroPath(course.id)}
                  className="flex h-full items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 transition hover:border-emerald-400 hover:bg-emerald-100/60"
                >
                  <span className="text-3xl" aria-hidden>
                    {course.icon || '📘'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold text-emerald-900">{course.name}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      Открытый доступ
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-[#DDE5EE] bg-[#F9FBFF] p-6">
        <h2 className="text-xl font-bold text-[#1F2F46]">Как получить доступ</h2>
        <p className="mt-2 text-sm text-[#556476]">
          Напишите нам любым удобным способом — мы откроем нужный курс. Укажите email, с которым вы
          зарегистрированы.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setIsAccessModalOpen(true)}
            className="inline-flex items-center justify-center rounded-xl bg-[#3359CB] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2A49A8]"
          >
            💬 Отправить запрос через бота
          </button>
          <a
            href={TELEGRAM_CONTACT}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl border border-[#C5D6EE] bg-white px-4 py-2 text-sm font-semibold text-[#3359CB] transition hover:bg-[#EEF4FF]"
          >
            ✉️ Написать Алексею в Telegram
          </a>
        </div>
        <FeedbackModal
          isOpen={isAccessModalOpen}
          onClose={() => setIsAccessModalOpen(false)}
          title="Запрос доступа к курсу"
          introText={[
            'Расскажите, к какому курсу нужен доступ и кратко о себе. Мы ответим в ближайшее время.',
          ]}
          lockedType="idea"
          messagePrefix="🔓 Запрос доступа к курсу\n\n"
          messageLabel="Какой курс вам нужен и контекст"
          placeholder="Например: «Хочу доступ к курсу ‘Психология развития’, меня интересует подростковый возраст»"
          successMessage="Спасибо! Заявка отправлена в Telegram, мы ответим в ближайшее время."
          cancelLabel="Закрыть"
        />
      </section>

      {closedCourses.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-[#1F2F46]">Закрытые курсы</h2>
          <p className="text-sm text-[#6B7A8D]">
            Откройте курс, чтобы увидеть его структуру и преподавателей. Для просмотра лекций нужен
            доступ — запросите его кнопкой выше.
          </p>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {closedCourses.map((course) => (
              <li key={course.id}>
                <Link
                  to={getCourseIntroPath(course.id)}
                  className="flex h-full items-start gap-3 rounded-2xl border border-[#DDE5EE] bg-white p-4 transition hover:border-[#9EB7D9] hover:bg-[#F7FAFF]"
                >
                  <span className="text-3xl" aria-hidden>
                    {course.icon || '📘'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold text-[#2C3E50]">{course.name}</p>
                    <p className="mt-1 text-xs font-semibold text-[#3359CB]">
                      Посмотреть структуру →
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-2xl border border-[#DDE5EE] bg-white p-5">
        <h2 className="text-lg font-bold text-[#1F2F46]">🔑 Свой Gemini-ключ</h2>
        <p className="mt-2 text-sm text-[#556476]">
          Добавьте свой API-ключ Google Gemini в профиле — и пользуйтесь AI-помощником и научным
          поиском на сайте бесплатно (по вашей квоте).
        </p>
        <Link
          to="/profile"
          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#3359CB] transition hover:text-[#2A49A8]"
        >
          Открыть настройки профиля →
        </Link>
      </section>

      <section className="rounded-2xl border border-[#DDE5EE] bg-[#F9FBFF] p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7A8D]">Партнёр</p>
        <h2 className="mt-1 text-lg font-bold text-[#1F2F46]">
          Психологический центр «Dom» в Тбилиси
        </h2>
        <p className="mt-2 text-sm text-[#556476]">
          Очные сессии и аренда кабинета для работы с клиентами.
        </p>
        <Link
          to="/booking"
          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#3359CB] transition hover:text-[#2A49A8]"
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
    </div>
  );
}
