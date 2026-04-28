import { Link } from 'react-router-dom';
import { FadeSection } from '../components/FadeSection';
import { IMG } from '../data';

const ROOM_PHOTOS = [
  '/images/rooms/izumrudny/6n55tg9djb.jpg',
  '/images/rooms/lazurny/1dh0mgoumt.jpg',
  '/images/rooms/bordovy/11kukj54bu.jpg',
];

export function VenueSection() {
  return (
    <FadeSection className="ws2-section ws2-venue">
      <div className="ws2-container">
        <h2 className="ws2-h2">Пространство DOM</h2>
        <div className="ws2-venue-intro">
          <p>
            Камерное пространство в Тбилиси, где группа не отвлекается на внешнее — только
            процесс.
          </p>
          <Link to="/booking/directions" className="ws2-address-link">
            Тбилиси, Орбелиани 38 | Мтквари 2
          </Link>
        </div>
        <div className="ws2-venue-grid">
          <img src={`${IMG}/venue-circle.jpg`} alt="Групповой круг" loading="lazy" />
          <img src={`${IMG}/venue-session.jpg`} alt="Групповая сессия" loading="lazy" />
          <img src={`${IMG}/venue-small-group.jpg`} alt="Малая группа" loading="lazy" />
          <img src={`${IMG}/venue-details.jpg`} alt="Детали пространства" loading="lazy" />
        </div>
        <div className="ws2-venue-city-grid" aria-label="Тбилиси и кабинеты DOM">
          <img src={`${IMG}/bg-hills.jpg`} alt="Тбилиси" loading="lazy" />
          <img src={`${IMG}/bg-plants.jpg`} alt="Тбилиси летом" loading="lazy" />
          {ROOM_PHOTOS.map((src) => (
            <img key={src} src={src} alt="Кабинет DOM" loading="lazy" />
          ))}
        </div>
      </div>
    </FadeSection>
  );
}
