import { FadeSection } from '../components/FadeSection';

export function PracticeSection() {
  return (
    <FadeSection className="vz-section vz-practice">
      <div className="vz-container">
        <h2 className="vz-h2">Теория, которая доходит до практики</h2>
        <div className="vz-practice-grid">
          <div className="vz-practice-card">
            <h3>Лекция даёт карту</h3>
            <p>
              Задачи, кризисы и риски каждого возраста — системно, с опорой на теории
              развития и клиническую практику автора курса.
            </p>
          </div>
          <div className="vz-practice-card">
            <h3>Семинар связывает с работой</h3>
            <p>
              Вопросы по лекции, разбор типичных запросов и встречи с приглашёнными
              специалистами, которые углублённо работают с конкретным возрастом.
            </p>
          </div>
          <div className="vz-practice-card">
            <h3>Практика делает вашим</h3>
            <p>
              Упражнения в малых группах: гипотезы, разбор ситуаций, исследование
              собственного опыта. То, что услышали в четверг, в субботу становится
              вашим рабочим навыком.
            </p>
          </div>
        </div>
        <p className="vz-practice-note">
          Практику ведут <strong>три ведущие одновременно</strong> — группа делится на
          подгруппы, и у каждой есть свой ведущий. Это значит, что каждый участник
          успевает проработать свои вопросы глубже, а не наблюдать за чужой работой из
          зала.
        </p>
      </div>
    </FadeSection>
  );
}
