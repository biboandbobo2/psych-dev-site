import { FadeSection } from '../components/FadeSection';
import { instructors } from '../data';

export function TeamSection() {
  const [lead, coAuthor, ...rest] = instructors;

  return (
    <FadeSection id="team" className="vz-section vz-team">
      <div className="vz-container">
        <h2 className="vz-h2">Кто ведёт программу</h2>
        <p className="vz-team-intro">
          Лекции и семинары ведёт автор курса, практику — три ведущие. Каждая малая
          группа работает со своим ведущим.
        </p>
        <div className="vz-team-lead-card">
          <div className="vz-instructor-photo">
            <img src={lead.photo} alt={lead.name} width={640} height={640} loading="lazy" decoding="async" />
          </div>
          <div>
            <h3>{lead.name}</h3>
            <div className="vz-instructor-role">{lead.role}</div>
            <p>{lead.text}</p>
          </div>
        </div>
        <div className="vz-team-lead-card">
          <div className="vz-instructor-photo">
            <img src={coAuthor.photo} alt={coAuthor.name} width={640} height={640} loading="lazy" decoding="async" />
          </div>
          <div>
            <h3>{coAuthor.name}</h3>
            <div className="vz-instructor-role">{coAuthor.role}</div>
            <p>{coAuthor.text}</p>
          </div>
        </div>
        <div className="vz-team-grid">
          {rest.map((person) => (
            <div key={person.name} className="vz-instructor">
              <div className="vz-instructor-photo">
                <img src={person.photo} alt={person.name} width={640} height={640} loading="lazy" decoding="async" />
              </div>
              <h3>{person.name}</h3>
              <div className="vz-instructor-role">{person.role}</div>
              <p>{person.text}</p>
            </div>
          ))}
        </div>
        <p className="vz-team-guests">
          В отдельных семинарах участвуют приглашённые специалисты, углублённо
          работающие с темами конкретного возраста: от готовности к школе и СДВГ до
          сопровождения пожилых людей и горевания.
        </p>
      </div>
    </FadeSection>
  );
}
