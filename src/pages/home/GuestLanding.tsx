import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { SITE_NAME } from '../../routes';
import { useCourses } from '../../hooks/useCourses';
import { useCoursesOpenness } from '../../hooks/useCoursesOpenness';
import { PageLoader } from '../../components/ui';
import { OpenCourseCard, ProgramCourseCard } from './GuestCourseCards';
import {
  ABOUT_LINKS,
  GUEST_COURSE_META,
  GUEST_PROGRAM_COURSE_IDS,
  PLATFORM_FEATURES,
  RETRAINING_LANDING_PATH,
} from './guestLandingData';

const EYEBROW = 'text-[11px] font-bold uppercase tracking-[0.14em] text-accent-muted sm:text-xs';
const H2 = 'font-display text-[22px] font-normal leading-tight text-ink sm:text-[40px]';
const SECTION = 'flex flex-col gap-3 border-t border-border py-6 sm:gap-5 sm:py-12';
const BTN_PRIMARY =
  'inline-flex min-h-[44px] items-center justify-center rounded-full bg-accent px-6 py-3 text-[15px] font-bold text-white transition hover:bg-accent-deep';
const BTN_SECONDARY =
  'inline-flex min-h-[44px] items-center justify-center rounded-full border border-border-cool bg-white px-6 py-3 text-[15px] font-semibold text-ink transition hover:border-ink';

const HERO_TILES = [
  { id: 'gruppovaya-psihoterapiya', open: true },
  { id: 'lektsii-ot-ano-dpo-ekzistentsialno-gumanistichesko', open: true },
  { id: 'development', open: false },
  { id: 'general', open: false },
];

export function GuestLanding() {
  const { courses, loading: coursesLoading } = useCourses();
  const { openCourseIds } = useCoursesOpenness(courses.map((course) => course.id));

  if (coursesLoading) return <PageLoader />;

  const openCourses = courses.filter((course) => openCourseIds.has(course.id));
  const programCourses = GUEST_PROGRAM_COURSE_IDS.map((id) => courses.find((c) => c.id === id)).filter(
    (course): course is NonNullable<typeof course> => Boolean(course) && !openCourseIds.has(course!.id),
  );

  return (
    <div className="flex flex-col text-fg">
      <Helmet>
        <title>{SITE_NAME} — образовательная платформа по психологии</title>
        <meta
          name="description"
          content="DOM Academy — курсы и программа переподготовки по психологии от команды психологического центра DOM в Тбилиси. Открытые курсы можно смотреть без регистрации."
        />
      </Helmet>

      <section className="grid items-center gap-14 pb-6 pt-2 sm:pb-14 lg:grid-cols-[minmax(0,1fr)_480px]">
        <div className="flex flex-col gap-3.5 sm:gap-5">
          <p className={EYEBROW}>Образовательная платформа по психологии</p>
          <h1 className="font-display text-[25px] font-normal leading-[1.15] text-ink sm:text-[48px] lg:text-[60px] lg:leading-[1.05]">
            Психология — от первой лекции до профессии
          </h1>
          <p className="max-w-[560px] text-[15px] leading-relaxed text-ink-soft sm:text-lg">
            Курсы и программа переподготовки от команды психологического центра DOM в Тбилиси.
            <span className="hidden sm:inline"> Конспекты, тесты и научный поиск — в одном месте.</span>
          </p>
          {openCourses.length > 0 ? (
            <p className="flex w-fit items-center gap-2 rounded-xl bg-accent-100 px-3 py-2.5 text-[13.5px] font-semibold text-[#1F3F20] sm:px-4 sm:py-3 sm:text-[14.5px]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="flex-none text-accent" aria-hidden>
                <path d="M8 5v14l11-7z" />
              </svg>
              {openCourses.length === 2 ? 'Два курса открыты' : 'Есть открытые курсы'} — смотрите без регистрации
            </p>
          ) : null}
          <div className="flex flex-col gap-3 sm:mt-1 sm:flex-row">
            {openCourses.length > 0 ? (
              <a className={BTN_PRIMARY} href="#open-courses">
                Смотреть открытые курсы
              </a>
            ) : null}
            <Link className={openCourses.length > 0 ? BTN_SECONDARY : BTN_PRIMARY} to="/login">
              Войти через Google
            </Link>
          </div>
        </div>
        <div className="hidden grid-cols-2 gap-3.5 lg:grid" aria-hidden>
          {HERO_TILES.map((tile) => {
            const meta = GUEST_COURSE_META[tile.id];
            return (
              <div key={tile.id} className={`relative h-[220px] overflow-hidden rounded-[22px] ${meta.tone}`}>
                <img src={meta.cover} alt="" className="h-full w-full rounded-none border-0 object-contain p-4 shadow-none" />
                {tile.open && openCourseIds.has(tile.id) ? (
                  <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-[11.5px] font-bold text-accent">
                    ▶ Открыто
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <section id="about-academy" className={`${SECTION} lg:grid lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-12`}>
        <div className="flex flex-col gap-2.5 sm:gap-4">
          <p className={EYEBROW}>Об Академии</p>
          <h2 className={H2}>Что такое DOM Academy</h2>
          <p className="text-sm leading-relaxed text-ink-soft sm:text-[15.5px]">
            Образовательная среда для тех, кто изучает психологию и развивает собственную практику. Проект вырос из
            психологического центра и профессионального сообщества DOM в Тбилиси, поэтому обучение здесь связано с
            живым опытом, встречами и обменом.
          </p>
          <p className="hidden text-[15.5px] leading-relaxed text-ink-soft sm:block">
            Академию делают Иракли Кобалия, Алексей Зыков и Анастасия Вологжанина.
          </p>
          <div className="flex flex-wrap gap-6 text-sm font-bold">
            <Link to="/about" className="text-accent-deep">Подробнее о проекте →</Link>
            <Link to="/about?tab=team-academy" className="hidden text-accent-deep sm:inline">Команда Академии →</Link>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 sm:flex-col sm:gap-2.5">
          {[
            ['Найти свой путь', 'Изучать разные подходы и постепенно начинать практику.'],
            ['Расти в профессии', 'Становиться специалистом, супервизором или преподавателем.'],
            ['Создавать своё', 'Запускать группы, проекты и события, которые меняют что-то вокруг.'],
          ].map(([title, text]) => (
            <div key={title} className="rounded-full border border-border bg-card px-3 py-1.5 sm:rounded-[18px] sm:px-[18px] sm:py-4">
              <b className="text-[12.5px] font-normal sm:text-[15px] sm:font-semibold">{title}</b>
              <p className="mt-1 hidden text-[13.5px] text-ink-faint sm:block">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="catalog" className={SECTION}>
        <p className={`${EYEBROW} hidden sm:block`}>Каталог</p>
        <h2 className={H2}>Наши курсы</h2>

        {openCourses.length > 0 ? (
          <>
            <div id="open-courses" className="flex scroll-mt-6 items-baseline justify-between">
              <h3 className="text-base font-bold sm:text-[19px]">Открытый доступ — смотрите сейчас</h3>
              <span className="hidden text-[13.5px] text-ink-faint sm:inline">Без регистрации</span>
            </div>
            <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
              {openCourses.map((course) => (
                <OpenCourseCard key={course.id} course={course} />
              ))}
            </div>
          </>
        ) : null}

        {programCourses.length > 0 ? (
          <>
            <div className="mt-3 flex flex-col gap-1 sm:mt-4 sm:flex-row sm:items-baseline sm:justify-between">
              <h3 className="text-base font-bold sm:text-[19px]">Программа переподготовки «Психолог-консультант»</h3>
              <Link to={RETRAINING_LANDING_PATH} className="hidden text-sm font-bold text-accent-deep sm:inline">
                О программе и наборе →
              </Link>
            </div>
            <p className="-mt-1 text-[13px] text-ink-faint sm:-mt-2 sm:text-sm">
              Курсы программы открываются студентам потока. Программу можно посмотреть и сейчас.
            </p>
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-3.5 lg:grid-cols-4">
              {programCourses.map((course) => (
                <ProgramCourseCard key={course.id} course={course} />
              ))}
            </div>
            <Link to={RETRAINING_LANDING_PATH} className="text-sm font-bold text-accent-deep sm:hidden">
              О программе и наборе →
            </Link>
          </>
        ) : null}
      </section>

      <section className={SECTION}>
        <p className={EYEBROW}>После входа</p>
        <h2 className={H2}>Рабочее пространство для учёбы</h2>
        <div className="grid gap-2.5 sm:gap-4 lg:grid-cols-3">
          {PLATFORM_FEATURES.map((feature) => (
            <div key={feature.title} className={`flex items-center gap-3 rounded-2xl p-2.5 sm:rounded-[22px] sm:p-[18px] lg:flex-col lg:items-stretch ${feature.tone}`}>
              <img
                src={feature.image}
                alt={feature.alt}
                loading="lazy"
                className="h-16 w-24 flex-none rounded-[10px] border-0 object-cover object-top shadow-none lg:h-[190px] lg:w-full lg:rounded-xl"
              />
              <span className="flex flex-col gap-0.5 lg:gap-2">
                <b className="text-[14.5px] font-bold lg:text-base">{feature.title}</b>
                <small className="text-[12.5px] text-ink-soft lg:text-[13.5px]">{feature.description}</small>
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 sm:gap-3.5 sm:rounded-[18px] sm:px-5 sm:py-4">
          <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-pastel-lilac sm:h-10 sm:w-10">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" className="text-ink" aria-hidden>
              <path d="M4 5h16v11H9l-5 4z" />
            </svg>
          </span>
          <span className="flex flex-col gap-0.5">
            <b className="text-[14.5px] font-bold sm:text-[15px]">AI-помощник и научный поиск</b>
            <small className="text-[12.5px] text-ink-faint sm:text-[13.5px]">
              Вопросы по лекциям и книгам курса — с таймкодами и страницами. Статьи ищутся в OpenAlex, OpenAIRE и
              Semantic Scholar.
            </small>
          </span>
        </div>
      </section>

      <section id="dom-center" className="mt-1.5 overflow-hidden rounded-[22px] bg-pastel-blue sm:mt-2 sm:rounded-[26px] lg:grid lg:grid-cols-[440px_minmax(0,1fr)]">
        <img
          src="/images/academy-home/dom-room.webp"
          alt="Кабинет психологического центра DOM"
          loading="lazy"
          className="block h-[220px] w-full rounded-none border-0 object-cover shadow-none lg:h-[460px]"
        />
        <div className="flex flex-col gap-2.5 p-[18px] sm:gap-3.5 lg:p-10">
          <span className="hidden w-fit rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white sm:inline-block">
            DOM · Психологический центр
          </span>
          <p className={EYEBROW}>Тбилиси · Орбелиани 38 / Мтквари 2</p>
          <h2 className="font-display text-[22px] font-normal leading-tight text-ink sm:text-[38px]">
            Пространство для практики и встреч
          </h2>
          <p className="hidden text-[15px] leading-relaxed text-ink-soft sm:block">
            Три кабинета — Лазурный, Изумрудный и Бордовый — для консультаций и небольших групп, а также зал для
            лекций, практикумов и мастер-классов.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
            <div className="rounded-xl bg-white px-3 py-2.5 sm:rounded-[14px] sm:px-3.5 sm:py-3">
              <b className="font-display text-lg font-normal text-ink sm:text-[22px]">3 кабинета</b>
              <p className="text-xs text-ink-faint sm:text-[12.5px]">Лазурный, Изумрудный, Бордовый</p>
            </div>
            <div className="rounded-xl bg-white px-3 py-2.5 sm:rounded-[14px] sm:px-3.5 sm:py-3">
              <b className="font-display text-lg font-normal text-ink sm:text-[22px]">Зал</b>
              <p className="text-xs text-ink-faint sm:text-[12.5px]">до 30 человек: лекции, группы, мастер-классы</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:mt-1.5 sm:flex-row sm:items-center sm:gap-4">
            <Link to="/booking" className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#9C4A30] px-6 py-3 text-[14.5px] font-bold text-white">
              Выбрать кабинет и время →
            </Link>
            <Link to="/about?tab=offline" className="hidden text-[14.5px] font-bold text-ink sm:inline">
              Подробнее о центре →
            </Link>
          </div>
        </div>
      </section>

      <section className="my-5 flex flex-col gap-2.5 rounded-[22px] bg-pastel-sage px-5 py-[22px] sm:my-10 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:rounded-[26px] sm:px-9 sm:py-[30px]">
        <div>
          <h2 className="mb-1.5 font-display text-[22px] font-normal text-ink sm:text-[32px]">Готовы начать?</h2>
          <p className="max-w-[640px] text-sm leading-relaxed text-ink-soft sm:text-[15px]">
            Регистрация занимает минуту — через Google. Открытые курсы доступны сразу, курсы вашего потока подключит
            администратор.
          </p>
        </div>
        <Link to="/login" className={`${BTN_PRIMARY} whitespace-nowrap`}>
          Войти через Google
        </Link>
      </section>

      <footer className="flex flex-col gap-3.5 rounded-[22px] bg-[#526B3C] px-4 py-6 text-white sm:flex-row sm:items-center sm:justify-between sm:rounded-[26px] sm:px-10 sm:py-8">
        <img src="/images/academy-home/logo-footer.png" alt="DOM Academy — Development of Mind" className="h-[60px] w-auto self-start rounded-none border-0 shadow-none sm:h-[84px] sm:self-auto" />
        <nav aria-label="Об Академии" className="flex flex-col gap-2.5">
          <span className="hidden text-[11.5px] font-bold uppercase tracking-[0.14em] opacity-85 sm:block">Об Академии</span>
          <div className="flex max-w-[560px] flex-wrap gap-x-4 gap-y-2.5 text-[13.5px] sm:text-sm">
            {ABOUT_LINKS.map((link) => (
              <Link key={link.to} to={link.to} className="text-white hover:underline">
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      </footer>
    </div>
  );
}
