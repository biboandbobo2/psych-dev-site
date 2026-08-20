import { FadeSection } from '../components/FadeSection';
import { audience } from '../data';

const ACCENTS = [
  'vz-accent-cobalt',
  'vz-accent-coral',
  'vz-accent-mustard',
  'vz-accent-sage',
  'vz-accent-lilac',
  'vz-accent-paper',
];

export function AudienceSection() {
  return (
    <FadeSection className="vz-section vz-audience">
      <div className="vz-container">
        <h2 className="vz-h2">Кому подойдёт программа</h2>
        <div className="vz-audience-grid">
          {audience.map((card, idx) => (
            <div key={card.title} className={`vz-audience-card ${ACCENTS[idx % ACCENTS.length]}`}>
              <h3>{card.title}</h3>
              <p>{card.text}</p>
            </div>
          ))}
        </div>
      </div>
    </FadeSection>
  );
}
