import { FadeSection } from '../components/FadeSection';
import { quotes } from '../data';

export function QuotesSection() {
  return (
    <FadeSection className="vz-section vz-quotes">
      <div className="vz-container">
        <h2 className="vz-h2">Как это звучит</h2>
        <p className="vz-quotes-intro">
          Дословные фрагменты из видеолекций курса — то, что вы будете слушать каждую
          неделю.
        </p>
        <div className="vz-quotes-grid">
          {quotes.map((quote) => (
            <div key={quote.source + quote.text.slice(0, 16)} className="vz-quote-card">
              <blockquote>{quote.text}</blockquote>
              <cite>{quote.source}</cite>
            </div>
          ))}
        </div>
      </div>
    </FadeSection>
  );
}
