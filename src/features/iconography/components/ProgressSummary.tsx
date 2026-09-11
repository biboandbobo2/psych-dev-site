import { useState } from 'react';
import type { Progress } from '../types';
import { counted } from '../lib/format';
import { clearProgress } from '../lib/progress';
import { clearLessonHistory } from '../lib/recognition';

/**
 * Строка накопленного прогресса и единственный способ стереть его из браузера.
 * Сброс убирает и память о недавних занятиях: иначе подборка продолжит обходить «уже виденное».
 */
export function ProgressSummary({ progress, onReset }: { progress: Progress; onReset: () => void }) {
  const [asking, setAsking] = useState(false);
  const stored = progress.answered > 0 || progress.difficult.length > 0;

  const reset = () => {
    clearProgress();
    clearLessonHistory();
    setAsking(false);
    onReset();
  };

  return (
    <div className="ico-progress-summary">
      <p className="ico-small ico-progress-total" role="status">
        Всего ответов: {progress.answered}, верных: {progress.correct}. В «сложном» сейчас{' '}
        {counted(progress.difficult.length, 'вопрос', 'вопроса', 'вопросов')} викторины и практики.
      </p>
      {stored && (asking ? (
        <div className="ico-quiz-confirm" role="status">
          <p>Счётчик ответов, список сложных вопросов и память о недавних занятиях будут удалены из этого браузера.</p>
          <button className="ico-button" onClick={reset}>Удалить прогресс</button>
          <button className="ico-link" onClick={() => setAsking(false)}>Отмена</button>
        </div>
      ) : (
        <button className="ico-link" onClick={() => setAsking(true)}>Сбросить прогресс</button>
      ))}
    </div>
  );
}
