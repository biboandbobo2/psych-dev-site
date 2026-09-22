import { type CSSProperties, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Test, TestAppearance, TestSummary } from '../../types/tests';
import TestHistory from '../TestHistory';
import { getCompletionRevealItems } from '../../utils/testRevealPolicy';
import { getNextLevelTest } from '../../lib/tests';
import { debugError } from '../../lib/debug';

interface TestResultsScreenProps {
  test: Test;
  appearance: TestAppearance;
  score: number;
  totalQuestions: number;
  backUrl: string;
  pageBackgroundStyle: CSSProperties;
  accentGradientStyle: CSSProperties;
  badgeGradientStyle: CSSProperties;
  infoBoxStyle: CSSProperties;
  accentColor: string;
  onRestart: () => void;
  user: { uid: string } | null;
  testId: string;
}

export function TestResultsScreen({
  test,
  appearance,
  score,
  totalQuestions,
  backUrl,
  pageBackgroundStyle,
  accentGradientStyle,
  badgeGradientStyle,
  infoBoxStyle,
  accentColor,
  onRestart,
  user,
  testId,
}: TestResultsScreenProps) {
  // undefined — ещё ищем следующий уровень; null — его нет
  const [nextLevel, setNextLevel] = useState<TestSummary | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    getNextLevelTest(testId)
      .then((next) => {
        if (!cancelled) setNextLevel(next);
      })
      .catch((error) => {
        debugError('Не удалось загрузить следующий уровень:', error);
        if (!cancelled) setNextLevel(null);
      });
    return () => {
      cancelled = true;
    };
  }, [testId]);

  const percentage = Math.round((score / totalQuestions) * 100);
  // Порог прохождения = порог разблокировки следующего уровня (он хранится в самом следующем тесте)
  const passThreshold = nextLevel?.requiredPercentage ?? test.requiredPercentage ?? 70;
  const passed = percentage >= passThreshold;
  const levelResolved = nextLevel !== undefined;
  const canGoNext = Boolean(nextLevel) && passed;
  const completionRevealItems = getCompletionRevealItems(test);

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
              {levelResolved && passed ? 'Тест пройден!' : 'Тест завершён'}
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
              {levelResolved ? (
                <div className="mt-2 text-sm text-gray-600">
                  {nextLevel
                    ? `Порог для следующего уровня: ${passThreshold}%`
                    : `Порог прохождения: ${passThreshold}%`}
                </div>
              ) : null}
            </div>

            {completionRevealItems.length > 0 ? (
              <div className="mb-8 rounded-2xl border p-6 text-left" style={infoBoxStyle}>
                <h2 className="text-2xl font-bold text-gray-900">Верные ответы</h2>
                <p className="mt-2 text-sm text-gray-600">
                  Для этого теста правильные ответы открываются после завершения.
                </p>
                <div className="mt-6 space-y-4">
                  {completionRevealItems.map(({ question, correctAnswerText }, index) => (
                    <div key={question.id} className="rounded-xl border border-white/70 bg-white/70 p-4">
                      <div className="text-sm font-semibold text-gray-500">
                        Вопрос {index + 1}
                      </div>
                      <p className="mt-1 font-semibold text-gray-900">{question.questionText}</p>
                      <p className="mt-2 text-gray-700">
                        <span className="font-semibold">Правильный ответ:</span>{' '}
                        {correctAnswerText}
                      </p>
                      {question.explanation ? (
                        <p className="mt-2 text-sm text-gray-600">{question.explanation}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {levelResolved ? (
              <div className="space-y-4">
                {canGoNext && nextLevel ? (
                  <Link
                    to={`/tests/dynamic/${nextLevel.id}`}
                    style={accentGradientStyle}
                    className="block w-full text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                  >
                    Следующий уровень →
                    <span className="block text-sm font-medium opacity-90">{nextLevel.title}</span>
                  </Link>
                ) : null}
                <button
                  onClick={onRestart}
                  style={canGoNext ? undefined : accentGradientStyle}
                  className={
                    canGoNext
                      ? 'w-full bg-white border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-xl font-bold text-lg hover:border-gray-400 transition-all duration-300'
                      : 'w-full text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300'
                  }
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
            ) : null}
          </div>
        </div>

        {user && testId && (
          <div className="mt-6 space-y-6">
            <TestHistory testId={testId} />
          </div>
        )}
      </div>
    </div>
  );
}
