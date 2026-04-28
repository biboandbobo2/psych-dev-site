import { CtaButton } from '../components/CtaButton';
import { FadeSection } from '../components/FadeSection';
import { interviewPoints } from '../data';

export function InterviewSection() {
  return (
    <FadeSection className="ws2-section ws2-interview">
      <div className="ws2-container">
        <div className="ws2-interview-panel">
          <div>
            <p className="ws2-section-kicker">Перед участием</p>
            <h2 className="ws2-h2">Собеседование — не формальность</h2>
            <p>
              Это часть процесса, где вы вместе с ведущими можете осознанно решить, стоит ли
              идти на это обучение и насколько групповая терапия сейчас является вашим способом
              профессионального и личностного роста.
            </p>
          </div>
          <div className="ws2-interview-card">
            <ul>
              {interviewPoints.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <CtaButton />
          </div>
        </div>
      </div>
    </FadeSection>
  );
}
