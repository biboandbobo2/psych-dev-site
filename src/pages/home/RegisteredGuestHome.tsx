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

      <section className="rounded-2xl border border-border bg-card p-6 shadow-brand">
        <Link
          to="/about"
          className="inline-flex flex-col items-start rounded-xl px-2.5 py-1.5 -ml-2.5 transition hover:bg-accent-100/50"
        >
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            DOM Academy
          </span>
          <span className="mt-0.5 text-[11px] italic text-muted">Development Of Mind</span>
        </Link>
        <h1 className="mt-3 text-2xl font-black leading-tight text-fg sm:text-3xl">
          {displayName}, добро пожаловать
        </h1>
        <p className="mt-2 text-sm text-muted">
          У вас пока нет доступа к курсам DOM Academy. Ниже — что открыто уже сейчас и как получить
          доступ к закрытым курсам.
        </p>
      </section>

      <PlatformNewsSection items={platformNews} loading={newsLoading} />

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-fg">Вам уже открыто</h2>
        {coursesLoading || opennessLoading ? (
          <p className="text-sm text-muted">Проверяем доступные материалы...</p>
        ) : openCourses.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card2 p-4 text-sm text-muted">
            Полностью открытых курсов пока нет. В некоторых закрытых курсах могут быть отдельные
            бесплатные лекции — откройте курс, чтобы посмотреть его структуру.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {openCourses.map((course) => (
              <li key={course.id}>
                <Link
                  to={getCourseIntroPath(course.id)}
                  className="flex h-full items-start gap-3 rounded-2xl border border-accent/30 bg-accent-100 p-4 transition hover:border-accent/60 hover:bg-accent-100/70"
                >
                  <span className="text-3xl" aria-hidden>
                    {course.icon || '📘'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold text-fg">{course.name}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-accent">
                      Открытый доступ
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card2 p-6 shadow-brand">
        <h2 className="text-xl font-bold text-fg">Как получить доступ</h2>
        <p className="mt-2 text-sm text-muted">
          Напишите нам любым удобным способом — мы откроем нужный курс. Укажите email, с которым вы
          зарегистрированы.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setIsAccessModalOpen(true)}
            className="inline-flex items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            💬 Отправить запрос через бота
          </button>
          <a
            href={TELEGRAM_CONTACT}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl border border-accent/30 bg-accent-100 px-4 py-2 text-sm font-semibold text-accent transition hover:bg-accent-100/70"
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
          <h2 className="text-xl font-bold text-fg">Закрытые курсы</h2>
          <p className="text-sm text-muted">
            Откройте курс, чтобы увидеть его структуру и преподавателей. Для просмотра лекций нужен
            доступ — запросите его кнопкой выше.
          </p>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {closedCourses.map((course) => (
              <li key={course.id}>
                <Link
                  to={getCourseIntroPath(course.id)}
                  className="flex h-full items-start gap-3 rounded-2xl border border-border bg-card p-4 transition hover:border-accent/40 hover:bg-accent-100/40"
                >
                  <span className="text-3xl" aria-hidden>
                    {course.icon || '📘'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold text-fg">{course.name}</p>
                    <p className="mt-1 text-xs font-semibold text-accent">
                      Посмотреть структуру →
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-2xl border border-border bg-card p-5 shadow-brand">
        <h2 className="text-lg font-bold text-fg">🔑 Свой Gemini-ключ</h2>
        <p className="mt-2 text-sm text-muted">
          Добавьте свой API-ключ Google Gemini в профиле — и пользуйтесь AI-помощником и научным
          поиском на сайте бесплатно (по вашей квоте).
        </p>
        <Link
          to="/profile"
          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent transition hover:opacity-80"
        >
          Открыть настройки профиля →
        </Link>
      </section>

      <section className="rounded-2xl border border-border bg-card2 p-5 shadow-brand">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Партнёр</p>
        <h2 className="mt-1 text-lg font-bold text-fg">
          Психологический центр «Dom» в Тбилиси
        </h2>
        <p className="mt-2 text-sm text-muted">
          Очные сессии и аренда кабинета для работы с клиентами.
        </p>
        <Link
          to="/booking"
          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent transition hover:opacity-80"
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
    </div>
  );
}
