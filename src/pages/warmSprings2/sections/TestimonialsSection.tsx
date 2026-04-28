import { useState } from 'react';
import { FadeSection } from '../components/FadeSection';
import type { Testimonial } from '../data';
import { IMG, testimonials } from '../data';

export function TestimonialsSection() {
  const [active, setActive] = useState<Testimonial | null>(null);

  return (
    <FadeSection className="ws2-section ws2-testimonials">
      <div className="ws2-container">
        <h2 className="ws2-h2">После интенсива</h2>
        <p className="ws2-testimonials-intro">
          Мы не публикуем фотографии участников без согласия. Вместо этого показываем след
          процесса: фото ведущих после интенсива и два отзыва, которыми можно поделиться
          публично.
        </p>
        <div className="ws2-testimonials-photo">
          <img src={`${IMG}/leaders-after-intensive.jpg`} alt="Ведущие после интенсива" />
        </div>
        <div className="ws2-testimonials-grid">
          {testimonials.map((item) => (
            <button
              key={item.id}
              type="button"
              className="ws2-testimonial-card"
              onClick={() => setActive(item)}
            >
              {item.image && <img src={item.image} alt={item.title} loading="lazy" />}
              <span>{item.title}</span>
              <p>{item.preview}</p>
            </button>
          ))}
        </div>
      </div>

      {active && (
        <div className="ws2-modal-backdrop" role="presentation" onClick={() => setActive(null)}>
          <div
            className="ws2-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ws2-testimonial-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="ws2-modal-close"
              aria-label="Закрыть отзыв"
              onClick={() => setActive(null)}
            >
              ×
            </button>
            <h3 id="ws2-testimonial-title">{active.title}</h3>
            {active.image ? (
              <img src={active.image} alt={active.title} className="ws2-modal-image" />
            ) : (
              <div className="ws2-modal-text">
                {active.fullText?.split('\n').map((line, index) => (
                  <p key={`${active.id}-${index}`}>{line || '\u00A0'}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </FadeSection>
  );
}
