import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { getTestResults, groupResultsByTest } from '../lib/testResults';
import { debugLog, debugError } from '../lib/debug';
import type { TestResult } from '../types/testResults';

interface TestHistoryProps {
  testId: string;
}

export default function TestHistory({ testId }: TestHistoryProps) {
  const { user } = useAuth();
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!user) {
      debugLog('🟡 [TestHistory] User не авторизован');
      return;
    }

    debugLog('🔵 [TestHistory] Загружаем результаты для:', { userId: user.uid, testId });

    const loadResults = async () => {
      try {
        const data = await getTestResults(user.uid, testId);
        debugLog('✅ [TestHistory] Результаты загружены:', data);
        setResults(data);
      } catch (error) {
        debugError('❌ [TestHistory] Ошибка при загрузке результатов:', error);
      } finally {
        setLoading(false);
      }
    };

    loadResults();
  }, [user, testId]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center py-8 text-gray-500">Загрузка результатов...</div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span>📊</span>
          История результатов
        </h2>
        <div className="text-center py-12 text-gray-500">
          <div className="text-5xl mb-4">🎯</div>
          <p className="text-lg">У вас пока нет результатов по этому тесту</p>
          <p className="text-sm mt-2">Пройдите тест, чтобы увидеть здесь свою статистику</p>
        </div>
      </div>
    );
  }

  const bestResult = results.reduce((best, current) =>
    current.score > best.score ? current : best
  );
  const averageScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
  const averagePercentage = Math.round(
    results.reduce((sum, r) => sum + r.percentage, 0) / results.length
  );

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-blue-600';
    if (percentage >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
        <span>📊</span>
        История результатов
      </h2>

      {/* Сводная статистика */}
      <div
        className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 mb-4 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-1">
              {results[0].testTitle}
            </h3>
            <p className="text-sm text-gray-600">
              Попыток: <strong>{results.length}</strong>
            </p>
          </div>
          <button className="text-2xl text-gray-600 hover:text-gray-900 transition-colors">
            {expanded ? '▼' : '▶'}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Лучший результат</div>
            <div className="text-2xl font-bold text-green-600">
              {bestResult.score}/{bestResult.totalQuestions}
            </div>
            <div className="text-sm text-gray-500">{bestResult.percentage}%</div>
          </div>

          <div className="bg-white rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Средний балл</div>
            <div className="text-2xl font-bold text-blue-600">
              {averageScore.toFixed(1)}/{results[0].totalQuestions}
            </div>
            <div className="text-sm text-gray-500">{averagePercentage}%</div>
          </div>

          <div className="bg-white rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Последняя попытка</div>
            <div className="text-2xl font-bold text-purple-600">
              {results[0].score}/{results[0].totalQuestions}
            </div>
            <div className="text-sm text-gray-500">{results[0].percentage}%</div>
          </div>
        </div>
      </div>

      {/* Детальная история (раскрывается при клике) */}
      {expanded && (
        <div className="space-y-3 animate-fadeIn">
          <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span>📋</span>
            Все попытки
          </h4>
          {results.map((result, index) => (
            <div
              key={result.id || index}
              className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-semibold text-gray-600">
                      Попытка #{results.length - index}
                    </span>
                    {index === 0 && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-semibold">
                        Последняя
                      </span>
                    )}
                    {result.score === bestResult.score &&
                      result.completedAt === bestResult.completedAt && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-semibold">
                          🏆 Лучшая
                        </span>
                      )}
                  </div>
                  <div className="text-sm text-gray-600">{formatDate(result.completedAt)}</div>
                </div>

                <div className="text-right">
                  <div
                    className={`text-2xl font-bold ${getScoreColor(result.percentage)} mb-1`}
                  >
                    {result.score}/{result.totalQuestions}
                  </div>
                  <div className="text-sm text-gray-600">{result.percentage}%</div>
                </div>
              </div>

              {result.timeSpent && (
                <div className="mt-2 text-xs text-gray-500">
                  ⏱️ Время: {Math.floor(result.timeSpent / 60)} мин{' '}
                  {result.timeSpent % 60} сек
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
