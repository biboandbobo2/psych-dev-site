import { describe, expect, it } from 'vitest';
import type { Test, TestQuestion } from '../types/tests';
import {
  getCompletionRevealItems,
  isFirstLevelTest,
  resolveRevealPolicy,
} from './testRevealPolicy';

function createQuestion(overrides: Partial<TestQuestion> = {}): TestQuestion {
  return {
    id: 'q-1',
    questionText: 'Какой вариант верный?',
    answers: [
      { id: 'a-1', text: 'Первый' },
      { id: 'a-2', text: 'Второй' },
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
    questionCount: 1,
    questions: [createQuestion()],
    status: 'published',
    defaultRevealPolicy: { mode: 'after_test' },
    createdAt: new Date('2026-03-07T10:00:00.000Z'),
    updatedAt: new Date('2026-03-07T10:00:00.000Z'),
    createdBy: 'admin',
    ...overrides,
  };
}

describe('testRevealPolicy', () => {
  it('считает корневой тест первым уровнем', () => {
    expect(isFirstLevelTest(createTest())).toBe(true);
    expect(
      isFirstLevelTest(
        createTest({
          prerequisiteTestId: 'level-1',
        })
      )
    ).toBe(false);
  });

  it('наследует reveal policy теста для вопросов с источником inherit', () => {
    const question = createQuestion({
      revealPolicy: { mode: 'never' },
      revealPolicySource: 'inherit',
    });

    expect(resolveRevealPolicy(question, { mode: 'after_attempts', attempts: 5 })).toEqual({
      mode: 'after_attempts',
      attempts: 3,
    });
  });

  it('возвращает только вопросы первого уровня с политикой after_test', () => {
    const test = createTest({
      questionCount: 3,
      questions: [
        createQuestion({
          id: 'q-1',
          questionText: 'Вопрос 1',
          explanation: 'Пояснение 1',
          revealPolicy: { mode: 'after_test' },
          revealPolicySource: 'inherit',
        }),
        createQuestion({
          id: 'q-2',
          questionText: 'Вопрос 2',
          revealPolicy: { mode: 'immediately' },
        }),
        createQuestion({
          id: 'q-3',
          questionText: 'Вопрос 3',
          correctAnswerId: null,
          revealPolicy: { mode: 'after_test' },
        }),
      ],
    });

    expect(getCompletionRevealItems(test)).toEqual([
      {
        question: expect.objectContaining({
          id: 'q-1',
          questionText: 'Вопрос 1',
          explanation: 'Пояснение 1',
        }),
        correctAnswerText: 'Второй',
      },
    ]);
  });

  it('не возвращает вопросы для второго уровня и выше', () => {
    const test = createTest({
      prerequisiteTestId: 'level-1',
    });

    expect(getCompletionRevealItems(test)).toEqual([]);
  });
});
