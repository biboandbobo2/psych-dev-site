import { useRef, useState } from 'react';
import type { Difficulty, IconRecord, Question } from '../types';
import { optionsFor, topicLabel } from '../lib/quiz';
import { recordAnswer } from '../lib/progress';
import { Artwork } from './Artwork';

export interface Answered { question: Question; chosen: string; correct: boolean }

export function PracticeQuestion({ question, record, difficulty, seed, onAnswer }: {
  question: Question; record?: IconRecord; difficulty: Difficulty; seed: number; onAnswer: (answered: Answered) => void;
}) {
  const [chosen, setChosen] = useState('');
  const [showHint, setShowHint] = useState(difficulty === 'beginner');
  const [showOptions, setShowOptions] = useState(difficulty !== 'expert');
  const [saved, setSaved] = useState(true);
  const locked = useRef(false);
  const answerRef = useRef<HTMLDivElement>(null);

  const answer = (option: string) => {
    if (locked.current) return;
    locked.current = true;
    setChosen(option);
    setSaved(recordAnswer(question.id, option === question.answer));
    requestAnimationFrame(() => answerRef.current?.focus());
  };

  const correct = chosen === question.answer;
  const rationale = chosen && !correct ? question.rationale?.[chosen] : undefined;

  return (
    <div className={`ico-question ${record ? '' : 'ico-question-text'}`}>
      {record && (
        <div className="ico-question-art">
          <Artwork icon={record} priority zoom alt={`Произведение для задания. ${record.description}`} />
          <p className="ico-small">{record.rights.label} · Изображение можно увеличить</p>
        </div>
      )}
      <div className="ico-question-body">
        <p className="ico-eyebrow">{topicLabel(question.topic)}</p>
        <h1>{question.prompt}</h1>

        {difficulty === 'expert' && !showOptions && (
          <div className="ico-recall">
            <p>Сначала вспомните ответ, затем откройте варианты.</p>
            <button className="ico-button" onClick={() => setShowOptions(true)}>Открыть варианты</button>
          </div>
        )}

        {showOptions && (
          <div className="ico-options">
            {optionsFor(question, difficulty, seed).map((option, i) => (
              <button key={option} disabled={Boolean(chosen)} onClick={() => answer(option)}
                className={chosen ? (option === question.answer ? 'correct' : option === chosen ? 'incorrect' : '') : ''}>
                <span className="ico-option-letter">{i + 1}</span>{option}
                {chosen && option === question.answer && <span>✓</span>}
              </button>
            ))}
          </div>
        )}

        {!chosen && (
          <div className="ico-hint">
            <button className="ico-link" aria-expanded={showHint} onClick={() => setShowHint(!showHint)}>
              {showHint ? 'Скрыть подсказку' : 'Нужна подсказка?'}
            </button>
            {showHint && <p>{question.hint}</p>}
          </div>
        )}

        {chosen && (
          <div className={`ico-answer ${correct ? 'correct' : ''}`} ref={answerRef} tabIndex={-1}>
            <h2>{correct ? 'Верно' : 'Неверно'}</h2>
            {!correct && <p className="ico-wrong-choice">Вы выбрали «{chosen}».{rationale ? ` ${rationale}` : ''}</p>}
            {!correct && <p className="ico-right-answer">Верный ответ: <strong>«{question.answer}»</strong></p>}
            <p>{question.explanation}</p>
            {/* У вопросов паспорта источник — музейная запись самой репродукции, а не текста объяснения. */}
            {question.source && (
              <a href={question.source.url} target="_blank" rel="noreferrer">{record ? 'Источник изображения' : 'Источник объяснения'}</a>
            )}
            {!saved && <p role="status">Браузер не разрешил сохранить прогресс. Занятие продолжится, но повторение после закрытия вкладки недоступно.</p>}
            <button className="ico-button" onClick={() => onAnswer({ question, chosen, correct })}>Продолжить</button>
          </div>
        )}
      </div>
    </div>
  );
}
