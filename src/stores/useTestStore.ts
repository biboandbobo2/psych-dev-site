import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Test, TestQuestion, RevealPolicy } from '../types/tests';
import { DEFAULT_REVEAL_POLICY, MAX_REVEAL_ATTEMPTS } from '../types/tests';
import { saveTestResult } from '../lib/testResults';

type AnswerState = 'idle' | 'correct' | 'incorrect';

interface TestState {
  // Test metadata
  test: Test | null;
  loading: boolean;
  error: string | null;

  // Progress state
  started: boolean;
  currentQuestionIndex: number;
  score: number;
  finished: boolean;
  startTime: Date | null;
  resultSaved: boolean;

  // Answer state
  selectedAnswer: string | null;
  answerState: AnswerState;
  showExplanation: boolean;
  attemptCount: number;

  // Derived getters
  totalQuestions: number;
  progress: number;
  currentQuestion: TestQuestion | undefined;

  // Actions
  setTest: (test: Test | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  startTest: () => void;
  incrementScore: () => void;
  moveToNextQuestion: () => boolean;
  finishTest: () => void;
  restartTest: () => void;

  handleAnswer: (answerId: string) => void;
  resetAnswerState: () => void;
  retryAnswer: () => void;

  saveResult: (userId: string, testId: string, testTitle: string) => Promise<void>;

  // Computed
  getEffectiveRevealPolicy: () => RevealPolicy;
  getShouldRevealCorrectAnswer: () => boolean;
}

function resolveRevealPolicy(
  question: TestQuestion,
  defaultPolicy?: RevealPolicy | null
): RevealPolicy {
  const base: RevealPolicy =
    question.revealPolicySource === 'inherit'
      ? defaultPolicy ?? question.revealPolicy ?? DEFAULT_REVEAL_POLICY
      : question.revealPolicy ?? defaultPolicy ?? DEFAULT_REVEAL_POLICY;

  if (base.mode === 'after_attempts') {
    const attempts = Math.min(
      Math.max(base.attempts ?? 1, 1),
      MAX_REVEAL_ATTEMPTS
    );
    return { mode: 'after_attempts', attempts };
  }

  return { mode: base.mode };
}

export const useTestStore = create<TestState>()(
  devtools(
    (set, get) => ({
      // Initial state
      test: null,
      loading: false,
      error: null,

      started: false,
      currentQuestionIndex: 0,
      score: 0,
      finished: false,
      startTime: null,
      resultSaved: false,

      selectedAnswer: null,
      answerState: 'idle',
      showExplanation: false,
      attemptCount: 0,

      totalQuestions: 0,
      progress: 0,
      currentQuestion: undefined,

      // Actions
      setTest: (test) => {
        set({
          test,
          totalQuestions: test?.questions.length || 0,
          currentQuestion: test?.questions[0],
          progress: test && test.questions.length > 0 ? (1 / test.questions.length) * 100 : 0,
        });
      },

      setLoading: (loading) => set({ loading }),

      setError: (error) => set({ error }),

      startTest: () => {
        set({
          started: true,
          startTime: new Date(),
        });
      },

      incrementScore: () => {
        set((state) => ({
          score: state.score + 1,
        }));
      },

      moveToNextQuestion: () => {
        const state = get();
        const { currentQuestionIndex, totalQuestions, test } = state;

        if (currentQuestionIndex < totalQuestions - 1) {
          const newIndex = currentQuestionIndex + 1;
          set({
            currentQuestionIndex: newIndex,
            currentQuestion: test?.questions[newIndex],
            progress: ((newIndex + 1) / totalQuestions) * 100,
          });
          return true;
        }
        return false;
      },

      finishTest: () => {
        set({ finished: true });
      },

      restartTest: () => {
        const state = get();
        set({
          started: false,
          currentQuestionIndex: 0,
          currentQuestion: state.test?.questions[0],
          score: 0,
          finished: false,
          startTime: null,
          resultSaved: false,
          selectedAnswer: null,
          answerState: 'idle',
          showExplanation: false,
          attemptCount: 0,
          progress: state.test && state.test.questions.length > 0 ? (1 / state.test.questions.length) * 100 : 0,
        });
      },

      handleAnswer: (answerId) => {
        const state = get();
        const { answerState, currentQuestion } = state;

        if (answerState !== 'idle' || !currentQuestion) return;

        const isCorrect = answerId === currentQuestion.correctAnswerId;

        set({
          selectedAnswer: answerId,
          answerState: isCorrect ? 'correct' : 'incorrect',
          showExplanation: true,
          attemptCount: isCorrect ? state.attemptCount : state.attemptCount + 1,
        });

        if (isCorrect) {
          get().incrementScore();
        }
      },

      resetAnswerState: () => {
        set({
          selectedAnswer: null,
          answerState: 'idle',
          showExplanation: false,
          attemptCount: 0,
        });
      },

      retryAnswer: () => {
        set({
          selectedAnswer: null,
          answerState: 'idle',
          showExplanation: false,
        });
      },

      saveResult: async (userId, testId, testTitle) => {
        const state = get();
        const { finished, resultSaved, startTime, score, totalQuestions } = state;

        if (!finished || resultSaved || !startTime) return;

        try {
          const endTime = new Date();
          const timeSpent = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
          const percentage = Math.round((score / totalQuestions) * 100);

          await saveTestResult({
            userId,
            testId,
            testTitle,
            score,
            totalQuestions,
            percentage,
            completedAt: endTime,
            timeSpent,
          });

          set({ resultSaved: true });
        } catch (error) {
          console.error('Ошибка при сохранении результата:', error);
        }
      },

      getEffectiveRevealPolicy: () => {
        const state = get();
        const { currentQuestion, test } = state;

        if (!currentQuestion) return DEFAULT_REVEAL_POLICY;
        return resolveRevealPolicy(currentQuestion, test?.defaultRevealPolicy);
      },

      getShouldRevealCorrectAnswer: () => {
        const state = get();
        const { answerState, attemptCount } = state;

        if (answerState === 'idle') return false;
        if (answerState === 'correct') return true;

        const policy = get().getEffectiveRevealPolicy();
        if (policy.mode === 'immediately') return true;
        if (policy.mode === 'never') return false;
        if (policy.mode === 'after_attempts') {
          return attemptCount >= policy.attempts;
        }
        return false;
      },
    }),
    { name: 'TestStore' }
  )
);
