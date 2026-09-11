import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Question } from '../types';
import { readProgress } from '../lib/progress';
import type { PracticeLesson } from '../lib/practice';
import type { Answered } from './PracticeQuestion';
import { PassportFacts, Sources } from './Passport';
import { ProgressSummary } from './ProgressSummary';

function Mistake({ question, chosen }: { question: Question; chosen: string }) {
  return (
    <p className="ico-review-answer">
      «{question.prompt}» — вы выбрали «{chosen}». Верный ответ: «{question.answer}».
    </p>
  );
}

export function PracticeFinish({ lesson, answers, finish }: {
  lesson: PracticeLesson; answers: Answered[]; finish: () => void;
}) {
  const [progress, setProgress] = useState(readProgress);
  const mistakes = answers.filter((answered) => !answered.correct);
  const correct = answers.length - mistakes.length;
  const wholeIcon = lesson.records.length === 1 ? lesson.records[0] : undefined;
  const mistakesOf = (id: string) => mistakes.filter((answered) => answered.question.iconId === id);
  // Вопросы-карточки без репродукции: показываем их отдельно, чтобы ошибка не потерялась.
  const textMistakes = mistakes.filter((answered) => !lesson.records.some((record) => record.id === answered.question.iconId));

  return (
    <section className="ico-lesson-finish">
      <p className="ico-eyebrow">Занятие завершено</p>
      <h1>Верно {correct} из {answers.length}</h1>

      {/* Один список вместо двух: произведения занятия с пометкой, где были ошибки. */}
      {(lesson.records.length > 0 || textMistakes.length > 0) && (
        <div className="ico-session-mistakes">
          <h2>{lesson.records.length ? 'Произведения этого занятия' : 'Что стоит пересмотреть'}</h2>
          <ul className="ico-session-mistakes-list">
            {lesson.records.map((record) => (
              <li key={record.id} className={mistakesOf(record.id).length ? 'is-incorrect' : ''}>
                <Link className="ico-link" to={`/iconography/icon/${record.id}`}>{record.title}: паспорт и источники</Link>
                {mistakesOf(record.id).map(({ question, chosen }) => (
                  <Mistake key={question.id} question={question} chosen={chosen} />
                ))}
              </li>
            ))}
            {textMistakes.map(({ question, chosen }) => (
              <li key={question.id} className="is-incorrect">
                <Mistake question={question} chosen={chosen} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <ProgressSummary progress={progress} onReset={() => setProgress(readProgress())} />

      <div className="ico-actions">
        <button className="ico-button" onClick={finish}>Выбрать новое занятие</button>
        <Link className="ico-link" to="/iconography/practice?repeat=1">Повторить сложное</Link>
      </div>

      {wholeIcon && (
        <div className="ico-reading">
          <h2>Полный паспорт: {wholeIcon.title}</h2>
          <p>{wholeIcon.description}</p>
          <PassportFacts icon={wholeIcon} />
          {wholeIcon.clues.map((clue) => <article key={clue.title}><h3>{clue.title}</h3><p>{clue.text}</p></article>)}
          <Sources icon={wholeIcon} />
          <Link className="ico-link" to={`/iconography/icon/${wholeIcon.id}`}>Открыть страницу произведения</Link>
        </div>
      )}
    </section>
  );
}
