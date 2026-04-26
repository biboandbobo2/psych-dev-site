import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

export interface ProjectImage {
  src: string;
  alt: string;
  caption?: string;
}

export interface ProjectCta {
  label: string;
  to?: string;
  href?: string;
}

export interface ProjectPageProps {
  title: string;
  subtitle?: string;
  intro: string;
  paragraphs?: string[];
  images?: ProjectImage[];
  cta?: ProjectCta;
}

function ProjectCtaButton({ cta }: { cta: ProjectCta }) {
  const className =
    'inline-flex items-center rounded-2xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90';
  if (cta.to) {
    return (
      <Link to={cta.to} className={className}>
        {cta.label}
      </Link>
    );
  }
  if (cta.href) {
    return (
      <a href={cta.href} target="_blank" rel="noopener noreferrer" className={className}>
        {cta.label}
      </a>
    );
  }
  return null;
}

/**
 * Шаблон страницы проекта DOM Academy.
 * Не лендинг — это одна из страниц сайта в общей watercolor-палитре.
 * Принимает заголовок, intro, абзацы текста и опционально картинки + CTA.
 */
export default function ProjectPage({
  title,
  subtitle,
  intro,
  paragraphs = [],
  images = [],
  cta,
}: ProjectPageProps) {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <Helmet>
        <title>{title} — DOM Academy</title>
        {subtitle ? <meta name="description" content={subtitle} /> : null}
      </Helmet>

      <article className="mx-auto max-w-[900px] px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
        <header className="mb-6">
          <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
          {subtitle ? (
            <p className="mt-2 text-base text-muted sm:text-lg">{subtitle}</p>
          ) : null}
        </header>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-brand sm:p-8">
          <p className="text-base leading-relaxed text-fg/90">{intro}</p>

          {images.length > 0 ? (
            <div className="mt-6 space-y-4">
              {images.map((image, idx) => (
                <figure key={`${image.src}-${idx}`} className="overflow-hidden rounded-2xl border border-border bg-card2">
                  <img
                    src={image.src}
                    alt={image.alt}
                    loading="lazy"
                    className="h-auto w-full object-cover"
                  />
                  {image.caption ? (
                    <figcaption className="px-4 py-2 text-xs text-muted">
                      {image.caption}
                    </figcaption>
                  ) : null}
                </figure>
              ))}
            </div>
          ) : null}

          {paragraphs.length > 0 ? (
            <div className="mt-6 space-y-4">
              {paragraphs.map((p, idx) => (
                <p key={idx} className="text-sm leading-relaxed text-fg/85">
                  {p}
                </p>
              ))}
            </div>
          ) : null}

          {cta ? (
            <div className="mt-6 pt-2">
              <ProjectCtaButton cta={cta} />
            </div>
          ) : null}
        </section>
      </article>
    </div>
  );
}
