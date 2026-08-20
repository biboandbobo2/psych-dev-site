import { FadeSection } from '../components/FadeSection';
import { reviews } from '../data';

export function ReviewsSection() {
  return (
    <FadeSection id="reviews" className="vz-section vz-reviews">
      <div className="vz-container">
        <h2 className="vz-h2">Отзывы выпускников</h2>
        <p className="vz-reviews-intro">
          Курс о психологии развития наша команда запускает уже в шестой раз — вот что
          говорят участники прошлых потоков.
        </p>
        <div className="vz-reviews-grid">
          {reviews.map((review) => (
            <div key={review.author + review.text.slice(0, 16)} className={`vz-review-card ${review.accent}`}>
              <blockquote>{review.text}</blockquote>
              <cite>
                {review.author}
                {review.role ? <span>{review.role}</span> : null}
              </cite>
            </div>
          ))}
        </div>
        <p className="vz-reviews-note">
          Отзывы участников прошлых запусков курса, публикуются с их разрешения.
        </p>
      </div>
    </FadeSection>
  );
}
