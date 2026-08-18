import { FadeSection } from '../components/FadeSection';
import { finalWork, program, programIntro } from '../data';

export function ProgramSection() {
  return (
    <FadeSection id="program" className="vz-section vz-program">
      <div className="vz-container">
        <h2 className="vz-h2">Программа: вся жизнь по модулям</h2>
        <p className="vz-program-intro">{programIntro}</p>
        <div className="vz-program-grid">
          {program.map((module) => (
            <div key={module.title} className="vz-module">
              <h3>{module.title}</h3>
              <ul>
                {module.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="vz-program-final">
          <strong>Итоговая аттестация.</strong> {finalWork}
        </p>
      </div>
    </FadeSection>
  );
}
