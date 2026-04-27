import { CtaButton } from '../components/CtaButton';
import { FadeSection } from '../components/FadeSection';
import { prices } from '../data';

export function PriceSection() {
  return (
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
          Стоимость фиксируется по дате подачи заявки на собеседование. Размышляете об
          участии? Запишитесь на <strong>бесплатное собеседование</strong> и обсудите все
          подробности.
        </p>
        <p className="ws2-price-discount">Для членов комьюнити DOM действуют скидки.</p>
        <p className="ws2-price-cert">
          По окончании курса участники получают официальный сертификат от Психологической
          академии DOM.
        </p>
        <CtaButton />
      </div>
    </FadeSection>
  );
}
