import { FadeSection } from '../components/FadeSection';
import { faq } from '../data';

export function FaqSection() {
  return (
    <FadeSection className="vz-section vz-faq">
      <div className="vz-container">
        <h2 className="vz-h2">Частые вопросы</h2>
        <div className="vz-faq-grid">
          {faq.map((item) => (
            <article key={item.question} className="vz-faq-item">
              <h3>{item.question}</h3>
              <p>{item.answer}</p>
            </article>
          ))}
        </div>
      </div>
    </FadeSection>
  );
}
