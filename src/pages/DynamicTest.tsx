import { useState, useEffect, useMemo, type CSSProperties } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { getTestById } from '../lib/tests';
import { isTestUnlocked } from '../lib/testAccess';
import type { Test, QuestionAnswer } from '../types/tests';
import { mergeAppearance, createGradient, hexToRgba } from '../utils/testAppearance';
import { useTestProgress } from '../hooks/useTestProgress';
import { useAnswerValidation } from '../hooks/useAnswerValidation';
import { useQuestionNavigation } from '../hooks/useQuestionNavigation';
import { TestIntroScreen } from '../components/tests/TestIntroScreen';
import { TestQuestionScreen } from '../components/tests/TestQuestionScreen';
import { TestResultsScreen } from '../components/tests/TestResultsScreen';
import { debugError } from '../lib/debug';

function shuffleArray<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export default function DynamicTest() {
  const { testId } = useParams<{ testId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Загрузка теста
  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Хуки для управления состоянием теста
  const testProgress = useTestProgress({ test, user });
  const answerValidation = useAnswerValidation({
    currentQuestion: testProgress.currentQuestion,
    testRevealPolicy: test?.defaultRevealPolicy,
    onScoreIncrement: testProgress.incrementScore,
  });
  const questionNavigation = useQuestionNavigation({
    moveToNextQuestion: testProgress.moveToNextQuestion,
    finishTest: testProgress.finishTest,
    resetAnswerState: answerValidation.resetAnswerState,
  });

  // Загрузка теста
  useEffect(() => {
    const loadTest = async () => {
      if (!testId) {
        setError('ID теста не указан');
        setLoading(false);
        return;
      }

      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const loadedTest = await getTestById(testId);

        if (!loadedTest) {
          setError('Тест не найден');
          setLoading(false);
          return;
        }

        if (loadedTest.status !== 'published') {
          setError('Тест недоступен для прохождения');
          setLoading(false);
          return;
        }

        // Проверка доступа к тесту
        if (loadedTest.prerequisiteTestId) {
          const unlocked = await isTestUnlocked(
            user.uid,
            loadedTest.prerequisiteTestId,
            loadedTest.requiredPercentage ?? 70
          );
          if (!unlocked) {
            setError('Тест заблокирован. Пройдите предыдущий тест с результатом ≥70%');
            setLoading(false);
            // Перенаправляем на страницу с тестами через 2 секунды
            setTimeout(() => {
              navigate('/tests');
            }, 2000);
            return;
          }
        }

        setTest(loadedTest);
        setError(null);
      } catch (err) {
        debugError('Ошибка загрузки теста:', err);
        setError('Не удалось загрузить тест');
      } finally {
        setLoading(false);
      }
    };

    loadTest();
  }, [testId, user, navigate]);

  // Определяем URL для возврата в зависимости от рубрики теста
  const backUrl = useMemo(() => {
    if (!test) return '/tests';
    return test.rubric === 'full-course' ? '/tests' : '/tests-lesson';
  }, [test?.rubric]);

  // Перемешивание вариантов ответов
  const displayedAnswers = useMemo(() => {
    const currentQuestion = testProgress.currentQuestion;
    if (!currentQuestion) return [];
    if (!currentQuestion.shuffleAnswers) return currentQuestion.answers;
    return shuffleArray(currentQuestion.answers);
  }, [
    testProgress.currentQuestion?.id,
    testProgress.currentQuestion?.shuffleAnswers,
    testProgress.currentQuestion?.answers,
  ]);

  const appearance: TestAppearance = mergeAppearance(test?.appearance);

  const pageBackgroundStyle: CSSProperties = {
    backgroundImage: createGradient(
      appearance.backgroundGradientFrom,
      appearance.backgroundGradientTo,
      appearance.resolvedTheme?.background
    ),
  };

  const accentGradientStyle: CSSProperties = {
    backgroundImage: createGradient(
      appearance.accentGradientFrom,
      appearance.accentGradientTo,
      appearance.resolvedTheme?.primary
    ),
  };

  const badgeGradientStyle: CSSProperties = {
    backgroundImage: createGradient(
      appearance.badgeGradientFrom || appearance.accentGradientFrom,
      appearance.badgeGradientTo || appearance.accentGradientTo,
      appearance.resolvedTheme?.badge
    ),
  };

  const accentColor = appearance.accentGradientFrom || '#7c3aed';
  const infoBoxStyle: CSSProperties = {
    borderColor: accentColor,
    backgroundColor: hexToRgba(accentColor, 0.12),
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 py-12">
        <div className="mx-auto max-w-3xl text-center">
          <div className="animate-pulse space-y-4">
            <div className="mx-auto h-12 w-64 rounded-lg bg-gray-200" />
            <div className="mx-auto h-8 w-48 rounded-lg bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !test) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 py-12">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border-2 border-red-200 bg-white p-8 text-center shadow-lg">
            <div className="mb-4 text-6xl">❌</div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">{error}</h1>
            <Link
              to="/tests"
              className="mt-4 inline-block rounded-lg bg-blue-600 px-6 py-3 text-white transition hover:bg-blue-700"
            >
              ← Вернуться к тестам
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Start screen
  if (!testProgress.started) {
    return (
      <TestIntroScreen
        test={test}
        appearance={appearance}
        totalQuestions={testProgress.totalQuestions}
        backUrl={backUrl}
        pageBackgroundStyle={pageBackgroundStyle}
        accentGradientStyle={accentGradientStyle}
        badgeGradientStyle={badgeGradientStyle}
        infoBoxStyle={infoBoxStyle}
        accentColor={accentColor}
        onStart={testProgress.handleStart}
        user={user}
        testId={testId!}
      />
    );
  }

  // Finish screen
  if (testProgress.finished) {
    return (
      <TestResultsScreen
        test={test}
        appearance={appearance}
        score={testProgress.score}
        totalQuestions={testProgress.totalQuestions}
        backUrl={backUrl}
        pageBackgroundStyle={pageBackgroundStyle}
        accentGradientStyle={accentGradientStyle}
        badgeGradientStyle={badgeGradientStyle}
        infoBoxStyle={infoBoxStyle}
        accentColor={accentColor}
        onRestart={testProgress.handleRestart}
        user={user}
        testId={testId!}
      />
    );
  }

  // Question screen
  if (!testProgress.currentQuestion) {
    return <div>Вопрос не найден</div>;
  }

  return (
    <TestQuestionScreen
      currentQuestion={testProgress.currentQuestion}
      displayedAnswers={displayedAnswers}
      currentQuestionIndex={testProgress.currentQuestionIndex}
      totalQuestions={testProgress.totalQuestions}
      score={testProgress.score}
      progress={testProgress.progress}
      appearance={appearance}
      pageBackgroundStyle={pageBackgroundStyle}
      accentGradientStyle={accentGradientStyle}
      accentColor={accentColor}
      selectedAnswer={answerValidation.selectedAnswer}
      answerState={answerValidation.answerState}
      showExplanation={answerValidation.showExplanation}
      shouldRevealCorrectAnswer={answerValidation.shouldRevealCorrectAnswer}
      effectiveRevealPolicy={answerValidation.effectiveRevealPolicy}
      attemptCount={answerValidation.attemptCount}
      onAnswer={answerValidation.handleAnswer}
      onNext={questionNavigation.handleNext}
      onRetry={answerValidation.retryAnswer}
    />
  );
}
