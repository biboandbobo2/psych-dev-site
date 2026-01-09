import { useState, useEffect, useCallback } from 'react';
import { saveTestResult } from '../lib/testResults';
import type { Test } from '../types/tests';
import { debugError } from '../lib/debug';

interface UseTestProgressParams {
  test: Test | null;
  user: { uid: string } | null;
}

export function useTestProgress({ test, user }: UseTestProgressParams) {
  const [started, setStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [resultSaved, setResultSaved] = useState(false);

  const totalQuestions = test?.questions.length || 0;
  const progress = totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0;
  const currentQuestion = test?.questions[currentQuestionIndex];

  const handleStart = useCallback(() => {
    setStarted(true);
    setStartTime(new Date());
  }, []);

  const incrementScore = useCallback(() => {
    setScore((prev) => prev + 1);
  }, []);

  const moveToNextQuestion = useCallback(() => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      return true;
    }
    return false;
  }, [currentQuestionIndex, totalQuestions]);

  const finishTest = useCallback(() => {
    setFinished(true);
  }, []);

  const handleRestart = useCallback(() => {
    setStarted(false);
    setCurrentQuestionIndex(0);
    setScore(0);
    setFinished(false);
    setStartTime(null);
    setResultSaved(false);
  }, []);

  // Сохранение результата после завершения теста
  useEffect(() => {
    if (finished && !resultSaved && user && startTime && test) {
      const saveResult = async () => {
        try {
          const endTime = new Date();
          const timeSpent = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
          const percentage = Math.round((score / totalQuestions) * 100);

          await saveTestResult({
            userId: user.uid,
            testId: test.id,
            testTitle: test.title,
            score,
            totalQuestions,
            percentage,
            completedAt: endTime,
            timeSpent,
          });

          setResultSaved(true);
        } catch (error) {
          debugError('Ошибка при сохранении результата:', error);
        }
      };

      saveResult();
    }
  }, [finished, resultSaved, user, startTime, score, totalQuestions, test]);

  return {
    started,
    currentQuestionIndex,
    score,
    finished,
    startTime,
    resultSaved,
    totalQuestions,
    progress,
    currentQuestion,
    handleStart,
    incrementScore,
    moveToNextQuestion,
    finishTest,
    handleRestart,
  };
}
