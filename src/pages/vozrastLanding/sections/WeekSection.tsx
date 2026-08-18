import { FadeSection } from '../components/FadeSection';
import { week } from '../data';

export function WeekSection() {
  return (
    <FadeSection id="week" className="vz-section vz-week">
      <div className="vz-container">
        <h2 className="vz-h2">Три события каждую неделю</h2>
        <p className="vz-week-intro">
          Обучение построено по модели «перевёрнутого класса»: теорию вы смотрите
          заранее, а живые встречи посвящены обсуждению и практике.
        </p>
        <div className="vz-timeline">
          {week.map((item) => (
            <div key={item.step} className="vz-timeline-item">
              <div className="vz-timeline-step">{item.step}</div>
              <div className="vz-timeline-body">
                <h3>{item.title}</h3>
                <span className="vz-timeline-duration">{item.duration}</span>
                <p>
                  <span className="vz-timeline-lead">{item.lead}</span>
                  {item.text}
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="vz-week-note">
          Это ритм полноценного образования: <strong>каждую неделю</strong> вы смотрите
          лекцию, обсуждаете её с автором курса и отрабатываете на практике. За 14
          недель — <strong>96 астрономических часов</strong>, из них больше 60 —
          живые онлайн-встречи.
        </p>
      </div>
    </FadeSection>
  );
}
