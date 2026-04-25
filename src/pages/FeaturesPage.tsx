import { Link } from 'react-router-dom';
import { FEATURE_GROUPS, type FeatureEntry } from './featuresContent';

/**
 * /features — обзор возможностей DOM Academy.
 *
 * Страница статична. Каждая большая фича описывается по схеме
 * «что это — зачем — как пользоваться».
 *
 * Контент лежит в `./featuresContent.ts`; этот файл отвечает только за разметку.
 */

function FeatureBlock({ feature }: { feature: FeatureEntry }) {
  const { emoji, eyebrow, title, intro, value, steps, cta, note } = feature;
  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-brand sm:p-7">
      <div className="flex items-start gap-4">
        <span className="text-4xl leading-none sm:text-5xl" aria-hidden>
          {emoji}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{eyebrow}</p>
          <h3 className="mt-1 text-xl font-bold text-fg sm:text-2xl">{title}</h3>
        </div>
      </div>
      <p className="mt-4 text-base leading-relaxed text-fg">{intro}</p>
      <p className="mt-3 text-sm text-muted">{value}</p>

      <div className="mt-5 rounded-xl border border-border bg-card2 p-4 sm:p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
          Как пользоваться
        </p>
        <ol className="space-y-2.5">
          {steps.map((step, index) => (
            <li key={index} className="flex gap-3 text-sm text-fg">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-100 text-[11px] font-bold text-accent">
                {index + 1}
              </span>
              <span className="leading-relaxed">
                <span className="font-semibold">{step.label}.</span> {step.text}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {note ? (
        <p className="mt-4 rounded-xl border border-[#E8D880] bg-mark px-4 py-2.5 text-xs leading-relaxed text-[#5a4b00]">
          {note}
        </p>
      ) : null}

      {cta ? (
        <div className="mt-5">
          <Link
            to={cta.to}
            className="inline-flex items-center gap-2 rounded-xl border border-accent/30 bg-accent-100 px-4 py-2 text-sm font-semibold text-accent transition hover:bg-accent-100/70"
          >
            {cta.label} →
          </Link>
        </div>
      ) : null}
    </article>
  );
}

export default function FeaturesPage() {
  return (
    <section className="min-h-screen bg-bg py-10 sm:py-14">
      <div className="mx-auto max-w-5xl space-y-10 px-4">
        {/* HERO */}
        <header className="rounded-2xl border border-border bg-card p-6 shadow-brand sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            DOM Academy
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-fg sm:text-4xl">
            Что можно делать на платформе
          </h1>
          <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-fg sm:text-lg">
            DOM Academy — это онлайн-пространство для изучения психологии: видеокурсы
            с транскриптами, AI-ассистенты по лекциям и книгам, интерактивный таймлайн,
            клиническая таблица по расстройствам, заметки, тесты и групповые объявления.
            Ниже — короткое описание каждой фичи и как ей пользоваться.
          </p>
        </header>

        {FEATURE_GROUPS.map((group) => (
          <div key={group.section} className="space-y-5">
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
              {group.section}
            </h2>
            {group.features.map((feature) => (
              <FeatureBlock key={feature.title} feature={feature} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
