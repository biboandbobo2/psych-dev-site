import { CtaButton } from '../components/CtaButton';
import { FadeSection } from '../components/FadeSection';
import { discounts, priceIncludes } from '../data';

export function PriceSection() {
  return (
    <FadeSection id="price" className="vz-section vz-price">
      <div className="vz-container">
        <h2 className="vz-h2">Стоимость участия</h2>
        <div className="vz-price-grid">
          <div className="vz-price-card vz-price-accent">
            <span className="vz-price-period">При оплате сразу</span>
            <span className="vz-price-value">
              48 000 <small>₽</small>
            </span>
            <span className="vz-price-sub">≈ 1 480 лари</span>
          </div>
          <div className="vz-price-card">
            <span className="vz-price-period">Четырьмя платежами</span>
            <span className="vz-price-value">
              56 000 <small>₽</small>
            </span>
            <span className="vz-price-sub">по 14 000 ₽ в месяц · ≈ 1 730 лари</span>
          </div>
        </div>
        <p className="vz-price-math">
          Для сравнения: 96 часов обучения — это <strong>500 ₽ за час</strong> работы
          с автором курса, приглашёнными специалистами и практикой в малых группах.
          Столько же обычно стоит одна книга по психологии — здесь это час живого
          обучения.
        </p>
        <div className="vz-discounts">
          <h3>Скидки</h3>
          <ul>
            {discounts.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="vz-price-includes">
          <h3>Что входит</h3>
          <ul>
            {priceIncludes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <p className="vz-price-cert">
          По итогам аттестации выдаётся удостоверение о повышении квалификации
          установленного образца. Обучение проводит АНО ДПО
          «Экзистенциально-гуманистическое образование» на основании образовательной
          лицензии.
        </p>
        <CtaButton />
      </div>
    </FadeSection>
  );
}
