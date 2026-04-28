import { FadeSection } from '../components/FadeSection';
import { IMG } from '../data';

export function VenueSection() {
  return (
    <FadeSection className="ws2-section ws2-venue">
      <div className="ws2-container">
        <h2 className="ws2-h2">Пространство DOM</h2>
        <div className="ws2-venue-grid">
          <img src={`${IMG}/venue-circle.jpg`} alt="Групповой круг" loading="lazy" />
          <img src={`${IMG}/venue-session.jpg`} alt="Групповая сессия" loading="lazy" />
          <img src={`${IMG}/venue-small-group.jpg`} alt="Малая группа" loading="lazy" />
          <img src={`${IMG}/venue-details.jpg`} alt="Детали пространства" loading="lazy" />
        </div>
      </div>
    </FadeSection>
  );
}
