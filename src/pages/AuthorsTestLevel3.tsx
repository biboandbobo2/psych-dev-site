import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AUTHORS_TEST_LEVEL3_QUESTIONS,
  type QuoteWithGapQuestion,
} from '../data/authorsTestLevel3Data';
import { useAuth } from '../auth/AuthProvider';
import { saveTestResult, getTestResults } from '../lib/testResults';
import TestHistory from '../components/TestHistory';

type AnswerState = 'idle' | 'correct' | 'incorrect';

const TEST_ID = 'authors-test-level3';
const TEST_TITLE = 'Термины в контексте (Уровень 3)';
const REQUIRED_LEVEL2_SCORE = 10;

export default function AuthorsTestLevel3() {
  const { user } = useAuth();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [started, setStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>('idle');
  const [showFeedback, setShowFeedback] = useState(false);
  const [finished, setFinished] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [resultSaved, setResultSaved] = useState(false);

  const currentQuestion = AUTHORS_TEST_LEVEL3_QUESTIONS[currentQuestionIndex];
  const totalQuestions = AUTHORS_TEST_LEVEL3_QUESTIONS.length;
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  // Проверка разблокировки уровня 3
  useEffect(() => {
    if (!user) {
      setIsUnlocked(false);
      return;
    }

    const checkUnlock = async () => {
      try {
        console.log('🔵 [Level3] Проверяем разблокировку для пользователя:', user.uid);
        const level2Results = await getTestResults(user.uid, 'authors-test-level2');
        console.log('🔵 [Level3] Результаты Level 2:', level2Results);

        const hasPerfectScore = level2Results.some(
          (result) => result.score === REQUIRED_LEVEL2_SCORE
        );
        console.log('🔵 [Level3] Есть идеальный результат на Level 2?', hasPerfectScore);

        setIsUnlocked(hasPerfectScore);
      } catch (error) {
        console.error('❌ [Level3] Ошибка проверки разблокировки:', error);
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

          console.log('🔵 [Level3] Сохраняем результат:', {
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

          console.log('✅ [Level3] Результат успешно сохранён!');
          setResultSaved(true);
        } catch (error) {
          console.error('❌ [Level3] Ошибка при сохранении результата:', error);
        }
      };

      saveResult();
    }
  }, [finished, resultSaved, user, startTime, score, totalQuestions]);

  const handleAnswer = (answer: string) => {
    if (answerState !== 'idle') return;

    setSelectedAnswer(answer);
    const isCorrect = answer === currentQuestion.correctTerm;

    if (isCorrect) {
      setScore(score + 1);
      setAnswerState('correct');
    } else {
      setAnswerState('incorrect');
    }

    setShowFeedback(true);
  };

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setAnswerState('idle');
      setShowFeedback(false);
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
    setShowFeedback(false);
    setFinished(false);
    setStartTime(null);
    setResultSaved(false);
  };

  const getButtonClass = (option: string) => {
    const baseClass =
      'w-full text-left p-4 rounded-xl border-2 font-semibold transition-all duration-300 transform';

    if (answerState === 'idle') {
      return `${baseClass} border-gray-300 bg-white hover:border-orange-400 hover:bg-orange-50 hover:scale-105 cursor-pointer`;
    }

    // При правильном ответе - подсвечиваем только выбранный правильный
    if (option === selectedAnswer && answerState === 'correct') {
      return `${baseClass} border-green-500 bg-green-100 text-green-800`;
    }

    // При неправильном ответе - подсвечиваем выбранный как ошибочный, но НЕ показываем правильный
    if (option === selectedAnswer && answerState === 'incorrect') {
      return `${baseClass} border-red-500 bg-red-100 text-red-800`;
    }

    // Остальные варианты делаем неактивными
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
    if (percentage === 100)
      return 'Феноменально! Вы владеете терминологией на экспертном уровне!';
    if (percentage >= 80) return 'Превосходно! Вы отлично разбираетесь в контекстах!';
    if (percentage >= 60) return 'Хорошо! Продолжайте углублять понимание!';
    if (percentage >= 40) return 'Неплохо! Рекомендуем перечитать классические работы.';
    return 'Советуем вернуться к первоисточникам и изучить контексты глубже.';
  };

  // Если не разблокирован
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 py-12 px-4">
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
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Уровень 3 заблокирован</h1>
            <p className="text-xl text-gray-600 mb-6">
              Чтобы разблокировать этот тест, необходимо набрать{' '}
              <strong>10 из 10 баллов</strong> на втором уровне.
            </p>
            <Link
              to="/tests/authors/level2"
              className="inline-block bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              Пройти уровень 2
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 py-12 px-4">
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
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-400 to-red-500 text-white rounded-full font-bold text-sm mb-4">
                <span>🔥🔥</span>
                <span>УРОВЕНЬ 3</span>
              </div>
              <div className="text-6xl mb-6">📖</div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">Термины в контексте</h1>
              <p className="text-xl text-gray-600 mb-8">
                Восстановите термины в цитатах из классических работ психологов
              </p>

              <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 mb-8 text-left">
                <h3 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
                  <span>📋</span>
                  Особенности этого уровня:
                </h3>
                <ul className="space-y-2 text-orange-800">
                  <li>• Всего <strong>{totalQuestions} цитат</strong> из оригинальных работ</li>
                  <li>
                    • Вставьте пропущенный <strong>термин</strong> в контекст цитаты
                  </li>
                  <li>
                    • При правильном ответе получите <strong>ссылку на источник</strong> для
                    углубления
                  </li>
                  <li>
                    • При ошибке правильный ответ <strong>не показывается</strong> — подумайте ещё!
                  </li>
                  <li>• Варианты похожи, но только один точно передаёт смысл</li>
                </ul>
              </div>

              <button
                onClick={handleStart}
                className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
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
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-400 to-red-500 text-white rounded-full font-bold text-sm mb-4">
                <span>🔥🔥</span>
                <span>УРОВЕНЬ 3</span>
              </div>
              <div className="text-8xl mb-6">{getScoreEmoji()}</div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">Тест завершён!</h1>
              <p className="text-2xl text-gray-600 mb-8">{getScoreMessage()}</p>

              <div className="bg-gradient-to-br from-orange-100 to-red-100 rounded-2xl p-8 mb-8">
                <div className="text-6xl font-bold text-orange-700 mb-2">
                  {score} / {totalQuestions}
                </div>
                <div className="text-lg text-gray-700">Правильных ответов</div>
                <div className="mt-4 text-3xl font-bold text-red-600">
                  {Math.round((score / totalQuestions) * 100)}%
                </div>
              </div>

              <div className="space-y-4">
                <button
                  onClick={handleRestart}
                  className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
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

  // Заменяем [___] на визуальный пропуск в цитате
  const renderQuoteWithGap = (quote: string) => {
    const parts = quote.split('[___]');
    return (
      <span>
        {parts[0]}
        <span className="inline-block mx-1 px-4 py-1 border-b-4 border-orange-400 min-w-[120px] text-center font-bold text-orange-600">
          ?
        </span>
        {parts[1]}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-600">
            Цитата {currentQuestionIndex + 1} из {totalQuestions}
          </div>
          <div className="text-sm font-semibold text-orange-600">
            Баллов: {score} / {totalQuestions}
          </div>
        </div>

        <div className="mb-6 bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-orange-600 to-red-600 h-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-orange-400 to-red-500 text-white rounded-full font-bold text-xs mb-6">
              <span>🔥🔥</span>
              <span>УРОВЕНЬ 3</span>
            </div>

            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-100 to-red-100 rounded-full mb-4">
                <span className="text-3xl">📖</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Какой термин пропущен в цитате?
              </h2>
            </div>

            <div className="bg-gray-50 border-l-4 border-orange-400 p-6 rounded-r-xl mb-6">
              <p className="text-lg leading-relaxed text-gray-800 italic">
                {renderQuoteWithGap(currentQuestion.quote)}
              </p>
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

          {showFeedback && (
            <div className="mt-6 animate-fadeIn">
              {answerState === 'correct' ? (
                <div className="p-6 rounded-xl border-2 bg-green-50 border-green-300">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-2xl">✅</span>
                    <div className="flex-1">
                      <div className="font-bold mb-2 text-green-800">Правильно!</div>
                      <p className="text-gray-700 mb-4">
                        Отличное понимание контекста! Углубите знания, изучив первоисточник:
                      </p>
                      <a
                        href={currentQuestion.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                      >
                        <span>📚</span>
                        <span>{currentQuestion.sourceTitle}</span>
                        <span>↗</span>
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-xl border-2 bg-orange-50 border-orange-300">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">💭</span>
                    <div>
                      <div className="font-bold mb-2 text-orange-800">
                        Попробуйте подумать ещё!
                      </div>
                      <p className="text-gray-700">{currentQuestion.encouragement}</p>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleNext}
                className="mt-6 w-full bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg transform hover:scale-105 transition-all duration-300"
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
