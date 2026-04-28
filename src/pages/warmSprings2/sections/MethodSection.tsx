import { FadeSection } from '../components/FadeSection';
import { IMG, participantOutcomes } from '../data';

export function MethodSection() {
  return (
    <FadeSection id="method" className="ws2-section ws2-method">
      <div className="ws2-container">
        <h2 className="ws2-h2">О методе</h2>
        <div className="ws2-method-grid">
          <div className="ws2-method-text">
            <h3 className="ws2-method-lead">
              Метод, который учит не техникам, а мышлению группового терапевта
            </h3>
            <p>
              Интенсив наследует и развивает{' '}
              <a
                href="https://dic.academic.ru/dic.nsf/enc_psychotherapeutic/178/%D0%9C%D0%95%D0%A2%D0%9E%D0%94%D0%98%D0%9A%D0%90"
                target="_blank"
                rel="noopener noreferrer"
                className="ws2-link"
              >
                интегративную методику <strong>«Тёплые ключи»</strong>
              </a>
              , созданную{' '}
              <a
                href="https://ru.wikipedia.org/wiki/%D0%AD%D0%B9%D0%B4%D0%B5%D0%BC%D0%B8%D0%BB%D0%BB%D0%B5%D1%80,_%D0%AD%D0%B4%D0%BC%D0%BE%D0%BD%D0%B4_%D0%93%D0%B5%D0%BE%D1%80%D0%B3%D0%B8%D0%B5%D0%B2%D0%B8%D1%87"
                target="_blank"
                rel="noopener noreferrer"
                className="ws2-link"
              >
                Эдмондом Эйдемиллером
              </a>{' '}
              и{' '}
              <a
                href="https://psy.su/club/forum/profile/130116/"
                target="_blank"
                rel="noopener noreferrer"
                className="ws2-link"
              >
                Алексеем Вовком
              </a>
              . Участники делятся на две подгруппы, которые поочерёдно работают в режиме
              активного участия и наблюдения.
            </p>
            <p>
              Такой формат создаёт резонанс: достижения одной подгруппы становятся
              катализатором для другой. За три дня разворачивается множество групповых
              феноменов, которые участники успевают и прожить, и осмыслить, и понять с точки
              зрения ведения группы.
            </p>
            <div className="ws2-participant-outcomes">
              <h3>Участник интенсива сможет:</h3>
              <ul>
                {participantOutcomes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="ws2-method-levels">
              <h3>Три уровня работы</h3>
              <div className="ws2-level">
                <span className="ws2-level-num">1</span>
                <div>
                  <strong>Проживание опыта</strong>
                  <p>перестанете бояться группы и почувствуете себя в ней почти как рыба в воде</p>
                </div>
              </div>
              <div className="ws2-level">
                <span className="ws2-level-num">2</span>
                <div>
                  <strong>Осмысление</strong>
                  <p>начнёте видеть процессы, а не «хаос», и поймёте, как их концептуализировать</p>
                </div>
              </div>
              <div className="ws2-level">
                <span className="ws2-level-num">3</span>
                <div>
                  <strong>Методический анализ</strong>
                  <p>поймёте связь между действиями ведущего и происходящим в группе</p>
                </div>
              </div>
            </div>
            <p className="ws2-method-note">
              В основе — полевой, феноменологический подход (Дж. Харрис) и идеи
              экзистенциально-гуманистической терапии Ирвина Ялома и Джеймса Бьюдженталя. Мы
              убеждены: происходящее в реальности важнее любой схемы.
            </p>
          </div>
          <div className="ws2-method-image">
            <img src={`${IMG}/venue-circle.jpg`} alt="Групповая сессия" loading="lazy" />
          </div>
        </div>
      </div>
    </FadeSection>
  );
}
