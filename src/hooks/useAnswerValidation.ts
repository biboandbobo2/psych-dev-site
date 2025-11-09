import { useState, useCallback, useMemo } from 'react';
import type { TestQuestion, RevealPolicy } from '../types/tests';
import { DEFAULT_REVEAL_POLICY, MAX_REVEAL_ATTEMPTS } from '../types/tests';

type AnswerState = 'idle' | 'correct' | 'incorrect';

interface UseAnswerValidationParams {
  currentQuestion: TestQuestion | undefined;
  testRevealPolicy?: RevealPolicy | null;
  onScoreIncrement: () => void;
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

export function useAnswerValidation({
  currentQuestion,
  testRevealPolicy,
  onScoreIncrement,
}: UseAnswerValidationParams) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>('idle');
  const [showExplanation, setShowExplanation] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);

  const effectiveRevealPolicy = useMemo(() => {
    if (!currentQuestion) return DEFAULT_REVEAL_POLICY;
    return resolveRevealPolicy(currentQuestion, testRevealPolicy);
  }, [currentQuestion, testRevealPolicy]);

  const shouldRevealCorrectAnswer = useMemo(() => {
    if (answerState === 'idle') return false;
    if (answerState === 'correct') return true;

    const policy = effectiveRevealPolicy;
    if (policy.mode === 'immediately') return true;
    if (policy.mode === 'never') return false;
    if (policy.mode === 'after_attempts') {
      return attemptCount >= policy.attempts;
    }
    return false;
  }, [answerState, effectiveRevealPolicy, attemptCount]);

  const handleAnswer = useCallback(
    (answerId: string) => {
      if (answerState !== 'idle' || !currentQuestion) return;

      setSelectedAnswer(answerId);
      const isCorrect = answerId === currentQuestion.correctAnswerId;

      if (isCorrect) {
        onScoreIncrement();
        setAnswerState('correct');
      } else {
        setAnswerState('incorrect');
        setAttemptCount((prev) => prev + 1);
      }

      setShowExplanation(true);
    },
    [answerState, currentQuestion, onScoreIncrement]
  );

  const resetAnswerState = useCallback(() => {
    setSelectedAnswer(null);
    setAnswerState('idle');
    setShowExplanation(false);
    setAttemptCount(0);
  }, []);

  const retryAnswer = useCallback(() => {
    setSelectedAnswer(null);
    setAnswerState('idle');
    setShowExplanation(false);
  }, []);

  return {
    selectedAnswer,
    answerState,
    showExplanation,
    attemptCount,
    effectiveRevealPolicy,
    shouldRevealCorrectAnswer,
    handleAnswer,
    resetAnswerState,
    retryAnswer,
  };
}
