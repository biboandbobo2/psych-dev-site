import { FadeSection } from '../components/FadeSection';
import { audience } from '../data';

export function AudienceSection() {
  return (
    <FadeSection className="vz-section vz-audience">
      <div className="vz-container">
        <h2 className="vz-h2">Кому подойдёт программа</h2>
        <div className="vz-audience-grid">
          {audience.map((card) => (
            <div key={card.title} className="vz-audience-card">
              <h3>{card.title}</h3>
              <p>{card.text}</p>
            </div>
          ))}
        </div>
      </div>
    </FadeSection>
  );
}
