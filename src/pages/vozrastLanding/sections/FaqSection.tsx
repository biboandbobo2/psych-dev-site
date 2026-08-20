import { useState } from 'react';
import { FadeSection } from '../components/FadeSection';
import { faq } from '../data';

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <FadeSection className="vz-section vz-faq">
      <div className="vz-container">
        <h2 className="vz-h2">Частые вопросы</h2>
        <div className="vz-faq-grid">
          {faq.map((item, idx) => {
            const open = openIndex === idx;
            return (
              <article key={item.question} className="vz-faq-item">
                <h3>
                  <button
                    type="button"
                    className="vz-faq-question"
                    aria-expanded={open}
                    aria-controls={`vz-faq-answer-${idx}`}
                    onClick={() => setOpenIndex(open ? null : idx)}
                  >
                    {item.question}
                    <span className="vz-faq-marker" aria-hidden>
                      +
                    </span>
                  </button>
                </h3>
                {open ? (
                  <p id={`vz-faq-answer-${idx}`} className="vz-faq-answer">
                    {item.answer}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>
    </FadeSection>
  );
}
