import { CTA_TEXT, EMAIL, TG_LINK } from '../data';

export function FinalCtaSection() {
  return (
    <section className="vz-final">
      <div className="vz-final-panel">
        <h2>Научитесь видеть человека в контексте его возраста</h2>
        <p>
          14 недель, три события в неделю, удостоверение о повышении квалификации — и
          рабочая оптика, которая останется с вами на всю практику.
        </p>
        <a href={TG_LINK} target="_blank" rel="noopener noreferrer" className="vz-hero-cta">
          {CTA_TEXT} в Telegram
        </a>
        <p className="vz-final-contacts">
          Вопросы:{' '}
          <a href={TG_LINK} target="_blank" rel="noopener noreferrer">
            @PsychologistAnya
          </a>{' '}
          или <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
        </p>
      </div>
    </section>
  );
}
