import { FadeSection } from '../components/FadeSection';
import { audience } from '../data';

export function AudienceSection() {
  return (
    <FadeSection className="ws2-section ws2-audience">
      <div className="ws2-container">
        <h2 className="ws2-h2">Для кого этот интенсив</h2>
        <div className="ws2-audience-grid">
          {audience.map((item) => (
            <div key={item.title} className="ws2-audience-card">
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </FadeSection>
  );
}
