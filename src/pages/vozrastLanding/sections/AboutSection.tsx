import { FadeSection } from '../components/FadeSection';

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
            <p>
              Отдельная линия программы — вы сами: как вы прожили свои возрасты и как
              собственный опыт влияет на ваше восприятие клиентов разных лет.
            </p>
          </div>
          <div>
            <div className="vz-about-quote">
              <blockquote>
                «Кризисы — это такие закономерные швы развития.»
              </blockquote>
              <cite>Из лекции «Введение»</cite>
            </div>
            <div className="vz-about-facts">
              <div className="vz-about-fact">
                <strong>14 недель</strong>
                <span>с 17 сентября по 17 декабря 2026</span>
              </div>
              <div className="vz-about-fact">
                <strong>96 часов</strong>
                <span>лекции, семинары и практика</span>
              </div>
              <div className="vz-about-fact">
                <strong>3 события</strong>
                <span>каждую неделю — лекция, семинар, практика</span>
              </div>
              <div className="vz-about-fact">
                <strong>До 25 человек</strong>
                <span>размер группы</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </FadeSection>
  );
}
