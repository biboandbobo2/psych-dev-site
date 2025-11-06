import { useState, useEffect, useMemo, useCallback, type CSSProperties } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { saveTestResult } from '../lib/testResults';
import { getTestById } from '../lib/tests';
import { isTestUnlocked } from '../lib/testAccess';
import type {
  Test,
  TestQuestion,
  TestAppearance,
  RevealPolicy,
  QuestionAnswer,
} from '../types/tests';
import {
  DEFAULT_REVEAL_POLICY,
  MAX_REVEAL_ATTEMPTS,
} from '../types/tests';
import TestHistory from '../components/TestHistory';
import { mergeAppearance, createGradient, hexToRgba } from '../utils/testAppearance';
import { getYouTubeEmbedUrl } from '../utils/mediaUpload';

type QuestionOutcome = 'unanswered' | 'correct' | 'failed';

type AnswerState = 'idle' | 'correct' | 'incorrect';

type FeedbackState = {
  status: 'idle' | 'correct' | 'incorrect';
  reveal: boolean;
  revealReason?: 'correct' | 'after_attempts' | 'immediately' | 'after_test';
  attemptsLeft?: number;
};

function shuffleArray<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function resolveRevealPolicy(
  question: TestQuestion,
  defaultPolicy?: RevealPolicy
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

function shouldRevealOnResults(policy: RevealPolicy): boolean {
  if (policy.mode === 'never') return false;
  if (policy.mode === 'after_test') return true;
  return true;
}

export default function DynamicTest() {
  const { testId } = useParams<{ testId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Загрузка теста
  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Состояние теста
  const [started, setStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>('idle');
  const [showExplanation, setShowExplanation] = useState(false);
  const [finished, setFinished] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [resultSaved, setResultSaved] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);

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
        console.error('Ошибка загрузки теста:', err);
        setError('Не удалось загрузить тест');
      } finally {
        setLoading(false);
      }
    };

    loadTest();
  }, [testId, user, navigate]);

  const currentQuestion = test?.questions[currentQuestionIndex];
  const totalQuestions = test?.questions.length || 0;
  const progress = totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0;

  // Определяем URL для возврата в зависимости от рубрики теста
  const backUrl = useMemo(() => {
    if (!test) return '/tests';
    return test.rubric === 'full-course' ? '/tests' : '/tests/age-periods';
  }, [test?.rubric]);

  // Перемешивание вариантов ответов
  const displayedAnswers = useMemo(() => {
    if (!currentQuestion) return [];
    if (!currentQuestion.shuffleAnswers) return currentQuestion.answers;
    return shuffleArray(currentQuestion.answers);
  }, [currentQuestion?.id, currentQuestion?.shuffleAnswers, currentQuestion?.answers]);

  // Политика показа правильного ответа
  const effectiveRevealPolicy = useMemo(() => {
    if (!currentQuestion) return DEFAULT_REVEAL_POLICY;
    return resolveRevealPolicy(currentQuestion, test?.defaultRevealPolicy);
  }, [currentQuestion, test?.defaultRevealPolicy]);

  // Определяем, показывать ли правильный ответ
  const shouldRevealCorrectAnswer = useMemo(() => {
    if (answerState === 'idle') return false;
    if (answerState === 'correct') return true; // Всегда показываем при правильном ответе

    const policy = effectiveRevealPolicy;
    if (policy.mode === 'immediately') return true;
    if (policy.mode === 'never') return false;
    if (policy.mode === 'after_attempts') {
      return attemptCount >= policy.attempts;
    }
    // after_test - показываем только на экране результатов
    return false;
  }, [answerState, effectiveRevealPolicy, attemptCount]);

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

  const handleStart = () => {
    setStarted(true);
    setStartTime(new Date());
  };

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
          console.error('Ошибка при сохранении результата:', error);
        }
      };

      saveResult();
    }
  }, [finished, resultSaved, user, startTime, score, totalQuestions, test]);

  const handleAnswer = (answerId: string) => {
    if (answerState !== 'idle' || !currentQuestion) return;

    setSelectedAnswer(answerId);
    const isCorrect = answerId === currentQuestion.correctAnswerId;

    if (isCorrect) {
      setScore(score + 1);
      setAnswerState('correct');
    } else {
      setAnswerState('incorrect');
      setAttemptCount(prev => prev + 1);
    }

    setShowExplanation(true);
  };

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setAnswerState('idle');
      setShowExplanation(false);
      setAttemptCount(0);
    } else {
      setFinished(true);
    }
  };

  const handleRestart = () => {
    setStarted(false);
    setCurrentQuestionIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setAnswerState('idle');
    setShowExplanation(false);
    setFinished(false);
    setStartTime(null);
    setResultSaved(false);
    setAttemptCount(0);
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
  if (!started) {
    const bulletList = appearance.bulletPoints && appearance.bulletPoints.length > 0
      ? appearance.bulletPoints
      : [
          `Всего ${totalQuestions} вопросов`,
          'Выберите один вариант ответа на каждый вопрос',
          'После ответа появится пояснение и полезные материалы',
          test.requiredPercentage
            ? `Для разблокировки следующего уровня нужно не меньше ${test.requiredPercentage}%`
            : null,
        ].filter(Boolean) as string[];
    const bulletHeading = appearance.bulletPoints && appearance.bulletPoints.length > 0
      ? 'Особенности теста:'
      : 'Правила теста:';

    return (
      <div className="min-h-screen py-12 px-4" style={pageBackgroundStyle}>
        <div className="max-w-3xl mx-auto">
          <Link
            to={backUrl}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <span className="text-xl mr-2">←</span>
            Вернуться к списку тестов
          </Link>

          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
            <div className="text-center">
              {(appearance.badgeIcon || appearance.badgeLabel) && (
                <div
                  className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-full font-bold text-sm mb-4"
                  style={badgeGradientStyle}
                >
                  {appearance.badgeIcon ? <span>{appearance.badgeIcon}</span> : null}
                  {appearance.badgeLabel ? <span>{appearance.badgeLabel}</span> : null}
                </div>
              )}
              {appearance.introIcon && <div className="text-6xl mb-6">{appearance.introIcon}</div>}
              <h1 className="text-4xl font-bold text-gray-900 mb-4">{test.title}</h1>
              <p className="text-xl text-gray-600 mb-8">{appearance.introDescription}</p>

              <div className="border rounded-xl p-6 mb-8 text-left" style={infoBoxStyle}>
                <h3
                  className="font-semibold mb-3 flex items-center gap-2"
                  style={{ color: accentColor }}
                >
                  <span>📋</span>
                  {bulletHeading}
                </h3>
                <ul className="space-y-2 text-gray-700">
                  {bulletList.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-lg font-bold leading-6" style={{ color: accentColor }}>
                        •
                      </span>
                      <span className="leading-6">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={handleStart}
                style={accentGradientStyle}
                className="w-full text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                Начать тест
              </button>
            </div>
          </div>

          {user && testId && (
            <div className="mt-6 space-y-6">
              <TestHistory userId={user.uid} testId={testId} />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Finish screen
  if (finished) {
    const percentage = Math.round((score / totalQuestions) * 100);
    const passThreshold = test.requiredPercentage ?? 70;
    const passed = percentage >= passThreshold;

    const scoreEmoji = () => {
      if (percentage === 100) return '🏆';
      if (percentage >= 80) return '🌟';
      if (percentage >= 60) return '👍';
      if (percentage >= 40) return '📚';
      return '💪';
    };

    const scoreMessage = () => {
      if (percentage === 100) return 'Идеальный результат! Великолепно!';
      if (percentage >= 80) return 'Отлично! Вы превосходно знаете материал.';
      if (percentage >= 60) return 'Хорошо! Ещё немного практики и будет идеально.';
      if (percentage >= 40) return 'Неплохо, но стоит повторить некоторые темы.';
      return 'Рекомендуем пересмотреть материалы и попробовать ещё раз.';
    };

    return (
      <div className="min-h-screen py-12 px-4" style={pageBackgroundStyle}>
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
            <div className="text-center">
              {(appearance.badgeIcon || appearance.badgeLabel) && (
                <div
                  className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-full font-bold text-sm mb-4"
                  style={badgeGradientStyle}
                >
                  {appearance.badgeIcon ? <span>{appearance.badgeIcon}</span> : null}
                  {appearance.badgeLabel ? <span>{appearance.badgeLabel}</span> : null}
                </div>
              )}
              <div className="text-8xl mb-6">{scoreEmoji()}</div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                {passed ? 'Тест пройден!' : 'Тест завершён'}
              </h1>
              <p className="text-2xl text-gray-600 mb-8">{scoreMessage()}</p>

              <div className="rounded-2xl p-8 mb-8 border" style={infoBoxStyle}>
                <div className="text-6xl font-bold mb-2" style={{ color: accentColor }}>
                  {score} / {totalQuestions}
                </div>
                <div className="text-lg text-gray-700">Правильных ответов</div>
                <div className="mt-4 text-3xl font-bold" style={{ color: accentColor }}>
                  {percentage}%
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  Требуемый порог для следующего уровня: {passThreshold}%
                </div>
              </div>

              <div className="space-y-4">
                <button
                  onClick={handleRestart}
                  style={accentGradientStyle}
                  className="w-full text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                >
                  Пройти тест заново
                </button>
                <Link
                  to={backUrl}
                  className="block w-full bg-white border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-xl font-bold text-lg hover:border-gray-400 transition-all duration-300"
                >
                  Вернуться к списку тестов
                </Link>
              </div>
            </div>
          </div>

          {user && testId && (
            <div className="mt-6 space-y-6">
              <TestHistory userId={user.uid} testId={testId} />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Question screen
  if (!currentQuestion) {
    return <div>Вопрос не найден</div>;
  }

  const renderQuestionHeading = (text: string) => {
    const normalized = text.replace(/\r/g, '').trim();
    if (!normalized) {
      return null;
    }

    const renderWithBreaks = (value: string) =>
      value.split('\n').map((line, idx) => (
        <span key={idx}>
          {idx > 0 && <br />}
          {line}
        </span>
      ));

    const segments = normalized.split(/\n{2,}/);
    const [main, ...rest] = segments;

    return (
      <>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">{renderWithBreaks(main)}</h2>
        {rest.map((segment, idx) => {
          const trimmed = segment.trim();
          if (!trimmed) return null;
          const isSource = /^источник[:]/i.test(trimmed);
          const className = isSource
            ? 'text-sm text-gray-500'
            : 'text-2xl text-purple-600 font-semibold';
          return (
            <p key={idx} className={className}>
              {renderWithBreaks(trimmed)}
            </p>
          );
        })}
      </>
    );
  };

  return (
    <div className="min-h-screen py-12 px-4" style={pageBackgroundStyle}>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-600">
            Вопрос {currentQuestionIndex + 1} из {totalQuestions}
          </div>
          <div className="text-sm font-semibold" style={{ color: accentColor }}>
            Правильных ответов: {score}
          </div>
        </div>

        <div className="mb-6 bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%`, ...accentGradientStyle }}
          />
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          <div className="mb-8 text-center">
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
              style={{ backgroundColor: hexToRgba(accentColor, 0.15) }}
            >
              <span className="text-3xl">{appearance.introIcon || '👤'}</span>
            </div>
            {renderQuestionHeading(currentQuestion.questionText)}

            {/* Медиа к вопросу */}
            {(currentQuestion.imageUrl || currentQuestion.audioUrl || currentQuestion.videoUrl) && (
              <div className="mt-6 space-y-4">
                {currentQuestion.imageUrl && (
                  <div className="rounded-xl overflow-hidden border-2 border-gray-200 shadow-sm">
                    <img
                      src={currentQuestion.imageUrl}
                      alt="Изображение к вопросу"
                      className="w-full h-auto max-h-96 object-contain bg-gray-50"
                    />
                  </div>
                )}

                {currentQuestion.audioUrl && (
                  <div className="rounded-xl border-2 border-gray-200 bg-white p-4 shadow-sm">
                    <audio controls className="w-full">
                      <source src={currentQuestion.audioUrl} />
                      Ваш браузер не поддерживает аудио.
                    </audio>
                  </div>
                )}

                {currentQuestion.videoUrl && getYouTubeEmbedUrl(currentQuestion.videoUrl) && (
                  <div className="rounded-xl overflow-hidden border-2 border-gray-200 shadow-sm bg-black">
                    <div className="relative pb-[56.25%]">
                      <iframe
                        src={getYouTubeEmbedUrl(currentQuestion.videoUrl) || ''}
                        className="absolute inset-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title="Видео к вопросу"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4 mb-6">
            {displayedAnswers.map((answer, index) => {
              const isSelected = selectedAnswer === answer.id;
              const isCorrectOption = answer.id === currentQuestion.correctAnswerId;

              let buttonClass =
                'w-full text-left p-4 rounded-xl border-2 font-semibold transition-all duration-300 transform';

              if (answerState === 'idle') {
                buttonClass +=
                  ' border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50 hover:scale-105 cursor-pointer';
              } else if (shouldRevealCorrectAnswer && isCorrectOption) {
                buttonClass += ' border-green-500 bg-green-100 text-green-800';
              } else if (isSelected && answerState === 'incorrect') {
                buttonClass += ' border-red-500 bg-red-100 text-red-800';
              } else if (answerState !== 'idle') {
                buttonClass += ' border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed';
              }

              return (
                <button
                  key={answer.id}
                  onClick={() => handleAnswer(answer.id)}
                  disabled={answerState !== 'idle'}
                  className={buttonClass}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-700">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="flex-1">{answer.text}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {showExplanation && (
            <div className="mt-6 animate-fadeIn">
              <div
                className={`p-6 rounded-xl border-2 ${
                  answerState === 'correct'
                    ? 'bg-green-50 border-green-300'
                    : 'bg-blue-50 border-blue-300'
                }`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-2xl">
                    {answerState === 'correct' ? '✅' : 'ℹ️'}
                  </span>
                  <div>
                    <div
                      className={`font-bold mb-2 ${
                        answerState === 'correct' ? 'text-green-800' : 'text-blue-800'
                      }`}
                    >
                      {answerState === 'correct' ? 'Правильно!' : 'Не совсем...'}
                    </div>
                    {shouldRevealCorrectAnswer && answerState === 'correct' && currentQuestion.customRightMsg ? (
                      <p className="text-gray-700">{currentQuestion.customRightMsg}</p>
                    ) : null}
                    {answerState === 'incorrect' && currentQuestion.customWrongMsg ? (
                      <p className="text-gray-700">{currentQuestion.customWrongMsg}</p>
                    ) : null}

                    {/* Показываем объяснение только если разрешено показывать правильный ответ */}
                    {shouldRevealCorrectAnswer && currentQuestion.explanation ? (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-sm font-semibold text-blue-900 mb-1">Объяснение:</div>
                        <p className="text-sm text-blue-800">{currentQuestion.explanation}</p>
                      </div>
                    ) : null}

                    {/* Если не показываем правильный ответ, покажем причину */}
                    {!shouldRevealCorrectAnswer && answerState === 'incorrect' && effectiveRevealPolicy.mode === 'after_attempts' ? (
                      <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <p className="text-sm text-yellow-800">
                          Правильный ответ будет показан после {effectiveRevealPolicy.attempts} {effectiveRevealPolicy.attempts === 1 ? 'попытки' : 'попыток'}
                          {' '}(осталось: {effectiveRevealPolicy.attempts - attemptCount})
                        </p>
                      </div>
                    ) : null}

                    {!shouldRevealCorrectAnswer && answerState === 'incorrect' && effectiveRevealPolicy.mode === 'after_test' ? (
                      <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <p className="text-sm text-yellow-800">
                          Правильный ответ будет показан после завершения теста
                        </p>
                      </div>
                    ) : null}

                    {shouldRevealCorrectAnswer && answerState === 'correct' && currentQuestion.resourcesRight?.length ? (
                      <div className="mt-3 text-sm">
                        <div className="font-semibold text-green-800">Рекомендуемые материалы:</div>
                        <ul className="mt-2 space-y-1">
                          {currentQuestion.resourcesRight.map((resource, idx) => (
                            <li key={idx}>
                              <a
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-700 underline hover:text-green-900"
                              >
                                {resource.title}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {shouldRevealCorrectAnswer && answerState === 'incorrect' && currentQuestion.resourcesWrong?.length ? (
                      <div className="mt-3 text-sm">
                        <div className="font-semibold text-blue-800">Материалы для разбора:</div>
                        <ul className="mt-2 space-y-1">
                          {currentQuestion.resourcesWrong.map((resource, idx) => (
                            <li key={idx}>
                              <a
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-700 underline hover:text-blue-900"
                              >
                                {resource.title}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {shouldRevealCorrectAnswer && answerState === 'incorrect' && currentQuestion.correctAnswerId && (
                      <p className="mt-2 text-sm text-gray-700">
                        Правильный ответ:{' '}
                        <strong>
                          {currentQuestion.answers.find(a => a.id === currentQuestion.correctAnswerId)?.text || ''}
                        </strong>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Кнопка для повторной попытки или следующего вопроса */}
              {!shouldRevealCorrectAnswer && answerState === 'incorrect' && effectiveRevealPolicy.mode === 'after_attempts' && attemptCount < effectiveRevealPolicy.attempts ? (
                <button
                  onClick={() => {
                    setSelectedAnswer(null);
                    setAnswerState('idle');
                    setShowExplanation(false);
                  }}
                  style={accentGradientStyle}
                  className="mt-6 w-full text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg transform hover:scale-105 transition-all duration-300"
                >
                  Попробовать ещё раз
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  style={accentGradientStyle}
                  className="mt-6 w-full text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg transform hover:scale-105 transition-all duration-300"
                >
                  {currentQuestionIndex < totalQuestions - 1 ? 'Следующий вопрос →' : 'Завершить тест'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
