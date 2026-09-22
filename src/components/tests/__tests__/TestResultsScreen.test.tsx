import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestResultsScreen } from '../TestResultsScreen';
import type { Test, TestQuestion, TestSummary } from '../../../types/tests';

const getNextLevelTestMock = vi.fn<(testId: string) => Promise<TestSummary | null>>();

vi.mock('../../../lib/tests', () => ({
  getNextLevelTest: (testId: string) => getNextLevelTestMock(testId),
}));

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

function renderScreen(test: Test, score = 1) {
  return render(
    <MemoryRouter>
      <TestResultsScreen
        test={test}
        appearance={{}}
        score={score}
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
  beforeEach(() => {
    getNextLevelTestMock.mockReset();
    getNextLevelTestMock.mockResolvedValue(null);
  });

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

  describe('следующий уровень цепочки', () => {
    const nextLevel = {
      id: 'level-2',
      title: 'Введение — кейсы',
      requiredPercentage: 75,
    } as TestSummary;

    it('показывает кнопку следующего уровня, если порог следующего уровня пройден', async () => {
      getNextLevelTestMock.mockResolvedValue(nextLevel);
      renderScreen(createTest({ requiredPercentage: 70 }), 2);

      const link = await screen.findByRole('link', { name: /Следующий уровень/ });
      expect(link).toHaveAttribute('href', '/tests/dynamic/level-2');
      expect(screen.getByText('Порог для следующего уровня: 75%')).toBeInTheDocument();
      expect(getNextLevelTestMock).toHaveBeenCalledWith('test-1');
    });

    it('не показывает кнопку, если результат ниже порога следующего уровня', async () => {
      getNextLevelTestMock.mockResolvedValue(nextLevel);
      renderScreen(createTest({ requiredPercentage: 70 }), 1);

      expect(await screen.findByText('Порог для следующего уровня: 75%')).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /Следующий уровень/ })).not.toBeInTheDocument();
      expect(screen.getByText('Тест завершён')).toBeInTheDocument();
    });

    it('без следующего уровня показывает собственный порог теста', async () => {
      renderScreen(createTest({ requiredPercentage: 80 }), 2);

      expect(await screen.findByText('Порог прохождения: 80%')).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /Следующий уровень/ })).not.toBeInTheDocument();
    });
  });
});
