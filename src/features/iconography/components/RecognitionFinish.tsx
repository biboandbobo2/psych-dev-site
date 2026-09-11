import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { IconSummary } from '../types';
import { dailyIcon } from '../lib/catalog';
import { readProgress } from '../lib/progress';
import { newSessionSeed } from '../lib/quiz';
import type { RecognitionResult, RecognitionSession } from '../lib/recognition';
import { Artwork } from './Artwork';

export function RecognitionFinish({ results, session, change, icons }: {
  results: RecognitionResult[];
  session: RecognitionSession;
  change: (next: RecognitionSession) => void;
  icons: IconSummary[];
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);

  const progress = readProgress();
  const difficult = progress.difficult.filter((id) => id.includes('-recognition-'));
  const mistakes = results.filter((result) => !result.correct);
  const correct = results.length - mistakes.length;
  const daily = dailyIcon(icons);
  const deeper = session.level === 'beginner' ? 'explorer' : 'expert';

  const startFresh = () => change({ ...session, repeat: false, retry: undefined, seed: newSessionSeed() });
  const repeatMistakes = () => change({
    ...session,
    repeat: false,
    retry: mistakes.map(({ item }) => ({ iconId: item.icon.id, questionId: item.question.id })),
    seed: newSessionSeed(),
  });

  return (
    <section className="ico-recognition-finish">
      <h1 ref={heading} tabIndex={-1}>
        {results.length ? `Верно ${correct} из ${results.length}` : 'Всё повторили'}
      </h1>
      <p>{results.length
        ? 'Встретив эти образы в храме, попробуйте узнать их по деталям.'
        : 'Сложные вопросы появятся здесь после занятия.'}</p>

      {results.length > 0 && (
        <ul className="ico-session-review">
          {results.map(({ item, chosen, correct: right }) => (
            <li key={item.question.id} className={right ? 'is-correct' : 'is-incorrect'}>
              <Link to={`/iconography/icon/${item.icon.id}`}>
                <Artwork icon={item.icon} alt="" sizes="(max-width: 640px) 28vw, 160px" />
                <span className="ico-review-title">{item.icon.title}</span>
                <span className="ico-small">Паспорт и источники</span>
              </Link>
              <p className="ico-review-mark">{right ? 'Верно' : 'Неверно'}</p>
              <p className="ico-review-answer">
                {right
                  ? `Ваш ответ: ${chosen}`
                  : `Вы выбрали «${chosen}». Верно: ${item.question.answer}`}
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="ico-actions">
        <button className="ico-button" onClick={startFresh}>Ещё иконы</button>
        {mistakes.length > 0 && (
          <button className="ico-link" onClick={repeatMistakes}>Повторить ошибки этого занятия</button>
        )}
        {difficult.length > 0 && (
          <button className="ico-link" onClick={() => change({ ...session, repeat: true, retry: undefined, seed: newSessionSeed() })}>
            Повторить сложное
          </button>
        )}
      </div>

      <p className="ico-small ico-progress-total" role="status">
        Всего ответов: {progress.answered}, верных: {progress.correct}. В «сложном» сейчас {progress.difficult.length} вопросов викторины и практики.
      </p>

      <div className="ico-further">
        <h2>Если хочется глубже</h2>
        {session.level !== 'expert' && (
          <button className="ico-further-choice" onClick={() => change({ ...session, level: deeper, repeat: false, retry: undefined, seed: newSessionSeed() })}>
            <strong>{session.level === 'beginner' ? 'Назвать точнее' : 'Различать по деталям'}</strong>
            <span>{session.level === 'beginner'
              ? 'Попробуйте другие имена и близкие сюжеты среди ответов.'
              : 'Обратите внимание на жесты, надписи и иконографические типы.'}</span>
          </button>
        )}
        <Link className="ico-further-choice" to="/iconography/compare">
          <strong>Сравнить похожие образы</strong><span>Рассмотреть две иконы рядом.</span>
        </Link>
        <Link className="ico-further-choice" to="/iconography/learn">
          <strong>Перед посещением храма</strong><span>Четыре ориентира на примере одного иконостаса.</span>
        </Link>
        <Link className="ico-further-choice" to="/iconography/practice">
          <strong>Выбрать другую тему</strong><span>От атрибутов и праздников до деталей облачения.</span>
        </Link>
        {daily && (
          <Link className="ico-further-choice" to={`/iconography/icon/${daily.id}`}>
            <strong>Икона дня</strong><span>{daily.title}</span>
          </Link>
        )}
      </div>
    </section>
  );
}
