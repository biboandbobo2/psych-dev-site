import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { SITE_NAME } from '../../routes';
import { useCourses, type CourseOption } from '../../hooks/useCourses';
import { useCoursesOpenness } from '../../hooks/useCoursesOpenness';
import { getCourseIntroPath } from '../../lib/courseLinks';
import { PageLoader } from '../../components/ui';
import './guest-landing.css';

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
    tone: 'sage',
  },
  {
    image: '/images/academy-home/development.webp',
    label: '14 периодов жизни',
    description: 'От периода до рождения до глубокой старости.',
    tone: 'ochre',
  },
  {
    image: '/images/academy-home/pathopsychology.webp',
    label: 'Детский и взрослый возраст',
    description: 'Норма, нарушения и методы исследования.',
    tone: 'blue',
  },
  {
    image: '/images/academy-home/general-psychology.webp',
    label: 'Базовые процессы психики',
    description: 'Системное понимание психических процессов.',
    tone: 'terracotta',
  },
  {
    image: '/images/academy-home/clinical-psychology.webp',
    label: 'Введение в профессию',
    description: 'Основные понятия, направления и задачи.',
    tone: 'cream',
  },
  {
    image: '/images/academy-home/humanistic-education.webp',
    label: 'Архив редких лекций',
    description: 'Записи встреч и профессиональных семинаров.',
    tone: 'lilac',
  },
];

function visualForCourse(course: CourseOption, index: number): CourseVisual {
  const haystack = `${course.id} ${course.name}`.toLocaleLowerCase('ru');

  if (haystack.includes('групп')) return COURSE_VISUALS[0];
  if (course.id === 'development' || haystack.includes('развит')) return COURSE_VISUALS[1];
  if (haystack.includes('патопсих')) return COURSE_VISUALS[2];
  if (course.id === 'general' || haystack.includes('общая психолог')) return COURSE_VISUALS[3];
  if (haystack.includes('клинич')) return COURSE_VISUALS[4];
  if (haystack.includes('гуманист') || haystack.includes('лекци')) return COURSE_VISUALS[5];

  return COURSE_VISUALS[index % COURSE_VISUALS.length];
}

function CourseCard({
  course,
  isOpen,
  index,
}: {
  course: CourseOption;
  isOpen: boolean;
  index: number;
}) {
  const visual = visualForCourse(course, index);

  return (
    <Link to={getCourseIntroPath(course.id)} className="ga-course-card">
      <div className={`ga-course-cover ga-course-cover-${visual.tone}`}>
        <div className="ga-course-art" aria-hidden="true">
          <img src={visual.image} alt="" />
        </div>
        <span className="ga-course-label">{visual.label}</span>
      </div>
      <div className="ga-course-copy">
        <h3>{course.name}</h3>
        <p>{visual.description}</p>
        <span>{isOpen ? 'Смотреть бесплатно →' : 'Посмотреть структуру →'}</span>
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
    tone: 'blue',
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
    tone: 'ochre',
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
    tone: 'sage',
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
    <div className="ga-page">
      <Helmet>
        <title>{SITE_NAME} — образовательная платформа по психологии</title>
        <meta
          name="description"
          content="DOM Academy — образовательная платформа по психологии и смежным с ней областям. Курсы, тесты, таймлайн, заметки, научный поиск и AI-помощник."
        />
      </Helmet>

      <section className="ga-panel ga-hero">
        <p className="ga-eyebrow">Development of Mind</p>
        <h1>DOM Academy</h1>
        <p className="ga-hero-copy">
          Образовательная платформа по психологии и смежным областям. Курсы, инструменты для
          самостоятельной работы и научный поиск.
        </p>
        <div className="ga-actions">
          <Link className="ga-button ga-button-primary" to="/login">
            Войти / Зарегистрироваться
          </Link>
          <a className="ga-button ga-button-secondary" href="#catalog">
            Посмотреть курсы
          </a>
        </div>
      </section>

      <section className="ga-panel ga-about" id="about-academy">
        <div>
          <p className="ga-eyebrow">Об Академии</p>
          <h2>Что такое DOM Academy</h2>
          <p className="ga-about-copy">
            DOM Academy — образовательная среда для тех, кто изучает психологию и развивает
            собственную практику. Проект вырос из психологического центра и профессионального
            сообщества DOM в Тбилиси, поэтому обучение здесь связано с живым опытом, встречами и
            обменом. Академию делают Иракли Кобалия, Алексей Зыков и Анастасия Вологжанина. Для
            команды это «не просто набор программ, а среда, в которой человек постепенно ищет
            собственный путь в профессии».
          </p>
          <Link className="ga-text-link" to="/about">
            Подробнее о проекте →
          </Link>
        </div>
        <div className="ga-about-points">
          <article>
            <span>01</span>
            <div>
              <h3>Найти свой путь</h3>
              <p>Изучать разные подходы и постепенно начинать практику.</p>
            </div>
          </article>
          <article>
            <span>02</span>
            <div>
              <h3>Расти в профессии</h3>
              <p>Становиться специалистом, супервизором или преподавателем.</p>
            </div>
          </article>
          <article>
            <span>03</span>
            <div>
              <h3>Создавать своё</h3>
              <p>Запускать группы, проекты и события, которые меняют что-то вокруг.</p>
            </div>
          </article>
        </div>
      </section>

      <section className="ga-panel ga-courses" id="catalog">
        <div className="ga-section-heading">
          <div>
            <p className="ga-eyebrow">Каталог</p>
            <h2>Наши курсы</h2>
          </div>
          <p>
            Выберите тему и откройте вводную страницу. Открытые курсы можно смотреть без
            регистрации.
          </p>
        </div>
        {opennessLoading && courses.length > 0 ? (
          <p className="ga-loading">Проверяем доступность материалов…</p>
        ) : null}
        <div className="ga-course-grid">
          {sortedCourses.map((course, index) => (
            <CourseCard
              key={course.id}
              course={course}
              isOpen={openCourseIds.has(course.id)}
              index={index}
            />
          ))}
        </div>
      </section>

      <section className="ga-panel ga-platform" id="after-registration">
        <div className="ga-platform-intro">
          <p className="ga-eyebrow">Личный кабинет</p>
          <h2>После регистрации</h2>
          <p>
            Платформа становится рабочим пространством: лекция, конспект, личный опыт и проверка
            знаний связаны между собой.
          </p>
        </div>
        {PLATFORM_FEATURES.map((feature) => (
          <article key={feature.number} className={`ga-feature ga-feature-${feature.tone}`}>
            <div className="ga-feature-copy">
              <span className="ga-feature-number">{feature.number}</span>
              <p className="ga-feature-eyebrow">{feature.eyebrow}</p>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
            <figure>
              <img src={feature.image} alt={feature.alt} loading="lazy" />
              <figcaption>{feature.caption}</figcaption>
            </figure>
          </article>
        ))}
        <div className="ga-platform-actions">
          <Link className="ga-button ga-button-primary" to="/login">
            Зарегистрироваться
          </Link>
          <Link className="ga-text-link" to="/features">
            Все возможности платформы →
          </Link>
        </div>
      </section>

      <section className="ga-center" id="dom-center">
        <div className="ga-center-image">
          <img
            src="/images/academy-home/dom-center.webp"
            alt="Изумрудный кабинет психологического центра DOM"
            loading="lazy"
          />
        </div>
        <div className="ga-center-copy">
          <div className="ga-center-brand">
            <span>DOM</span>
            <small>Психологический центр</small>
          </div>
          <p className="ga-eyebrow">Тбилиси · Орбелиани 38 / Мтквари 2</p>
          <h2>Пространство для практики и встреч</h2>
          <p>
            Четыре кабинета для консультаций и небольших групп, а также зал для лекций,
            практикумов и мастер-классов.
          </p>
          <div className="ga-center-facts">
            <article>
              <b>4 кабинета</b>
              <small>для консультаций и небольших групп</small>
            </article>
            <article>
              <b>Зал до 30 человек</b>
              <small>лекции, группы и мастер-классы</small>
            </article>
          </div>
          <Link className="ga-button ga-button-center" to="/booking">
            Выбрать кабинет и время
          </Link>
        </div>
      </section>

      <section className="ga-panel ga-final">
        <p className="ga-eyebrow">Начните знакомство с платформой</p>
        <h2>Учитесь в своём темпе и сохраняйте всё важное в одном месте</h2>
        <Link className="ga-button ga-button-primary" to="/login">
          Войти / Зарегистрироваться
        </Link>
      </section>
    </div>
  );
}
