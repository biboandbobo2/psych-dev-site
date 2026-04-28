import { FadeSection } from '../components/FadeSection';
import { InstructorCard } from '../components/InstructorCard';
import { instructors } from '../data';

export function TeamSection() {
  const pair1 = instructors.filter((i) => i.pair === 1);
  const pair2 = instructors.filter((i) => i.pair === 2);

  return (
    <FadeSection id="team" className="ws2-section ws2-team">
      <div className="ws2-container">
        <h2 className="ws2-h2">Ведущие</h2>
        <p className="ws2-team-intro">
          Курс ведут четыре специалиста — две ко-терапевтические пары с обширным опытом
          индивидуальной и групповой работы. Мультимодальная команда, связанная общими
          ценностями и подходом.
        </p>

        <div className="ws2-pair-label">Ко-терапевты &middot; Первая пара</div>
        <div className="ws2-instructors-grid">
          {pair1.map((inst) => (
            <InstructorCard key={inst.name} instructor={inst} />
          ))}
        </div>

        <div className="ws2-pair-label">Ко-терапевты &middot; Вторая пара</div>
        <div className="ws2-instructors-grid">
          {pair2.map((inst) => (
            <InstructorCard key={inst.name} instructor={inst} />
          ))}
        </div>
      </div>
    </FadeSection>
  );
}
