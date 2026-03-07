import { DEFAULT_REVEAL_POLICY, MAX_REVEAL_ATTEMPTS } from '../types/tests';
import type { RevealPolicy, Test, TestQuestion } from '../types/tests';

export interface CompletionRevealItem {
  question: TestQuestion;
  correctAnswerText: string;
}

export function resolveRevealPolicy(
  question: TestQuestion,
  defaultPolicy?: RevealPolicy | null
): RevealPolicy {
  const base: RevealPolicy =
    question.revealPolicySource === 'inherit'
      ? defaultPolicy ?? question.revealPolicy ?? DEFAULT_REVEAL_POLICY
      : question.revealPolicy ?? defaultPolicy ?? DEFAULT_REVEAL_POLICY;

  if (base.mode === 'after_attempts') {
    const attempts = Math.min(Math.max(base.attempts ?? 1, 1), MAX_REVEAL_ATTEMPTS);
    return { mode: 'after_attempts', attempts };
  }

  return { mode: base.mode };
}

export function isFirstLevelTest(
  test: Pick<Test, 'prerequisiteTestId'> | null | undefined
): boolean {
  return !test?.prerequisiteTestId;
}

export function getCompletionRevealItems(test: Test): CompletionRevealItem[] {
  if (!isFirstLevelTest(test)) {
    return [];
  }

  return test.questions.flatMap((question) => {
    if (resolveRevealPolicy(question, test.defaultRevealPolicy).mode !== 'after_test') {
      return [];
    }

    const correctAnswerText = question.answers.find(
      (answer) => answer.id === question.correctAnswerId
    )?.text;

    if (!correctAnswerText) {
      return [];
    }

    return [{ question, correctAnswerText }];
  });
}
