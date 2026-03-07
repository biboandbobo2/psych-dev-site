import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { TestResultsScreen } from '../TestResultsScreen';
import type { Test, TestQuestion } from '../../../types/tests';

function createQuestion(overrides: Partial<TestQuestion> = {}): TestQuestion {
  return {
    id: 'q-1',
    questionText: 'Вопрос для итогов',
    answers: [
      { id: 'a-1', text: 'Ответ 1' },
      { id: 'a-2', text: 'Ответ 2' },
    ],
    correctAnswerId: 'a-2',
    shuffleAnswers: false,
    revealPolicy: { mode: 'after_test' },
    ...overrides,
  };
}

function createTest(overrides: Partial<Test> = {}): Test {
  return {
    id: 'test-1',
    title: 'Тест',
    course: 'development',
    rubric: 'full-course',
    questionCount: 2,
    questions: [
      createQuestion({
        id: 'q-1',
        questionText: 'Первый вопрос',
        explanation: 'Пояснение к первому вопросу',
        revealPolicySource: 'inherit',
      }),
      createQuestion({
        id: 'q-2',
        questionText: 'Второй вопрос',
        revealPolicy: { mode: 'immediately' },
      }),
    ],
    status: 'published',
    defaultRevealPolicy: { mode: 'after_test' },
    createdAt: new Date('2026-03-07T10:00:00.000Z'),
    updatedAt: new Date('2026-03-07T10:00:00.000Z'),
    createdBy: 'admin',
    ...overrides,
  };
}

function renderScreen(test: Test) {
  return render(
    <MemoryRouter>
      <TestResultsScreen
        test={test}
        appearance={{}}
        score={1}
        totalQuestions={2}
        backUrl="/tests"
        pageBackgroundStyle={{}}
        accentGradientStyle={{}}
        badgeGradientStyle={{}}
        infoBoxStyle={{}}
        accentColor="#2563eb"
        onRestart={vi.fn()}
        user={null}
        testId={test.id}
      />
    </MemoryRouter>
  );
}

describe('TestResultsScreen', () => {
  it('показывает верные ответы на экране итогов для первого уровня', () => {
    renderScreen(createTest());

    expect(screen.getByText('Верные ответы')).toBeInTheDocument();
    expect(screen.getByText('Первый вопрос')).toBeInTheDocument();
    expect(screen.getByText('Ответ 2')).toBeInTheDocument();
    expect(screen.queryByText('Второй вопрос')).not.toBeInTheDocument();
  });

  it('не показывает блок верных ответов для второго уровня и выше', () => {
    renderScreen(
      createTest({
        prerequisiteTestId: 'level-1',
      })
    );

    expect(screen.queryByText('Верные ответы')).not.toBeInTheDocument();
  });
});
