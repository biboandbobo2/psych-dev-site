import { FadeSection } from '../components/FadeSection';
import { faq } from '../data';

export function FaqSection() {
  return (
    <FadeSection className="ws2-section ws2-faq">
      <div className="ws2-container">
        <h2 className="ws2-h2">Частые вопросы</h2>
        <div className="ws2-faq-grid">
          {faq.map((item) => (
            <article key={item.question} className="ws2-faq-item">
              <h3>{item.question}</h3>
              <p>{item.answer}</p>
            </article>
          ))}
        </div>
      </div>
    </FadeSection>
  );
}
