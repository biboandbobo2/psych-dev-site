import { CtaButton } from '../components/CtaButton';

export function HeroSection() {
  return (
    <section className="ws2-hero">
      <div className="ws2-hero-overlay" />
      <div className="ws2-hero-content">
        <p className="ws2-hero-tag">Тбилиси &middot; 31 июля — 2 августа 2026</p>
        <h1 className="ws2-hero-title">
          Интенсив
          <br />
          по групповой
          <br />
          терапии
        </h1>
        <p className="ws2-hero-subtitle">
          Обучающе-терапевтический формат по методу{' '}
          <span className="ws2-nowrap">&laquo;Тёплые ключи&nbsp;2&raquo;</span>
          &mdash;&nbsp;пространство, где профессиональный рост неотделим от личного опыта
        </p>
        <CtaButton className="ws2-hero-cta" />
      </div>
    </section>
  );
}
