import { FadeSection } from '../components/FadeSection';

const ICON_STROKE = 1.6;

function CalendarIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" stroke="#2457c5" strokeWidth={ICON_STROKE} />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" stroke="#2457c5" strokeWidth={ICON_STROKE} strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8.5" stroke="#d8402e" strokeWidth={ICON_STROKE} />
      <path d="M12 7.5V12l3 2.5" stroke="#d8402e" strokeWidth={ICON_STROKE} strokeLinecap="round" />
    </svg>
  );
}

function GroupIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="8.5" cy="9" r="3" stroke="#7d8a60" strokeWidth={ICON_STROKE} />
      <circle cx="16" cy="10.5" r="2.4" stroke="#7d8a60" strokeWidth={ICON_STROKE} />
      <path d="M3.5 19c.9-2.8 2.8-4.2 5-4.2s4.1 1.4 5 4.2M13.6 15.6c.7-.5 1.5-.8 2.4-.8 1.9 0 3.5 1.2 4.3 3.5" stroke="#7d8a60" strokeWidth={ICON_STROKE} strokeLinecap="round" />
    </svg>
  );
}

export function AboutSection() {
  return (
    <FadeSection id="about" className="vz-section vz-about">
      <div className="vz-container">
        <h2 className="vz-h2">О программе</h2>
        <div className="vz-about-grid">
          <div className="vz-about-text">
            <h3 className="vz-about-lead">
              Один и тот же запрос звучит по-разному в 15, 35 и 70 лет
            </h3>
            <p>
              Тревога подростка перед экзаменом, тревога тридцатилетнего перед сменой
              работы и тревога семидесятилетнего перед переездом — это три разные
              тревоги. Чтобы понять человека и помочь ему, нужно видеть, в какой точке
              жизненного пути он находится, какие задачи решает и как прошёл предыдущие
              этапы.
            </p>
            <p>
              Программа проходит весь путь человека — от периода до рождения через
              детство, подростковый возраст и взрослость к старению и завершению
              жизни. Теории развития здесь не самоцель, а рабочий инструмент: вы
              учитесь ставить возрастно-психологические гипотезы, отличать нормативный
              кризис от индивидуальной трудности и выбирать помощь по возрасту.
            </p>
          </div>
          <div className="vz-about-quote">
            <blockquote>«Кризисы — это такие закономерные швы развития.»</blockquote>
            <cite>Из лекции «Введение»</cite>
          </div>
        </div>
        <div className="vz-about-facts">
          <div className="vz-fact vz-fact-cobalt">
            <CalendarIcon />
            <div>
              <strong>14 недель</strong>
              <span>с 17 сентября по 17 декабря 2026</span>
            </div>
          </div>
          <div className="vz-fact vz-fact-coral">
            <ClockIcon />
            <div>
              <strong>96 часов</strong>
              <span>лекции, семинары и практика</span>
            </div>
          </div>
          <div className="vz-fact vz-fact-sage">
            <GroupIcon />
            <div>
              <strong>До 25 человек</strong>
              <span>размер группы</span>
            </div>
          </div>
        </div>
        <div className="vz-journey">
          <h3>Путешествие по собственной жизни</h3>
          <p>
            Каждый возраст на программе вы проходите дважды: как специалист — и как
            человек, который сам был этим ребёнком, подростком, взрослым. Участники
            прошлых потоков часто называют курс особым путешествием по своей жизни:
            понятнее становятся собственные детские периоды, отношения с родителями и
            то, из чего собран ваш сегодняшний день.
          </p>
          <p className="vz-journey-note">
            Курс не заменяет личную терапию — но у такого путешествия есть редкий
            дополняющий её эффект. Глубину самораскрытия каждый участник выбирает сам.
          </p>
        </div>
      </div>
    </FadeSection>
  );
}
