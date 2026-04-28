import type { Instructor } from '../data';

/**
 * Карточка одного ведущего: фото, имя, роль, два списка (Образование / Практика).
 * Используется на TeamSection дважды — для каждой терапевтической пары.
 */
export function InstructorCard({ instructor }: { instructor: Instructor }) {
  return (
    <div className="ws2-instructor">
      <div className="ws2-instructor-photo">
        <img src={instructor.photo} alt={instructor.name} loading="lazy" />
      </div>
      <h3>{instructor.name}</h3>
      <p className="ws2-instructor-role">{instructor.role}</p>
      <p className="ws2-instructor-personal">{instructor.personal}</p>
      <p className="ws2-instructor-section-label">Образование</p>
      <ul className="ws2-instructor-edu">
        {instructor.education.map((d) => (
          <li key={d}>{d}</li>
        ))}
      </ul>
      <p className="ws2-instructor-section-label">Практика</p>
      <ul>
        {instructor.practice.map((d) => (
          <li key={d}>{d}</li>
        ))}
      </ul>
    </div>
  );
}
