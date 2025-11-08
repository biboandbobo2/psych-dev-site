import { useCallback } from 'react';

interface UseQuestionNavigationParams {
  moveToNextQuestion: () => boolean;
  finishTest: () => void;
  resetAnswerState: () => void;
}

export function useQuestionNavigation({
  moveToNextQuestion,
  finishTest,
  resetAnswerState,
}: UseQuestionNavigationParams) {
  const handleNext = useCallback(() => {
    const hasMoreQuestions = moveToNextQuestion();
    if (hasMoreQuestions) {
      resetAnswerState();
    } else {
      finishTest();
    }
  }, [moveToNextQuestion, finishTest, resetAnswerState]);

  return {
    handleNext,
  };
}
