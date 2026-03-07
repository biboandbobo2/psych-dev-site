import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TestQuestionScreen } from '../TestQuestionScreen';
import type { TestQuestion } from '../../../types/tests';

function createQuestion(): TestQuestion {
  return {
    id: 'q-1',
    questionText: 'Вопрос для проверки',
    answers: [
      { id: 'a-1', text: 'Неверный' },
      { id: 'a-2', text: 'Верный' },
    ],
    correctAnswerId: 'a-2',
    shuffleAnswers: false,
    revealPolicy: { mode: 'after_test' },
    customWrongMsg: 'Подумайте ещё раз',
  };
}

function renderScreen(canShowPostTestAnswerNote: boolean) {
  return render(
    <TestQuestionScreen
      currentQuestion={createQuestion()}
      displayedAnswers={createQuestion().answers}
      currentQuestionIndex={0}
      totalQuestions={5}
      score={3}
      progress={20}
      appearance={{}}
      pageBackgroundStyle={{}}
      accentGradientStyle={{}}
      accentColor="#2563eb"
      selectedAnswer="a-1"
      answerState="incorrect"
      showExplanation={true}
      shouldRevealCorrectAnswer={false}
      effectiveRevealPolicy={{ mode: 'after_test' }}
      canShowPostTestAnswerNote={canShowPostTestAnswerNote}
      attemptCount={1}
      onAnswer={vi.fn()}
      onNext={vi.fn()}
      onRetry={vi.fn()}
    />
  );
}

describe('TestQuestionScreen', () => {
  it('показывает обещание ответа в конце только для первого уровня', () => {
    renderScreen(true);

    expect(
      screen.getByText('Правильный ответ будет показан после завершения теста')
    ).toBeInTheDocument();
  });

  it('не показывает обещание ответа в конце для второго уровня и выше', () => {
    renderScreen(false);

    expect(
      screen.queryByText('Правильный ответ будет показан после завершения теста')
    ).not.toBeInTheDocument();
  });
});
