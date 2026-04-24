import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { SITE_NAME } from '../routes';

// Черновик описания миссии. Легко редактировать: меняйте текст в этом массиве —
// каждый элемент рендерится как отдельный абзац.
const MISSION_PARAGRAPHS: string[] = [
  'DOM Academy — это онлайн-платформа, на которой мы учим психологии и смежным дисциплинам. Мы верим, что качественное образование должно быть доступным и при этом не упрощённым: поэтому собираем курсы, инструменты и сообщество в одном месте.',
  'Наш подход — «курсы плюс инструменты». Рядом с лекциями живут тесты, заметки, таймлайн жизни, научный поиск и AI-помощник. Теория сразу встречается с практикой: студент может законспектировать мысль, проверить себя на тесте и найти первоисточник.',
  'Мы строим сообщество вокруг профессиональной психологии — для студентов, начинающих специалистов и практикующих коллег. Развитие ума — это не разовый курс, а долгий маршрут; мы стараемся сделать его чуть менее одиноким и чуть более осмысленным.',
];

// Добавляйте новых партнёров в этот массив — карточки появятся автоматически.
interface Partner {
  name: string;
  description: string;
  url?: string;
  logo?: string;
}

const PARTNERS: Partner[] = [
  {
    name: 'Психологический центр «Dom» в Тбилиси',
    description:
      'Очные сессии и аренда кабинета для работы с клиентами. Бронирование кабинетов центра доступно прямо на платформе.',
    url: '/booking',
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8 sm:py-10">
      <Helmet>
        <title>О проекте — {SITE_NAME}</title>
        <meta
          name="description"
          content="DOM Academy (Development Of Mind) — образовательная платформа по психологии: курсы, инструменты и сообщество."
        />
      </Helmet>

      <header className="rounded-2xl border border-border bg-card p-6 shadow-brand sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted">О проекте</p>
        <h1 className="mt-2 text-3xl font-black leading-tight text-fg sm:text-4xl">
          DOM Academy
        </h1>
        <p className="mt-2 text-lg font-semibold text-accent">Development Of Mind</p>
        <p className="mt-3 text-sm text-muted">
          Аббревиатура «DOM» раскрывается как «Development Of Mind» — развитие ума.
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-brand sm:p-8">
        <h2 className="text-2xl font-bold text-fg">Миссия и философия</h2>
        <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-fg/90">
          {MISSION_PARAGRAPHS.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-fg">Партнёры</h2>
          <p className="mt-1 text-sm text-muted">
            Люди и проекты, с которыми мы работаем вместе.
          </p>
        </div>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {PARTNERS.map((partner) => (
            <li key={partner.name}>
              <PartnerCard partner={partner} />
            </li>
          ))}
        </ul>
      </section>

      <div>
        <Link
          to="/home"
          className="inline-flex items-center gap-1 text-sm font-semibold text-accent transition hover:text-[#1F4D22]"
        >
          ← Вернуться на главную
        </Link>
      </div>
    </div>
  );
}

function PartnerCard({ partner }: { partner: Partner }) {
  const body = (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-brand transition hover:border-accent/40 hover:bg-accent-100/40">
      <h3 className="text-lg font-semibold text-fg">{partner.name}</h3>
      <p className="mt-2 flex-1 text-sm text-muted">{partner.description}</p>
      {partner.url ? (
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent">
          Перейти →
        </span>
      ) : null}
    </div>
  );

  if (!partner.url) {
    return body;
  }

  if (partner.url.startsWith('/')) {
    return (
      <Link to={partner.url} className="block h-full">
        {body}
      </Link>
    );
  }

  return (
    <a href={partner.url} target="_blank" rel="noopener noreferrer" className="block h-full">
      {body}
    </a>
  );
}
