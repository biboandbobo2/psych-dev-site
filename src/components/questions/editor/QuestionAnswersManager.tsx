import { useEffect, useId, useMemo, useRef } from 'react';
import type { QuestionAnswer } from '../../../types/tests';
import {
  DEFAULT_ANSWER_PRESETS,
  MAX_QUESTION_ANSWERS,
  MIN_QUESTION_ANSWERS,
} from '../../../types/tests';

interface QuestionAnswersManagerProps {
  questionId: string;
  answers: QuestionAnswer[];
  correctAnswerId: string | null;
  shuffleAnswers: boolean;
  onAnswersChange: (answers: QuestionAnswer[], correctAnswerId?: string | null) => void;
  onShuffleChange: (shuffle: boolean) => void;
  pendingFocusAnswerId: string | null;
  onPendingFocusAnswerId: (id: string | null) => void;
}

const generateAnswerId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `answer-${Math.random().toString(36).slice(2, 10)}`;
};

const trimAnswersToTarget = (
  answers: QuestionAnswer[],
  target: number,
  correctAnswerId: string | null
) => {
  const next = [...answers];

  const isCorrect = (answer: QuestionAnswer) =>
    correctAnswerId != null && answer.id === correctAnswerId;

  const removeAtIndex = (index: number) => {
    if (index < 0 || index >= next.length) return false;
    if (isCorrect(next[index])) return false;
    next.splice(index, 1);
    return true;
  };

  while (next.length > target) {
    let removed = false;

    for (let index = next.length - 1; index >= 0; index -= 1) {
      if (isCorrect(next[index])) continue;
      if (next[index].text.trim() === '') {
        removed = removeAtIndex(index);
        if (removed) break;
      }
    }

    if (!removed) {
      for (let index = next.length - 1; index >= 0; index -= 1) {
        if (removeAtIndex(index)) {
          removed = true;
          break;
        }
      }
    }

    if (!removed) {
      break;
    }
  }

  return next;
};

export function QuestionAnswersManager({
  questionId,
  answers,
  correctAnswerId,
  shuffleAnswers,
  onAnswersChange,
  onShuffleChange,
  pendingFocusAnswerId,
  onPendingFocusAnswerId,
}: QuestionAnswersManagerProps) {
  const answersHintId = useId();
  const answerRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const nonEmptyAnswers = useMemo(
    () => answers.filter((answer) => answer.text.trim().length > 0),
    [answers]
  );
  const hasCorrectAnswer = useMemo(
    () => !!correctAnswerId && answers.some((answer) => answer.id === correctAnswerId),
    [answers, correctAnswerId]
  );

  const answersError =
    nonEmptyAnswers.length < MIN_QUESTION_ANSWERS
      ? `Нужно минимум ${MIN_QUESTION_ANSWERS} непустых вариантов`
      : null;
  const correctAnswerError = hasCorrectAnswer ? null : 'Выберите правильный ответ';
  const answersErrorText = [answersError, correctAnswerError].filter(Boolean).join(' · ');

  useEffect(() => {
    const keys = new Set(answers.map((answer) => answer.id));
    Object.keys(answerRefs.current).forEach((key) => {
      if (!keys.has(key)) {
        delete answerRefs.current[key];
      }
    });
  }, [answers]);

  useEffect(() => {
    if (!pendingFocusAnswerId) return;
    const input = answerRefs.current[pendingFocusAnswerId];
    if (input) {
      input.focus();
      input.select();
      onPendingFocusAnswerId(null);
    }
  }, [answers, pendingFocusAnswerId, onPendingFocusAnswerId]);

  const handleAnswerTextChange = (answerId: string, value: string) => {
    const nextAnswers = answers.map((answer) =>
      answer.id === answerId ? { ...answer, text: value } : answer
    );
    onAnswersChange(nextAnswers);
  };

  const handleAddAnswer = () => {
    if (answers.length >= MAX_QUESTION_ANSWERS) return;
    const newAnswer = { id: generateAnswerId(), text: '' };
    onAnswersChange([...answers, newAnswer]);
    onPendingFocusAnswerId(newAnswer.id);
  };

  const handleRemoveAnswer = () => {
    if (answers.length <= MIN_QUESTION_ANSWERS) return;
    const targetLength = answers.length - 1;
    const trimmed = trimAnswersToTarget(answers, targetLength, correctAnswerId);
    if (trimmed.length === answers.length) return;
    onAnswersChange(trimmed);
  };

  const handlePresetChange = (preset: number) => {
    const normalized = Math.max(
      MIN_QUESTION_ANSWERS,
      Math.min(MAX_QUESTION_ANSWERS, preset)
    );

    if (normalized === answers.length) return;

    let nextAnswers = [...answers];
    if (nextAnswers.length < normalized) {
      const toAdd = normalized - nextAnswers.length;
      const created: QuestionAnswer[] = Array.from({ length: toAdd }, () => ({
        id: generateAnswerId(),
        text: '',
      }));
      nextAnswers = [...nextAnswers, ...created];
      if (created.length > 0) {
        onPendingFocusAnswerId(created[0].id);
      }
    } else {
      nextAnswers = trimAnswersToTarget(nextAnswers, normalized, correctAnswerId);
    }

    if (nextAnswers.length > normalized) {
      nextAnswers = nextAnswers.slice(0, normalized);
    }

    onAnswersChange(nextAnswers);
  };

  const handleCorrectAnswerChange = (answerId: string) => {
    onAnswersChange(answers, answerId);
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
        <span className="font-medium">Варианты:</span>
        {DEFAULT_ANSWER_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => handlePresetChange(preset)}
            className={`rounded-md border px-2 py-1 transition ${
              answers.length === preset
                ? 'border-indigo-500 bg-indigo-50 text-indigo-600'
                : 'border-gray-300 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
            }`}
          >
            {preset}
          </button>
        ))}
        <span className="text-gray-300">|</span>
        <button
          type="button"
          onClick={handleAddAnswer}
          className="rounded-md px-2 py-1 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={answers.length >= MAX_QUESTION_ANSWERS}
        >
          + Добавить
        </button>
        <button
          type="button"
          onClick={handleRemoveAnswer}
          className="rounded-md px-2 py-1 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={answers.length <= MIN_QUESTION_ANSWERS}
        >
          – Удалить
        </button>
        <span className="text-xs text-gray-500">
          Alt+↓ — добавить, Alt+↑ — удалить последний
        </span>
      </div>

      <fieldset
        className={`space-y-2 rounded-md border px-3 py-3 ${
          answersErrorText ? 'border-red-300' : 'border-gray-200'
        }`}
        aria-describedby={answersHintId}
      >
        <legend className="sr-only">Варианты ответов</legend>
        {answers.map((answer, index) => {
          const inputId = `answer-${questionId}-${answer.id}`;
          const radioId = `correct-${questionId}-${answer.id}`;
          const isCorrect = correctAnswerId === answer.id;
          return (
            <div
              key={answer.id}
              className="flex items-center gap-3 rounded-md border border-transparent px-2 py-1 hover:border-gray-200"
            >
              <input
                type="radio"
                id={radioId}
                name={`correct-${questionId}`}
                checked={isCorrect}
                onChange={() => handleCorrectAnswerChange(answer.id)}
                className="flex-shrink-0"
                title="Отметить как правильный ответ"
              />
              <label
                htmlFor={radioId}
                className="flex-shrink-0 text-xs font-medium text-gray-600"
                title="Отметить как правильный ответ"
              >
                {index + 1}.
              </label>
              <input
                ref={(el) => (answerRefs.current[answer.id] = el)}
                id={inputId}
                type="text"
                value={answer.text}
                onChange={(event) => handleAnswerTextChange(answer.id, event.target.value)}
                placeholder={`Вариант ${index + 1}`}
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          );
        })}
        <p
          id={answersHintId}
          className={`text-xs ${answersErrorText ? 'text-red-600' : 'text-gray-500'} min-h-[16px]`}
        >
          {answersErrorText || 'Кликните на радио-кнопку, чтобы отметить правильный ответ'}
        </p>
      </fieldset>

      <label className="inline-flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={shuffleAnswers}
          onChange={(event) => onShuffleChange(event.target.checked)}
          className="h-4 w-4 rounded border-gray-400 text-indigo-600 focus:ring-indigo-500"
        />
        Перемешивать варианты при прохождении
      </label>
    </section>
  );
}
