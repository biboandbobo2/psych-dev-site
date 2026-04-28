import { CtaButton } from '../components/CtaButton';
import { FadeSection } from '../components/FadeSection';
import { SUMMER_SCHOOL_LINK, prices } from '../data';

export function PriceSection() {
  return (
    <FadeSection id="price" className="ws2-section ws2-price">
      <div className="ws2-container">
        <h2 className="ws2-h2">Стоимость участия</h2>
        <p className="ws2-price-scope">
          В стоимость входит весь цикл участия: собеседование, подготовительный семинар, три дня
          очной групповой работы, заключительная встреча и сертификат.
        </p>
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
          Стоимость фиксируется по дате подачи заявки на собеседование. Максимальный размер
          группы — <strong>24 участника</strong>.
        </p>
        <p className="ws2-price-discount">Для членов комьюнити DOM действуют скидки.</p>
        <p className="ws2-price-school">
          Если вы едете на{' '}
          <a
            href={SUMMER_SCHOOL_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="ws2-link"
          >
            летнюю психологическую школу
          </a>
          , вы получаете скидку на интенсив 100 лари. Скидка комьюнити действует, но не
          суммируется.
        </p>
        <p className="ws2-price-cert">
          По окончании курса участники получают официальный сертификат от Психологической
          академии DOM.
        </p>
        <CtaButton />
      </div>
    </FadeSection>
  );
}
