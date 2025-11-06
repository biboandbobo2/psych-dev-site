import { useState, useMemo } from 'react';
import type { TestQuestion, RevealPolicy } from '../types/tests';
import { getYouTubeEmbedUrl } from '../utils/mediaUpload';

interface QuestionPreviewProps {
  question: TestQuestion;
  questionNumber: number;
}

function shuffleArray<T>(items: T[], seed: number): T[] {
  const result = [...items];
  let currentSeed = seed;

  const random = () => {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    return currentSeed / 233280;
  };

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function QuestionPreview({ question, questionNumber }: QuestionPreviewProps) {
  const [seed, setSeed] = useState(Date.now());
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [simulatedAttempts, setSimulatedAttempts] = useState(0);
  const [showSystemMessages, setShowSystemMessages] = useState(true);

  const displayedAnswers = useMemo(() => {
    if (!question.shuffleAnswers) return question.answers;
    return shuffleArray(question.answers, seed);
  }, [question.answers, question.shuffleAnswers, seed]);

  const isCorrect = selectedAnswerId === question.correctAnswerId;

  const shouldReveal = useMemo(() => {
    if (!isAnswered) return false;
    if (isCorrect) return true;

    const policy = question.revealPolicy;
    if (policy.mode === 'immediately') return true;
    if (policy.mode === 'never') return false;
    if (policy.mode === 'after_attempts') {
      return simulatedAttempts >= policy.attempts;
    }
    return false; // after_test
  }, [isAnswered, isCorrect, question.revealPolicy, simulatedAttempts]);

  const handleReshuffle = () => {
    setSeed(Date.now());
  };

  const handleCheck = () => {
    if (!selectedAnswerId) return;
    setIsAnswered(true);
    if (!isCorrect) {
      setSimulatedAttempts(prev => prev + 1);
    }
  };

  const handleReset = () => {
    setSelectedAnswerId(null);
    setIsAnswered(false);
    setSimulatedAttempts(0);
    setSeed(Date.now());
  };

  const handleSimulateCorrect = () => {
    if (!question.correctAnswerId) return;
    setSelectedAnswerId(question.correctAnswerId);
    setIsAnswered(true);
  };

  const handleSimulateIncorrect = () => {
    const incorrectAnswer = question.answers.find(a => a.id !== question.correctAnswerId);
    if (!incorrectAnswer) return;
    setSelectedAnswerId(incorrectAnswer.id);
    setIsAnswered(true);
    setSimulatedAttempts(prev => prev + 1);
  };

  const policyLabel = useMemo(() => {
    const policy = question.revealPolicy;
    if (policy.mode === 'never') return 'Никогда';
    if (policy.mode === 'immediately') return 'Сразу';
    if (policy.mode === 'after_test') return 'После завершения теста';
    if (policy.mode === 'after_attempts') {
      return `После ${policy.attempts} ${policy.attempts === 1 ? 'попытки' : 'попыток'}`;
    }
    return 'Неизвестно';
  }, [question.revealPolicy]);

  return (
    <div className="space-y-4">
      {/* Панель симуляции */}
      <div className="rounded-lg border-2 border-purple-200 bg-purple-50 p-4">
        <h3 className="mb-3 text-sm font-bold text-purple-900">Панель управления предпросмотром</h3>

        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="text-purple-800">Режим показа:</span>
          <span className="font-semibold text-purple-900">{policyLabel}</span>
        </div>

        {question.revealPolicy.mode === 'after_attempts' && (
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-purple-800">Текущая попытка:</span>
            <span className="font-semibold text-purple-900">
              {simulatedAttempts} / {question.revealPolicy.attempts}
            </span>
          </div>
        )}

        <div className="mb-3 flex items-center gap-2">
          <label className="inline-flex items-center gap-2 text-sm text-purple-900">
            <input
              type="checkbox"
              checked={showSystemMessages}
              onChange={(e) => setShowSystemMessages(e.target.checked)}
              className="h-4 w-4 rounded border-purple-300 text-purple-600 focus:ring-purple-500"
            />
            Показывать системные сообщения
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleSimulateCorrect}
            className="rounded-md bg-green-600 px-3 py-1 text-sm font-medium text-white transition hover:bg-green-700"
          >
            Правильный ответ
          </button>
          <button
            onClick={handleSimulateIncorrect}
            className="rounded-md bg-red-600 px-3 py-1 text-sm font-medium text-white transition hover:bg-red-700"
          >
            Неправильный ответ
          </button>
          {question.shuffleAnswers && (
            <button
              onClick={handleReshuffle}
              className="rounded-md bg-blue-600 px-3 py-1 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              ↻ Перемешать
            </button>
          )}
          <button
            onClick={handleReset}
            className="rounded-md bg-gray-600 px-3 py-1 text-sm font-medium text-white transition hover:bg-gray-700"
          >
            Сброс
          </button>
        </div>
      </div>

      {/* Предпросмотр вопроса */}
      <div className="rounded-xl border-2 border-gray-200 bg-white p-6 shadow-lg">
        <div className="mb-6">
          <div className="mb-2 text-sm font-semibold text-gray-600">
            Вопрос {questionNumber}
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{question.questionText}</h2>

          {/* Медиа */}
          {(question.imageUrl || question.audioUrl || question.videoUrl) && (
            <div className="mt-4 space-y-3">
              {question.imageUrl && (
                <div className="rounded-lg overflow-hidden border border-gray-200">
                  <img
                    src={question.imageUrl}
                    alt="Изображение к вопросу"
                    className="w-full h-auto max-h-96 object-contain bg-gray-50"
                  />
                </div>
              )}

              {question.audioUrl && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <audio controls className="w-full">
                    <source src={question.audioUrl} />
                    Ваш браузер не поддерживает аудио.
                  </audio>
                </div>
              )}

              {question.videoUrl && getYouTubeEmbedUrl(question.videoUrl) && (
                <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-900">
                  <div className="relative pb-[56.25%]">
                    <iframe
                      src={getYouTubeEmbedUrl(question.videoUrl) || ''}
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

        <div className="mb-6 space-y-3">
          {displayedAnswers.map((answer, index) => {
            const isSelected = selectedAnswerId === answer.id;
            const isCorrectOption = answer.id === question.correctAnswerId;

            let buttonClass = 'w-full text-left p-4 rounded-xl border-2 font-semibold transition-all';

            if (!isAnswered) {
              buttonClass += ' border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50 cursor-pointer';
            } else if (shouldReveal && isCorrectOption) {
              buttonClass += ' border-green-500 bg-green-100 text-green-800';
            } else if (isSelected && !isCorrect) {
              buttonClass += ' border-red-500 bg-red-100 text-red-800';
            } else {
              buttonClass += ' border-gray-300 bg-gray-100 text-gray-500';
            }

            return (
              <button
                key={answer.id}
                onClick={() => !isAnswered && setSelectedAnswerId(answer.id)}
                disabled={isAnswered}
                className={buttonClass}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 font-bold text-gray-700">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="flex-1">{answer.text}</span>
                </div>
              </button>
            );
          })}
        </div>

        {showSystemMessages && isAnswered && (
          <div className={`mb-4 rounded-xl border-2 p-4 ${isCorrect ? 'border-green-300 bg-green-50' : 'border-blue-300 bg-blue-50'}`}>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-2xl">{isCorrect ? '✅' : 'ℹ️'}</span>
              <span className={`font-bold ${isCorrect ? 'text-green-900' : 'text-blue-900'}`}>
                {isCorrect ? 'Правильно!' : 'Не совсем...'}
              </span>
            </div>

            {shouldReveal && isCorrect && question.customRightMsg && (
              <p className="text-gray-700">{question.customRightMsg}</p>
            )}
            {!isCorrect && question.customWrongMsg && (
              <p className="text-gray-700">{question.customWrongMsg}</p>
            )}

            {shouldReveal && question.explanation && (
              <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                <div className="mb-1 text-sm font-semibold text-blue-900">Объяснение:</div>
                <p className="text-sm text-blue-800">{question.explanation}</p>
              </div>
            )}

            {!shouldReveal && !isCorrect && question.revealPolicy.mode === 'after_attempts' && (
              <div className="mt-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                <p className="text-sm text-yellow-800">
                  Правильный ответ будет показан после {question.revealPolicy.attempts} {question.revealPolicy.attempts === 1 ? 'попытки' : 'попыток'}
                  {' '}(осталось: {question.revealPolicy.attempts - simulatedAttempts})
                </p>
              </div>
            )}

            {!shouldReveal && !isCorrect && question.revealPolicy.mode === 'after_test' && (
              <div className="mt-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                <p className="text-sm text-yellow-800">
                  Правильный ответ будет показан после завершения теста
                </p>
              </div>
            )}

            {shouldReveal && !isCorrect && question.correctAnswerId && (
              <p className="mt-2 text-sm text-gray-700">
                Правильный ответ:{' '}
                <strong>
                  {question.answers.find(a => a.id === question.correctAnswerId)?.text || ''}
                </strong>
              </p>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleCheck}
            disabled={!selectedAnswerId || isAnswered}
            className="flex-1 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 py-3 font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            Проверить
          </button>
          {isAnswered && (
            <button
              onClick={handleReset}
              className="flex-1 rounded-xl bg-gray-600 py-3 font-bold text-white transition hover:bg-gray-700"
            >
              Дальше
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
