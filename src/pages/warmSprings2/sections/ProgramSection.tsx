import { FadeSection } from '../components/FadeSection';
import { program } from '../data';

export function ProgramSection() {
  return (
    <FadeSection id="program" className="ws2-section ws2-program">
      <div className="ws2-container">
        <h2 className="ws2-h2">Программа</h2>
        <div className="ws2-timeline">
          {program.map((item) => (
            <div key={item.step} className="ws2-timeline-item">
              <div className="ws2-timeline-step">{item.step}</div>
              <div className="ws2-timeline-body">
                <h3>{item.title}</h3>
                <span className="ws2-timeline-duration">{item.duration}</span>
                <p>{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </FadeSection>
  );
}
