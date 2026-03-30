import { useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import './warm-springs-2.css';

/* ------------------------------------------------------------------ */
/*  Image paths                                                        */
/* ------------------------------------------------------------------ */
const IMG = '/images/warm-springs-2';

/* ------------------------------------------------------------------ */
/*  Shared constants                                                   */
/* ------------------------------------------------------------------ */
const TG_LINK = 'https://t.me/alik_zagonov';
const CTA_TEXT = 'Оставить заявку';

/* ------------------------------------------------------------------ */
/*  Scroll-fade hook                                                   */
/* ------------------------------------------------------------------ */
function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('ws2-visible');
          observer.unobserve(el);
        }
      },
      { threshold: 0.12 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

function FadeSection({
  children,
  className = '',
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = useFadeIn();
  return (
    <div ref={ref} id={id} className={`ws2-fade ${className}`}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CTA button                                                         */
/* ------------------------------------------------------------------ */
function CtaButton({ className = '' }: { className?: string }) {
  return (
    <a
      href={TG_LINK}
      target="_blank"
      rel="noopener noreferrer"
      className={`ws2-btn ${className}`}
    >
      {CTA_TEXT}
    </a>
  );
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */
const audience = [
  {
    title: 'Практикующий психолог или психотерапевт',
    text: 'Хотите вести группы или делать это увереннее. Ищете метод, а не набор техник.',
  },
  {
    title: 'Коуч или специалист помогающей профессии',
    text: 'Социальный работник, педагог. Хотите использовать групповые методы в своей практике.',
  },
  {
    title: 'Опытный клиент терапии',
    text: 'Вам интересно, как устроена групповая психотерапия изнутри, и вы готовы к глубокому опыту.',
  },
  {
    title: 'Ценитель экзистенциального подхода',
    text: 'Вам близки идеи Ялома, Бьюдженталя, Роджерса, Перлза. Терапия для вас — про главное в жизни.',
  },
  {
    title: 'Готовы к интенсивной работе',
    text: 'Три дня глубокого погружения, где профессиональный рост неотделим от личностного.',
  },
  {
    title: 'Любите эксперименты',
    text: 'Хотите получить уникальный опыт обучения через непосредственное проживание и наблюдение.',
  },
];

const program = [
  {
    step: '01',
    title: 'Собеседование',
    duration: '30-60 минут, индивидуально',
    text: 'Личная встреча с ведущим для прояснения ваших целей и готовности к групповому процессу. Очно или онлайн — на ваш выбор. Это и подготовка для вас, и возможность увидеть «закулисье» работы с группой.',
  },
  {
    step: '02',
    title: 'Онлайн-семинар',
    duration: '3 часа, за несколько дней до интенсива',
    text: 'Теоретические основы групповой психотерапии и подробный разбор методики «Тёплые ключи». Знакомство с принципами бифокального участия, правилами безопасности процесса.',
  },
  {
    step: '03',
    title: 'Очный интенсив в Тбилиси',
    duration: '3 дня, 18 часов',
    text: 'Пятница (4 часа): встреча группы, разделение на подгруппы, первые практические упражнения. Суббота и воскресенье (по 7 часов): интенсивная работа с поочерёдной сменой ролей — активное участие и наблюдение. Методические пояснения и супервизии.',
  },
  {
    step: '04',
    title: 'Заключительный онлайн-семинар',
    duration: 'Через неделю после очной части',
    text: 'Методический разбор работы группы, обсуждение результатов и рекомендации для дальнейшей самостоятельной практики.',
  },
];

const instructors = [
  {
    name: 'Александр Загонов',
    photo: `${IMG}/zaganov.jpg`,
    role: 'Экзистенциально-гуманистический психолог, ведущий терапевтических групп',
    details: [
      'Руководитель информационного направления АНО ДПО «ЭГО»',
      'Соучредитель психологического центра «12 коллегий» (СПб)',
      'Ведущий долгосрочных терапевтических групп в Петербурге и Тбилиси',
      'Автор и ведущий Лаборатории Психотерапевтического Мастерства',
      'Факультет психологии СПбГУ, 2010',
    ],
    pair: 1,
  },
  {
    name: 'Елена Янкевич',
    photo: `${IMG}/yankevich.jpg`,
    role: 'Экзистенциальный и EMDR психолог, супервизор',
    details: [
      'Автор и ведущая долгосрочной терапевтической группы «Место встречи» (СПб)',
      'Работает с парами в подходе эмоционально-фокусированной терапии',
      'Автор воркшопа «Я ненавижу свою мать»',
      'Супервизор в мультимодальном подходе',
      'Спикер международных и региональных конференций',
    ],
    pair: 1,
  },
  {
    name: 'Елизавета Заславская',
    photo: `${IMG}/zaslavskaya.jpg`,
    role: 'Психотерапевт, философ, автор терапевтических программ',
    details: [
      'СПбГУ — факультеты психологии и философии (специалитет, магистратура, аспирантура)',
      'Санкт-Петербургский Институт Гештальта (3 года)',
      'Автор программ «Everybody dies» и «Внешность имеет значение»',
      'Ведущая подкаста «Философское Лекарство»',
      'Учредитель психологического пространства «Поле»',
    ],
    pair: 2,
  },
  {
    name: 'Алексей Зыков',
    photo: `${IMG}/zykov.jpg`,
    role: 'Психолог-консультант, супервизор, автор обучающих программ',
    details: [
      'Соучредитель психологического центра «12 коллегий» (СПб)',
      'Автор курсов по супервизии, групповой динамике и возрастной психологии',
      'Участник АНО ДПО «ЭГО», Метаверситета и Содружества «Dom»',
      'Факультет психологии СПбГУ, 2010',
      'Личная терапия с 2007 г., групповая супервизия 2006–2024',
    ],
    pair: 2,
  },
];

const prices = [
  { period: 'Апрель — Май', price: '850', accent: false },
  { period: 'Июнь', price: '950', accent: true },
  { period: 'Июль', price: '1 050', accent: false },
];

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export default function WarmSprings2Page() {
  useEffect(() => {
    document.documentElement.classList.add('ws2-page');
    return () => document.documentElement.classList.remove('ws2-page');
  }, []);

  return (
    <>
      <Helmet>
        <title>Тёплые ключи — интенсив по групповой психотерапии | Тбилиси 2026</title>
        <meta
          name="description"
          content="Обучающе-терапевтический интенсив по групповой психотерапии методом «Тёплые ключи». Тбилиси, 31 июля — 2 августа 2026."
        />
      </Helmet>

      {/* -------- Sticky nav -------- */}
      <nav className="ws2-nav">
        <div className="ws2-nav-inner">
          <span className="ws2-nav-logo">Тёплые ключи</span>
          <div className="ws2-nav-links">
            <a href="#method">О методе</a>
            <a href="#program">Программа</a>
            <a href="#team">Ведущие</a>
            <a href="#price">Стоимость</a>
          </div>
          <a href={TG_LINK} target="_blank" rel="noopener noreferrer" className="ws2-nav-cta">
            Заявка
          </a>
        </div>
      </nav>

      {/* ===================== HERO ===================== */}
      <section className="ws2-hero">
        <div className="ws2-hero-overlay" />
        <div className="ws2-hero-content">
          <p className="ws2-hero-tag">Тбилиси &middot; 31 июля — 2 августа 2026</p>
          <h1 className="ws2-hero-title">
            Обучающе-терапевтический
            <br />
            интенсив по групповой
            <br />
            психотерапии
          </h1>
          <p className="ws2-hero-subtitle">
            Метод &laquo;Тёплые ключи&raquo; &mdash; пространство, где профессиональный рост
            неотделим от личного опыта
          </p>
          <CtaButton className="ws2-hero-cta" />
        </div>
      </section>

      {/* ===================== METHOD ===================== */}
      <FadeSection id="method" className="ws2-section ws2-method">
        <div className="ws2-container">
          <h2 className="ws2-h2">О методе</h2>
          <div className="ws2-method-grid">
            <div className="ws2-method-text">
              <p>
                Интенсив построен на интегративной методике <strong>«Тёплые ключи»</strong>,
                разработанной Эдмондом Эйдемиллером и Алексеем Вовком. Участники делятся на две
                подгруппы, которые поочерёдно работают в режиме активного участия и наблюдения.
              </p>
              <p>
                Такой формат создаёт резонанс: достижения одной подгруппы становятся катализатором
                для другой. За три дня разворачивается множество групповых феноменов, которые
                участники успевают и прожить, и осмыслить, и понять с точки зрения ведения группы.
              </p>
              <div className="ws2-method-levels">
                <h3>Три уровня работы</h3>
                <div className="ws2-level">
                  <span className="ws2-level-num">1</span>
                  <div>
                    <strong>Проживание</strong>
                    <p>Динамическое взаимодействие в группе, непосредственный опыт</p>
                  </div>
                </div>
                <div className="ws2-level">
                  <span className="ws2-level-num">2</span>
                  <div>
                    <strong>Осмысление</strong>
                    <p>Анализ происходящего, осознавание процессов</p>
                  </div>
                </div>
                <div className="ws2-level">
                  <span className="ws2-level-num">3</span>
                  <div>
                    <strong>Методический анализ</strong>
                    <p>Разбор с точки зрения ведения группы</p>
                  </div>
                </div>
              </div>
              <p className="ws2-method-note">
                В основе — полевой, феноменологический подход (Дж. Харрис) и идеи
                экзистенциально-гуманистической терапии Ирвина Ялома и Джеймса Бьюдженталя. Мы
                убеждены: происходящее в реальности важнее любой схемы.
              </p>
            </div>
            <div className="ws2-method-image">
              <img
                src={`${IMG}/venue-circle.jpg`}
                alt="Групповая сессия"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </FadeSection>

      {/* ===================== AUDIENCE ===================== */}
      <FadeSection className="ws2-section ws2-audience">
        <div className="ws2-container">
          <h2 className="ws2-h2">Для кого этот интенсив</h2>
          <div className="ws2-audience-grid">
            {audience.map((item) => (
              <div key={item.title} className="ws2-audience-card">
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </FadeSection>

      {/* ===================== PROGRAM ===================== */}
      <FadeSection id="program" className="ws2-section ws2-program">
        <div className="ws2-container">
          <h2 className="ws2-h2">Программа</h2>
          <div className="ws2-timeline">
            {program.map((item) => (
              <div key={item.step} className="ws2-timeline-item">
                <div className="ws2-timeline-step">{item.step}</div>
                <div className="ws2-timeline-body">
                  <h3>{item.title}</h3>
                  <span className="ws2-timeline-duration">{item.duration}</span>
                  <p>{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </FadeSection>

      {/* ===================== TEAM ===================== */}
      <FadeSection id="team" className="ws2-section ws2-team">
        <div className="ws2-container">
          <h2 className="ws2-h2">Ведущие</h2>
          <p className="ws2-team-intro">
            Курс ведут четыре специалиста — две ко-терапевтические пары с обширным опытом
            индивидуальной и групповой работы. Мультимодальная команда, объединённая едиными
            принципами.
          </p>
          <div className="ws2-team-anime">
            <img
              src={`${IMG}/team-anime.jpg`}
              alt="Команда ведущих"
              loading="lazy"
            />
          </div>
          <div className="ws2-pair-label">Ко-терапевты &middot; Первая пара</div>
          <div className="ws2-instructors-grid">
            {instructors
              .filter((i) => i.pair === 1)
              .map((inst) => (
                <div key={inst.name} className="ws2-instructor">
                  <div className="ws2-instructor-photo">
                    <img src={inst.photo} alt={inst.name} loading="lazy" />
                  </div>
                  <h3>{inst.name}</h3>
                  <p className="ws2-instructor-role">{inst.role}</p>
                  <ul>
                    {inst.details.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
          <div className="ws2-pair-label">Ко-терапевты &middot; Вторая пара</div>
          <div className="ws2-instructors-grid">
            {instructors
              .filter((i) => i.pair === 2)
              .map((inst) => (
                <div key={inst.name} className="ws2-instructor">
                  <div className="ws2-instructor-photo">
                    <img src={inst.photo} alt={inst.name} loading="lazy" />
                  </div>
                  <h3>{inst.name}</h3>
                  <p className="ws2-instructor-role">{inst.role}</p>
                  <ul>
                    {inst.details.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        </div>
      </FadeSection>

      {/* ===================== VENUE ===================== */}
      <FadeSection className="ws2-section ws2-venue">
        <div className="ws2-container">
          <h2 className="ws2-h2">Пространство</h2>
          <div className="ws2-venue-grid">
            <img src={`${IMG}/venue-session.jpg`} alt="Групповая сессия" loading="lazy" />
            <img src={`${IMG}/venue-small-group.jpg`} alt="Малая группа" loading="lazy" />
            <img src={`${IMG}/previous-training.jpg`} alt="Зал предыдущего обучения" loading="lazy" />
            <img src={`${IMG}/venue-details.jpg`} alt="Детали пространства" loading="lazy" />
          </div>
        </div>
      </FadeSection>

      {/* ===================== PRICE ===================== */}
      <FadeSection id="price" className="ws2-section ws2-price">
        <div className="ws2-container">
          <h2 className="ws2-h2">Стоимость участия</h2>
          <div className="ws2-price-grid">
            {prices.map((p) => (
              <div
                key={p.period}
                className={`ws2-price-card ${p.accent ? 'ws2-price-accent' : ''}`}
              >
                <span className="ws2-price-period">{p.period}</span>
                <span className="ws2-price-value">
                  {p.price} <small>лари</small>
                </span>
              </div>
            ))}
          </div>
          <p className="ws2-price-note">
            Размышляете об участии? Запишитесь на <strong>бесплатное собеседование</strong> и
            обсудите все подробности.
          </p>
          <p className="ws2-price-cert">
            По окончании курса участники получают официальный сертификат от АНО ДПО
            &laquo;Экзистенциально-гуманистическое образование&raquo;.
          </p>
          <CtaButton />
        </div>
      </FadeSection>

      {/* ===================== FINAL CTA ===================== */}
      <section className="ws2-final">
        <div className="ws2-final-overlay" />
        <div className="ws2-final-content">
          <h2>Присоединяйтесь</h2>
          <p>
            Тбилиси &middot; 31 июля — 2 августа 2026
          </p>
          <CtaButton />
        </div>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer className="ws2-footer">
        <p>Содружество психологов Dom &middot; 2026</p>
      </footer>
    </>
  );
}
