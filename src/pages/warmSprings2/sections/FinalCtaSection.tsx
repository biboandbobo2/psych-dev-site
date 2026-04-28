import { confirmInterviewRedirect } from '../utils/interviewLink';

export function FinalCtaSection() {
  return (
    <section className="ws2-final">
      <div className="ws2-final-overlay" />
      <div className="ws2-final-content">
        <h2>Начните вести группу уверенно уже этим летом</h2>
        <button type="button" className="ws2-final-link" onClick={confirmInterviewRedirect}>
          Три дня практики, которые изменят ваши ощущения от групповой работы
        </button>
      </div>
    </section>
  );
}
