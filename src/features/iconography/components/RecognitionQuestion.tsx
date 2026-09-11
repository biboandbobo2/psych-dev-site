import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { recordAnswer } from '../lib/progress';
import { optionsFor } from '../lib/quiz';
import type { RecognitionItem } from '../lib/recognition';
import { Artwork } from './Artwork';

export function RecognitionQuestion({ item, index, total, seed, onAnswer, onNext }: {
  item: RecognitionItem;
  index: number;
  total: number;
  seed: number;
  onAnswer: (chosen: string) => void;
  onNext: () => void;
}) {
  const { icon, question } = item;
  const [chosen, setChosen] = useState('');
  const [hint, setHint] = useState(false);
  const [detail, setDetail] = useState(false);
  const [saved, setSaved] = useState(true);
  const locked = useRef(false);
  const feedback = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const picture = useRef<HTMLDivElement>(null);

  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);

  const toggleDetail = () => {
    setDetail(!detail);
    if (!detail && (picture.current?.getBoundingClientRect().top ?? 0) < 0) {
      picture.current?.scrollIntoView({
        block: 'start',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      });
    }
  };

  const answer = (option: string) => {
    if (locked.current) return;
    locked.current = true;
    setChosen(option);
    setSaved(recordAnswer(question.id, option === question.answer));
    onAnswer(option);
    requestAnimationFrame(() => feedback.current?.focus({ preventScroll: true }));
  };

  const correct = chosen === question.answer;
  // Разбор выбранного варианта появляется только там, где редакция его написала.
  const rationale = chosen && !correct ? question.rationale?.[chosen] : undefined;

  return (
    <section className="ico-recognition" aria-label="Викторина по иконам">
      <div className="ico-recognition-image" ref={picture}>
        <Artwork icon={icon} priority zoom alt="Икона для вопроса. Нажмите, чтобы увеличить."
          detail={detail ? icon.recognition?.detail : undefined} />
      </div>
      <div className="ico-recognition-body">
        <p className="ico-round-position" aria-label={`Икона ${index + 1} из ${total}`}>
          {index + 1} <span>/ {total}</span>
        </p>
        <h1 ref={heading} tabIndex={-1}>{question.prompt}</h1>

        <div className="ico-recognition-options">
          {optionsFor(question, 'explorer', seed).map((option) => (
            <button key={option} disabled={Boolean(chosen)} onClick={() => answer(option)}
              className={chosen ? (option === question.answer ? 'is-correct' : option === chosen ? 'is-incorrect' : 'is-muted') : ''}>
              <span>{option}</span>
              {chosen && option === question.answer && <span className="ico-answer-word">Верно</span>}
            </button>
          ))}
        </div>

        <div className="ico-recognition-response">
          {!chosen ? (
            <div className="ico-recognition-hint">
              <button className="ico-link" aria-expanded={hint} onClick={() => setHint(!hint)}>Подсказка</button>
              {hint && <p>{question.hint}</p>}
            </div>
          ) : (
            <div ref={feedback} tabIndex={-1} className={`ico-recognition-feedback${correct ? ' is-correct' : ''}`}>
              <h2>{correct ? 'Верно' : 'Неверно'}</h2>
              {!correct && (
                <p className="ico-wrong-choice">
                  Вы выбрали «{chosen}».{rationale ? ` ${rationale}` : ''}
                </p>
              )}
              {!correct && <p className="ico-right-answer">Верно: <strong>{question.answer}</strong></p>}
              <p>{question.explanation}</p>

              <div className="ico-recognition-details">
                {icon.recognition?.detail && (
                  <button className="ico-link" aria-pressed={detail} onClick={toggleDetail}>
                    {detail ? 'Скрыть отметку' : 'Показать признак'}
                  </button>
                )}
                <details>
                  <summary>Об этой иконе</summary>
                  <p>{icon.title}. {icon.period}. {icon.museum}.</p>
                  <Link to={`/iconography/icon/${icon.id}`} className="ico-link">Паспорт и источники</Link>
                </details>
              </div>

              {!saved && <p role="status">Прогресс не сохранился в браузере. Вы можете продолжить занятие.</p>}
              <button className="ico-button ico-next-icon" onClick={onNext}>
                {index + 1 === total ? 'Завершить занятие' : 'Следующая икона'}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
