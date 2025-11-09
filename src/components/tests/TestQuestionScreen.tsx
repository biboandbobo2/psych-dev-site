import { useMemo, type CSSProperties } from 'react';
import type { TestQuestion, QuestionAnswer, TestAppearance, RevealPolicy } from '../../types/tests';
import { getYouTubeEmbedUrl } from '../../utils/mediaUpload';
import { hexToRgba } from '../../utils/testAppearance';

type AnswerState = 'idle' | 'correct' | 'incorrect';

interface TestQuestionScreenProps {
  currentQuestion: TestQuestion;
  displayedAnswers: QuestionAnswer[];
  currentQuestionIndex: number;
  totalQuestions: number;
  score: number;
  progress: number;
  appearance: TestAppearance;
  pageBackgroundStyle: CSSProperties;
  accentGradientStyle: CSSProperties;
  accentColor: string;
  selectedAnswer: string | null;
  answerState: AnswerState;
  showExplanation: boolean;
  shouldRevealCorrectAnswer: boolean;
  effectiveRevealPolicy: RevealPolicy;
  attemptCount: number;
  onAnswer: (answerId: string) => void;
  onNext: () => void;
  onRetry: () => void;
}

function shuffleArray<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function renderQuestionHeading(text: string) {
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
}

export function TestQuestionScreen({
  currentQuestion,
  displayedAnswers,
  currentQuestionIndex,
  totalQuestions,
  score,
  progress,
  appearance,
  pageBackgroundStyle,
  accentGradientStyle,
  accentColor,
  selectedAnswer,
  answerState,
  showExplanation,
  shouldRevealCorrectAnswer,
  effectiveRevealPolicy,
  attemptCount,
  onAnswer,
  onNext,
  onRetry,
}: TestQuestionScreenProps) {
  const canRetry = !shouldRevealCorrectAnswer &&
    answerState === 'incorrect' &&
    effectiveRevealPolicy.mode === 'after_attempts' &&
    attemptCount < effectiveRevealPolicy.attempts;

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
                  onClick={() => onAnswer(answer.id)}
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
              {canRetry ? (
                <button
                  onClick={onRetry}
                  style={accentGradientStyle}
                  className="mt-6 w-full text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg transform hover:scale-105 transition-all duration-300"
                >
                  Попробовать ещё раз
                </button>
              ) : (
                <button
                  onClick={onNext}
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
