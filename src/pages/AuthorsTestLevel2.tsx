import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AUTHORS_TEST_LEVEL2_QUESTIONS, type QuoteQuestion } from '../data/authorsTestLevel2Data';
import { useAuth } from '../auth/AuthProvider';
import { saveTestResult, getTestResults } from '../lib/testResults';
import TestHistory from '../components/TestHistory';

type AnswerState = 'idle' | 'correct' | 'incorrect';

const TEST_ID = 'authors-test-level2';
const TEST_TITLE = 'Цитаты великих психологов (Уровень 2)';
const REQUIRED_LEVEL1_SCORE = 10; // Нужно 10/10 на уровне 1

export default function AuthorsTestLevel2() {
  const { user } = useAuth();
  const [started, setStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>('idle');
  const [showExplanation, setShowExplanation] = useState(false);
  const [finished, setFinished] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [resultSaved, setResultSaved] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState<boolean | null>(null); // null = loading

  const currentQuestion = AUTHORS_TEST_LEVEL2_QUESTIONS[currentQuestionIndex];
  const totalQuestions = AUTHORS_TEST_LEVEL2_QUESTIONS.length;
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  // Проверка разблокировки уровня 2
  useEffect(() => {
    if (!user) {
      setIsUnlocked(false);
      return;
    }

    const checkUnlock = async () => {
      try {
        const level1Results = await getTestResults(user.uid, 'authors-test');
        const hasPerfectScore = level1Results.some((result) => result.score === REQUIRED_LEVEL1_SCORE);
        console.log('🔵 [Level2] Проверка разблокировки:', { hasPerfectScore, results: level1Results });
        setIsUnlocked(hasPerfectScore);
      } catch (error) {
        console.error('❌ [Level2] Ошибка проверки разблокировки:', error);
        setIsUnlocked(false);
      }
    };

    checkUnlock();
  }, [user]);

  const handleStart = () => {
    setStarted(true);
    setStartTime(new Date());
  };

  // Сохранение результата после завершения теста
  useEffect(() => {
    if (finished && !resultSaved && user && startTime) {
      const saveResult = async () => {
        try {
          const endTime = new Date();
          const timeSpent = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
          const percentage = Math.round((score / totalQuestions) * 100);

          console.log('🔵 [AuthorsTest] Сохраняем результат:', {
            userId: user.uid,
            testId: TEST_ID,
            testTitle: TEST_TITLE,
            score,
            totalQuestions,
            percentage,
            completedAt: endTime,
            timeSpent,
          });

          await saveTestResult({
            userId: user.uid,
            testId: TEST_ID,
            testTitle: TEST_TITLE,
            score,
            totalQuestions,
            percentage,
            completedAt: endTime,
            timeSpent,
          });

          console.log('✅ [AuthorsTest] Результат успешно сохранён!');
          setResultSaved(true);
        } catch (error) {
          console.error('❌ [AuthorsTest] Ошибка при сохранении результата:', error);
        }
      };

      saveResult();
    }
  }, [finished, resultSaved, user, startTime, score, totalQuestions]);

  const handleAnswer = (answer: string) => {
    if (answerState !== 'idle') return;

    setSelectedAnswer(answer);
    const isCorrect = answer === currentQuestion.correctAuthor;

    if (isCorrect) {
      setScore(score + 1);
      setAnswerState('correct');
    } else {
      setAnswerState('incorrect');
    }

    setShowExplanation(true);
  };

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setAnswerState('idle');
      setShowExplanation(false);
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
  };

  const getButtonClass = (option: string) => {
    const baseClass =
      'w-full text-left p-4 rounded-xl border-2 font-semibold transition-all duration-300 transform';

    if (answerState === 'idle') {
      return `${baseClass} border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50 hover:scale-105 cursor-pointer`;
    }

    if (option === currentQuestion.correctAuthor) {
      return `${baseClass} border-green-500 bg-green-100 text-green-800`;
    }

    if (option === selectedAnswer && answerState === 'incorrect') {
      return `${baseClass} border-red-500 bg-red-100 text-red-800`;
    }

    return `${baseClass} border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed`;
  };

  const getScoreEmoji = () => {
    const percentage = (score / totalQuestions) * 100;
    if (percentage === 100) return '🏆';
    if (percentage >= 80) return '🌟';
    if (percentage >= 60) return '👍';
    if (percentage >= 40) return '📚';
    return '💪';
  };

  const getScoreMessage = () => {
    const percentage = (score / totalQuestions) * 100;
    if (percentage === 100) return 'Невероятно! Идеальный результат!';
    if (percentage >= 80) return 'Отлично! Вы прекрасно знаете цитаты психологов!';
    if (percentage >= 60) return 'Хорошо! Продолжайте изучать материал!';
    if (percentage >= 40) return 'Неплохо, но есть куда расти!';
    return 'Рекомендуем повторить материал и попробовать снова.';
  };

  // Проверка разблокировки
  if (isUnlocked === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Проверка доступа...</p>
        </div>
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <Link
            to="/tests"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <span className="text-xl mr-2">←</span>
            Вернуться к списку тестов
          </Link>

          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center">
            <div className="text-6xl mb-6">🔒</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Уровень 2 заблокирован</h1>
            <p className="text-xl text-gray-600 mb-6">
              Чтобы разблокировать этот тест, необходимо набрать <strong>10 из 10 баллов</strong> на первом уровне.
            </p>
            <Link
              to="/tests/authors"
              className="inline-block bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              Пройти уровень 1
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <Link
            to="/tests"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <span className="text-xl mr-2">←</span>
            Вернуться к списку тестов
          </Link>

          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
            <div className="text-center">
              <div className="text-6xl mb-6">💬</div>
              <div className="inline-flex items-center gap-2 mb-4">
                <span className="px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full text-sm font-bold">
                  🔥 УРОВЕНЬ 2
                </span>
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Цитаты великих психологов
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                Угадайте авторов известных мыслей о развитии человека
              </p>

              <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 mb-8 text-left">
                <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                  <span>📋</span>
                  Правила теста:
                </h3>
                <ul className="space-y-2 text-purple-800">
                  <li>• Всего <strong>{totalQuestions} цитат</strong></li>
                  <li>• Для каждой цитаты выберите автора из 4 вариантов</li>
                  <li>• После ответа вы увидите объяснение</li>
                  <li>• За каждый правильный ответ — 1 балл</li>
                  <li>• Сложность выше, чем на уровне 1 — будьте внимательны!</li>
                </ul>
              </div>

              <button
                onClick={handleStart}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                Начать тест
              </button>
            </div>
          </div>

          {user && (
            <div className="mt-6">
              <TestHistory testId={TEST_ID} />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
            <div className="text-center">
              <div className="text-8xl mb-6">{getScoreEmoji()}</div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">Тест завершён!</h1>
              <p className="text-2xl text-gray-600 mb-8">{getScoreMessage()}</p>

              <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl p-8 mb-8">
                <div className="text-6xl font-bold text-purple-700 mb-2">
                  {score} / {totalQuestions}
                </div>
                <div className="text-lg text-gray-700">Правильных ответов</div>
                <div className="mt-4 text-3xl font-bold text-blue-600">
                  {Math.round((score / totalQuestions) * 100)}%
                </div>
              </div>

              <div className="space-y-4">
                <button
                  onClick={handleRestart}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                >
                  Пройти тест заново
                </button>
                <Link
                  to="/tests"
                  className="block w-full bg-white border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-xl font-bold text-lg hover:border-gray-400 transition-all duration-300"
                >
                  Вернуться к списку тестов
                </Link>
              </div>
            </div>
          </div>

          {user && (
            <div className="mt-6">
              <TestHistory testId={TEST_ID} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-600">
            Вопрос {currentQuestionIndex + 1} из {totalQuestions}
          </div>
          <div className="text-sm font-semibold text-purple-600">
            Баллов: {score} / {totalQuestions}
          </div>
        </div>

        <div className="mb-6 bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-purple-600 to-blue-600 h-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full mb-4">
              <span className="text-3xl">💬</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Кто автор этой цитаты?
            </h2>
            <div className="text-xl text-gray-700 font-medium italic max-w-2xl mx-auto border-l-4 border-purple-500 pl-4 text-left">
              "{currentQuestion.quote}"
            </div>
          </div>

          <div className="space-y-4 mb-6">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(option)}
                disabled={answerState !== 'idle'}
                className={getButtonClass(option)}
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-700">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span>{option}</span>
                </div>
              </button>
            ))}
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
                    <p className="text-gray-700">{currentQuestion.explanation}</p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleNext}
                className="mt-6 w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg transform hover:scale-105 transition-all duration-300"
              >
                {currentQuestionIndex < totalQuestions - 1
                  ? 'Следующий вопрос →'
                  : 'Посмотреть результаты'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
