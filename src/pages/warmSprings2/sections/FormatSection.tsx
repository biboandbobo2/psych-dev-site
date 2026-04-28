import { FadeSection } from '../components/FadeSection';
import { formatHighlights } from '../data';

export function FormatSection() {
  return (
    <FadeSection className="ws2-section ws2-format">
      <div className="ws2-container">
        <h2 className="ws2-h2">Что здесь можно увидеть</h2>
        <p className="ws2-format-intro">
          В обычном обучении часто показывают один стиль работы. Здесь участник попадает в
          пространство, где можно наблюдать сразу несколько профессиональных способов быть с
          группой.
        </p>
        <div className="ws2-format-grid">
          {formatHighlights.map((item) => (
            <article key={item.title} className="ws2-format-card">
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </div>
    </FadeSection>
  );
}
