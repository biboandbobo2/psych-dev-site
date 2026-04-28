import { FadeSection } from '../components/FadeSection';
import { results } from '../data';

export function ResultsSection() {
  return (
    <FadeSection className="ws2-section ws2-results">
      <div className="ws2-container">
        <h2 className="ws2-h2">Что вы унесёте с собой</h2>
        <div className="ws2-results-grid">
          {results.map((item, index) => (
            <div key={item.text} className="ws2-result-card">
              <span className="ws2-result-num">{String(index + 1).padStart(2, '0')}</span>
              <p>{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </FadeSection>
  );
}
