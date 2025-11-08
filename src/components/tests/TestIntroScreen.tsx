import { type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { Test, TestAppearance } from '../../types/tests';
import TestHistory from '../TestHistory';

interface TestIntroScreenProps {
  test: Test;
  appearance: TestAppearance;
  totalQuestions: number;
  backUrl: string;
  pageBackgroundStyle: CSSProperties;
  accentGradientStyle: CSSProperties;
  badgeGradientStyle: CSSProperties;
  infoBoxStyle: CSSProperties;
  accentColor: string;
  onStart: () => void;
  user: { uid: string } | null;
  testId: string;
}

export function TestIntroScreen({
  test,
  appearance,
  totalQuestions,
  backUrl,
  pageBackgroundStyle,
  accentGradientStyle,
  badgeGradientStyle,
  infoBoxStyle,
  accentColor,
  onStart,
  user,
  testId,
}: TestIntroScreenProps) {
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
              onClick={onStart}
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
