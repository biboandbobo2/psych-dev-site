import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { SITE_NAME } from '../../routes';
import { useCourses, type CourseOption } from '../../hooks/useCourses';
import { useCoursesOpenness } from '../../hooks/useCoursesOpenness';
import { getCourseIntroPath } from '../../lib/courseLinks';
import { PageLoader } from '../../components/ui';

const PANEL = 'overflow-hidden rounded-[26px] border border-border-cool max-[420px]:rounded-[20px]';
const EYEBROW = 'mb-3 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-accent-muted';
const BUTTON =
  'inline-flex min-h-[44px] items-center justify-center rounded-[11px] px-[1.15rem] py-[0.7rem] text-[0.78rem] font-bold transition hover:-translate-y-px';
const BUTTON_PRIMARY = `${BUTTON} bg-accent text-white shadow-[0_8px_20px_rgb(46_125_50/0.14)]`;
const TEXT_LINK = 'text-[0.78rem] font-bold text-accent-deep';

type CourseVisual = {
  image: string;
  label: string;
  description: string;
  tone: string;
};

const COURSE_VISUALS: CourseVisual[] = [
  {
    image: '/images/academy-home/group-therapy.webp',
    label: 'Теория и практика групп',
    description: 'Теории и практика работы с группой.',
    tone: 'bg-pastel-sage',
  },
  {
    image: '/images/academy-home/development.webp',
    label: '14 периодов жизни',
    description: 'От периода до рождения до глубокой старости.',
    tone: 'bg-pastel-ochre',
  },
  {
    image: '/images/academy-home/pathopsychology.webp',
    label: 'Детский и взрослый возраст',
    description: 'Норма, нарушения и методы исследования.',
    tone: 'bg-pastel-blue',
  },
  {
    image: '/images/academy-home/general-psychology.webp',
    label: 'Базовые процессы психики',
    description: 'Системное понимание психических процессов.',
    tone: 'bg-pastel-terracotta',
  },
  {
    image: '/images/academy-home/clinical-psychology.webp',
    label: 'Введение в профессию',
    description: 'Основные понятия, направления и задачи.',
    tone: 'bg-pastel-cream',
  },
  {
    image: '/images/academy-home/humanistic-education.webp',
    label: 'Архив редких лекций',
    description: 'Записи встреч и профессиональных семинаров.',
    tone: 'bg-pastel-lilac',
  },
];

function visualForCourse(course: CourseOption): CourseVisual | null {
  const haystack = `${course.id} ${course.name}`.toLocaleLowerCase('ru');

  if (haystack.includes('групп')) return COURSE_VISUALS[0];
  if (course.id === 'development' || haystack.includes('развит')) return COURSE_VISUALS[1];
  if (haystack.includes('патопсих')) return COURSE_VISUALS[2];
  if (course.id === 'general' || haystack.includes('общая психолог')) return COURSE_VISUALS[3];
  if (haystack.includes('клинич')) return COURSE_VISUALS[4];
  if (haystack.includes('гуманист') || haystack.includes('лекци')) return COURSE_VISUALS[5];

  return null;
}

function CourseCard({
  course,
  isOpen,
}: {
  course: CourseOption;
  isOpen: boolean;
}) {
  const visual = visualForCourse(course);

  return (
    <Link
      to={getCourseIntroPath(course.id)}
      className="grid min-h-[330px] grid-rows-[156px_1fr] overflow-hidden rounded-[20px] border border-border-cool bg-card text-inherit transition hover:-translate-y-0.5 hover:border-[#AEBBB8] hover:shadow-[0_14px_30px_rgb(36_56_75/0.1)]"
    >
      <div
        className={`relative overflow-hidden border-b border-border-cool ${visual ? visual.tone : 'bg-pastel-plain'}`}
      >
        {visual ? (
          <>
            <div
              className="absolute bottom-[-5px] left-2 h-[142px] w-[calc(58%-12px)] overflow-hidden max-[420px]:left-[6px] max-[420px]:w-[calc(58%-10px)]"
              aria-hidden="true"
            >
              <img
                src={visual.image}
                alt=""
                className="block h-full w-full object-contain object-left-bottom mix-blend-multiply [filter:contrast(220%)_brightness(1.05)]"
              />
            </div>
            <span className="absolute left-[calc(58%+10px)] right-[0.9rem] top-4 z-[1] flex min-h-8 items-center justify-center rounded-full border border-ink/[0.24] bg-white/[0.72] px-2 py-[0.4rem] text-center text-[0.58rem] leading-[1.2] text-ink max-[420px]:left-[calc(58%+8px)] max-[420px]:right-[0.65rem] max-[420px]:text-[0.54rem]">
              {visual.label}
            </span>
          </>
        ) : null}
      </div>
      <div className="flex flex-col items-start p-[1.35rem]">
        <h3 className="mb-[0.55rem] font-display text-[clamp(1.35rem,3.2vw,1.8rem)] font-medium leading-[1.08]">
          {course.name}
        </h3>
        {visual ? (
          <p className="text-[0.76rem] leading-[1.5] text-ink-faint">{visual.description}</p>
        ) : null}
        <span className="mt-auto pt-[1.1rem] text-[0.72rem] font-bold text-accent-deep">
          {isOpen ? 'Смотреть бесплатно →' : 'Посмотреть структуру →'}
        </span>
      </div>
    </Link>
  );
}

const PLATFORM_FEATURES = [
  {
    number: '01',
    eyebrow: 'Режим конспекта',
    title: 'Видео, заметки и транскрипт — на одном экране',
    description:
      'Смотрите лекцию и фиксируйте мысли рядом с видео. Конспект сохраняется автоматически и остаётся привязанным к курсу.',
    image: '/images/vozrast/screens/konspekt.jpg',
    alt: 'Экран лекции с видео, конспектом и транскриптом',
    caption: 'Лекция и личный конспект',
    tone: 'bg-pastel-blue',
  },
  {
    number: '02',
    eyebrow: 'Проверка знаний',
    title: 'Тесты показывают, что усвоено, а к чему стоит вернуться',
    description:
      'Результаты сохраняются в профиле. Обучение дополняют AI-помощник, вопросы к семинарам и научный поиск.',
    image: '/images/vozrast/screens/tests.jpg',
    alt: 'Экран теста по занятию на платформе DOM Academy',
    caption: 'Тесты по занятиям и курсам',
    tone: 'bg-pastel-ochre',
  },
  {
    number: '03',
    eyebrow: 'Таймлайн жизни',
    title: 'Связывайте события с теориями развития',
    description:
      'Собирайте жизненный путь на интерактивном холсте: события, возрастные периоды, сферы жизни и развилки становятся видимой картой.',
    image: '/images/vozrast/screens/timeline.jpg',
    alt: 'Интерактивный таймлайн жизни с событиями по возрастам',
    caption: 'Инструмент курса по психологии развития',
    tone: 'bg-pastel-sage',
  },
];

export function GuestLanding() {
  const { courses, loading: coursesLoading } = useCourses();
  const { openCourseIds, loading: opennessLoading } = useCoursesOpenness(
    courses.map((course) => course.id),
  );

  if (coursesLoading) return <PageLoader />;

  const sortedCourses = [...courses].sort(
    (a, b) => Number(openCourseIds.has(b.id)) - Number(openCourseIds.has(a.id)),
  );

  return (
    <div className="flex flex-col gap-[18px] pb-8 pt-[18px] text-ink max-[420px]:gap-3 max-[420px]:pt-3">
      <Helmet>
        <title>{SITE_NAME} — образовательная платформа по психологии</title>
        <meta
          name="description"
          content="DOM Academy — образовательная платформа по психологии и смежным с ней областям. Курсы, тесты, таймлайн, заметки, научный поиск и AI-помощник."
        />
      </Helmet>

      <section
        className={`${PANEL} bg-[linear-gradient(135deg,var(--accent-100),var(--mark))] px-[clamp(1.5rem,7vw,4.5rem)] py-[clamp(2.75rem,8vw,5.25rem)] max-[420px]:px-4`}
      >
        <p className="mb-3 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted">
          Development of Mind
        </p>
        <h1 className="max-w-[44rem] font-display text-[clamp(2.7rem,8vw,4.75rem)] font-medium uppercase leading-[0.98] tracking-[0.04em] text-accent">
          DOM Academy
        </h1>
        <p className="mt-6 max-w-[39rem] text-[clamp(0.95rem,2vw,1.125rem)] leading-[1.55] text-fg/80">
          Образовательная платформа по психологии и смежным областям. Курсы, инструменты для
          самостоятельной работы и научный поиск.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-[0.7rem]">
          <Link className={BUTTON_PRIMARY} to="/login">
            Войти / Зарегистрироваться
          </Link>
          <a className={`${BUTTON} border border-accent/40 bg-white text-accent`} href="#catalog">
            Посмотреть курсы
          </a>
        </div>
      </section>

      <section
        id="about-academy"
        className={`${PANEL} grid grid-cols-[0.98fr_1.02fr] items-center gap-[clamp(1.6rem,4vw,2.75rem)] bg-pastel-blue px-[clamp(1.2rem,4vw,2.6rem)] py-[clamp(1.75rem,4vw,2.6rem)] max-[720px]:grid-cols-1`}
      >
        <div>
          <p className={EYEBROW}>Об Академии</p>
          <h2 className="font-display text-[clamp(2rem,5vw,3rem)] font-medium leading-[1.05]">
            Что такое DOM Academy
          </h2>
          <p className="mb-4 mt-[0.9rem] max-w-[33rem] text-[0.82rem] leading-[1.62] text-ink-soft">
            DOM Academy — образовательная среда для тех, кто изучает психологию и развивает
            собственную практику. Проект вырос из психологического центра и профессионального
            сообщества DOM в Тбилиси, поэтому обучение здесь связано с живым опытом, встречами и
            обменом. Академию делают Иракли Кобалия, Алексей Зыков и Анастасия Вологжанина. Для
            команды это «не просто набор программ, а среда, в которой человек постепенно ищет
            собственный путь в профессии».
          </p>
          <Link className={TEXT_LINK} to="/about">
            Подробнее о проекте →
          </Link>
        </div>
        <div className="grid gap-[0.55rem] self-center">
          {[
            ['01', 'Найти свой путь', 'Изучать разные подходы и постепенно начинать практику.'],
            ['02', 'Расти в профессии', 'Становиться специалистом, супервизором или преподавателем.'],
            ['03', 'Создавать своё', 'Запускать группы, проекты и события, которые меняют что-то вокруг.'],
          ].map(([num, title, text]) => (
            <article
              key={num}
              className="grid grid-cols-[2.2rem_1fr] items-center gap-3 rounded-[15px] border border-[#ACBCC7] bg-white/[0.58] px-[0.9rem] py-[0.8rem]"
            >
              <span className="grid h-[2.2rem] w-[2.2rem] place-items-center rounded-full border border-pastel-blue-deep font-display text-[0.65rem] text-pastel-blue-deep">
                {num}
              </span>
              <div>
                <h3 className="mb-[0.18rem] font-display text-[1.1rem] font-medium">{title}</h3>
                <p className="text-[0.7rem] leading-[1.45] text-ink-faint">{text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        id="catalog"
        className={`${PANEL} bg-[#FBFCFA] px-[clamp(1.2rem,5vw,3.15rem)] py-[clamp(2.1rem,6vw,3.9rem)] max-[420px]:px-4`}
      >
        <div className="mb-7 grid grid-cols-[1fr_0.9fr] items-end gap-7 max-[720px]:grid-cols-1">
          <div>
            <p className={EYEBROW}>Каталог</p>
            <h2 className="font-display text-[clamp(2rem,5vw,3rem)] font-medium leading-[1.05]">
              Наши курсы
            </h2>
          </div>
          <p className="text-[0.82rem] leading-[1.6] text-ink-faint">
            Выберите тему и откройте вводную страницу. Открытые курсы можно смотреть без
            регистрации.
          </p>
        </div>
        {opennessLoading && courses.length > 0 ? (
          <p className="-mt-3 mb-4 text-xs text-ink-faint">Проверяем доступность материалов…</p>
        ) : null}
        <div className="grid grid-cols-2 gap-[0.9rem] max-[720px]:grid-cols-1">
          {sortedCourses.map((course) => (
            <CourseCard key={course.id} course={course} isOpen={openCourseIds.has(course.id)} />
          ))}
        </div>
      </section>

      <section
        id="after-registration"
        className={`${PANEL} bg-white px-[clamp(1.2rem,5vw,3.15rem)] py-[clamp(2.1rem,6vw,3.9rem)] max-[420px]:px-4`}
      >
        <div className="mb-[1.6rem] max-w-3xl">
          <p className={EYEBROW}>Личный кабинет</p>
          <h2 className="mb-[0.8rem] font-display text-[clamp(2.65rem,7vw,4.15rem)] font-medium leading-[1.05]">
            После регистрации
          </h2>
          <p className="text-[0.82rem] leading-[1.6] text-ink-faint">
            Платформа становится рабочим пространством: лекция, конспект, личный опыт и проверка
            знаний связаны между собой.
          </p>
        </div>
        {PLATFORM_FEATURES.map((feature) => (
          <article
            key={feature.number}
            className={`mt-3 grid grid-cols-[0.72fr_1.28fr] items-center gap-[clamp(1rem,3vw,1.75rem)] rounded-[22px] border border-border-cool p-[clamp(1rem,2.5vw,1.35rem)] max-[720px]:grid-cols-1 ${feature.tone}`}
          >
            <div>
              <span className="inline-grid h-9 w-9 place-items-center rounded-full border border-current font-display text-[0.72rem] text-pastel-blue-deep">
                {feature.number}
              </span>
              <p className="mb-[0.35rem] mt-3 text-[0.57rem] font-bold uppercase tracking-[0.1em] text-accent-deep">
                {feature.eyebrow}
              </p>
              <h3 className="font-display text-[clamp(1.4rem,3.4vw,2rem)] font-medium leading-[1.08]">
                {feature.title}
              </h3>
              <p className="mt-[0.6rem] text-[0.75rem] leading-[1.5] text-ink-soft">
                {feature.description}
              </p>
            </div>
            <figure className="m-0 overflow-hidden rounded-2xl border border-[#AEB9BC] bg-card shadow-[0_12px_30px_rgb(36_56_75/0.12)]">
              <img
                src={feature.image}
                alt={feature.alt}
                loading="lazy"
                className="block aspect-[1.9/1] w-full object-cover object-top"
              />
              <figcaption className="border-t border-border-cool px-[0.7rem] py-2 text-[0.57rem] text-ink-faint">
                {feature.caption}
              </figcaption>
            </figure>
          </article>
        ))}
        <div className="mt-7 flex flex-wrap items-center gap-[0.7rem]">
          <Link className={BUTTON_PRIMARY} to="/login">
            Зарегистрироваться
          </Link>
          <Link className={TEXT_LINK} to="/features">
            Все возможности платформы →
          </Link>
        </div>
      </section>

      <section
        id="dom-center"
        className="grid grid-cols-[minmax(280px,0.78fr)_minmax(0,1.22fr)] overflow-hidden rounded-[26px] border border-[#9EB0BD] bg-pastel-blue max-[720px]:grid-cols-1 max-[420px]:rounded-[20px]"
      >
        <div className="grid h-[410px] place-items-center overflow-hidden border-r border-[#9EB0BD] bg-[#123B35] max-[720px]:h-auto max-[720px]:border-b max-[720px]:border-r-0">
          <img
            src="/images/academy-home/dom-center.webp"
            alt="Изумрудный кабинет психологического центра DOM"
            loading="lazy"
            className="block h-full w-full object-contain max-[720px]:h-auto"
          />
        </div>
        <div className="self-center p-[clamp(1.5rem,4vw,2.4rem)]">
          <div className="mb-4 inline-flex items-center gap-[0.55rem] rounded-full bg-pastel-blue-deep px-[0.65rem] py-[0.45rem] text-white">
            <span className="text-[0.65rem] font-bold tracking-[0.12em]">DOM</span>
            <small className="border-l border-white/40 pl-[0.55rem] text-[0.58rem] leading-none text-white">
              Психологический центр
            </small>
          </div>
          <p className={EYEBROW}>Тбилиси · Орбелиани 38 / Мтквари 2</p>
          <h2 className="font-display text-[clamp(1.8rem,4vw,2.45rem)] font-medium leading-[1.05] text-pastel-blue-deep">
            Пространство для практики и встреч
          </h2>
          <p className="my-3 text-[0.76rem] leading-[1.55] text-ink-soft">
            Четыре кабинета для консультаций и небольших групп, а также зал для лекций,
            практикумов и мастер-классов.
          </p>
          <div className="my-[0.9rem] grid grid-cols-2 gap-[0.55rem] max-[420px]:grid-cols-1">
            <article className="grid gap-[0.2rem] rounded-[13px] border border-[#AABCC8] bg-white/[0.58] p-[0.7rem]">
              <b className="text-[0.68rem]">4 кабинета</b>
              <small className="text-[0.58rem] leading-[1.3] text-ink-faint">
                для консультаций и небольших групп
              </small>
            </article>
            <article className="grid gap-[0.2rem] rounded-[13px] border border-[#AABCC8] bg-white/[0.58] p-[0.7rem]">
              <b className="text-[0.68rem]">Зал до 30 человек</b>
              <small className="text-[0.58rem] leading-[1.3] text-ink-faint">
                лекции, группы и мастер-классы
              </small>
            </article>
          </div>
          <Link className={`${BUTTON} bg-[#A04C35] text-white`} to="/booking">
            Выбрать кабинет и время
          </Link>
        </div>
      </section>

      <section
        className={`${PANEL} bg-[linear-gradient(135deg,#F7F2DF,#F3F6E8)] p-[clamp(2.3rem,6vw,3.65rem)] text-center max-[420px]:px-4`}
      >
        <p className={EYEBROW}>Начните знакомство с платформой</p>
        <h2 className="mx-auto mb-6 max-w-[43rem] font-display text-[clamp(1.8rem,4.5vw,2.7rem)] font-medium leading-[1.05]">
          Учитесь в своём темпе и сохраняйте всё важное в одном месте
        </h2>
        <Link className={BUTTON_PRIMARY} to="/login">
          Войти / Зарегистрироваться
        </Link>
      </section>
    </div>
  );
}
