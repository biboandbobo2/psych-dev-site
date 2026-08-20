import { CTA_TEXT, IMG, TG_LINK } from '../data';

export function HeroSection() {
  return (
    <section className="vz-hero">
      <div className="vz-container">
        <div className="vz-hero-grid">
          <div>
            <p className="vz-hero-tag">Онлайн &middot; 17 сентября — 17 декабря 2026</p>
            <h1 className="vz-hero-title">
              Понимание и помощь человеку в контексте возраста
            </h1>
            <p className="vz-hero-subtitle">
              Программа повышения квалификации по психологии развития: весь жизненный
              путь человека — от зачатия до завершения жизни — за 14 недель теории,
              семинаров и практики
            </p>
            <a href={TG_LINK} target="_blank" rel="noopener noreferrer" className="vz-hero-cta">
              {CTA_TEXT} на программу
            </a>
            <p className="vz-hero-note">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6" />
                <path d="M4 20c1.4-3.4 4.4-5 8-5s6.6 1.6 8 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              Для психологов и специалистов помогающих профессий
            </p>
          </div>
          <div className="vz-hero-media">
            <picture>
              <source
                media="(max-width: 640px)"
                srcSet={`${IMG}/hero/hero-life-stages-mobile.webp`}
                type="image/webp"
                width={1003}
                height={1568}
              />
              <source
                media="(max-width: 640px)"
                srcSet={`${IMG}/hero/hero-life-stages-mobile.png`}
                type="image/png"
                width={1003}
                height={1568}
              />
              <source
                srcSet={`${IMG}/hero/hero-life-stages-desktop.webp`}
                type="image/webp"
                width={1536}
                height={1024}
              />
              <img
                src={`${IMG}/hero/hero-life-stages-desktop.png`}
                alt="Шесть этапов жизненного пути, соединённых пунктирным маршрутом: младенчество, дошкольный возраст, юность, взрослость, пожилой возраст и завершение жизни"
                width={1536}
                height={1024}
                decoding="async"
                fetchPriority="high"
              />
            </picture>
          </div>
        </div>
      </div>
    </section>
  );
}
