import { CTA_TEXT, TG_LINK } from '../data';

/** Декоративная «линия жизни» с точками возрастов. */
function LifeLine() {
  return (
    <svg
      className="vz-hero-line"
      viewBox="0 0 1440 200"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        d="M-20 170 C 180 60, 340 150, 520 110 S 860 40, 1040 90 S 1320 160, 1460 70"
        stroke="rgba(255,255,255,0.65)"
        strokeWidth="2"
      />
      {[
        { cx: 120, cy: 113 },
        { cx: 400, cy: 130 },
        { cx: 700, cy: 70 },
        { cx: 1000, cy: 82 },
        { cx: 1300, cy: 137 },
      ].map((dot) => (
        <circle
          key={dot.cx}
          cx={dot.cx}
          cy={dot.cy}
          r="6"
          fill="#f0ce8c"
          stroke="rgba(255,255,255,0.7)"
          strokeWidth="2"
        />
      ))}
    </svg>
  );
}

export function HeroSection() {
  return (
    <section className="vz-hero">
      <div className="vz-hero-overlay" />
      <LifeLine />
      <div className="vz-hero-content">
        <p className="vz-hero-tag">Онлайн &middot; 17 сентября — 17 декабря 2026</p>
        <h1 className="vz-hero-title">
          Понимание и помощь человеку
          <br />
          в контексте возраста
        </h1>
        <p className="vz-hero-subtitle">
          Программа повышения квалификации по психологии развития: весь жизненный путь
          человека — от зачатия до завершения жизни — за 14 недель теории, семинаров
          и практики
        </p>
        <a href={TG_LINK} target="_blank" rel="noopener noreferrer" className="vz-hero-cta">
          {CTA_TEXT} на программу
        </a>
        <p className="vz-hero-note">
          Для психологов и специалистов помогающих профессий
        </p>
      </div>
    </section>
  );
}
