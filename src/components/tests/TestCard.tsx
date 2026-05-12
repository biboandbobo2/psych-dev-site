import { Link } from 'react-router-dom';
import type { CSSProperties } from 'react';
import { mergeAppearance, createGradient } from '../../utils/testAppearance';
import { formatLevelLabel, type TestChain } from '../../utils/testChainHelpers';
import type { TestAttemptSummary } from '../../types/testResults';

interface TestCardProps {
  chain: TestChain;
  testUnlockStatus: Record<string, boolean>;
  resultsByTestId?: Map<string, TestAttemptSummary>;
  className?: string;
}

function BestResultBadge({
  summary,
  passingThreshold,
}: {
  summary: TestAttemptSummary | undefined;
  passingThreshold: number;
}) {
  if (!summary) return null;
  const passed = summary.bestPercentage >= passingThreshold;
  const tone = passed
    ? 'text-emerald-700 bg-emerald-50'
    : 'text-amber-700 bg-amber-50';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}
      title={`Лучший результат из ${summary.attempts} попыток`}
    >
      <span aria-hidden>{passed ? '✓' : '•'}</span>
      <span>{Math.round(summary.bestPercentage)}%</span>
    </span>
  );
}

export function TestCard({
  chain,
  testUnlockStatus,
  resultsByTestId,
  className = '',
}: TestCardProps) {
  const { root, levels } = chain;
  const appearance = mergeAppearance(root.appearance);

  // Извлечь название (часть до ':')
  const titleText = root.title.split(':')[0]?.trim() || root.title;
  const description = appearance.introDescription || '';

  const rootUnlocked = testUnlockStatus[root.id] ?? true;

  // Стили
  const iconGradientStyle: CSSProperties = {
    backgroundImage: createGradient(
      appearance.accentGradientFrom,
      appearance.accentGradientTo,
      appearance.resolvedTheme?.primary
    ),
  };

  const badgeGradientStyle: CSSProperties = {
    backgroundImage: createGradient(
      appearance.badgeGradientFrom ?? appearance.accentGradientFrom,
      appearance.badgeGradientTo ?? appearance.accentGradientTo,
      appearance.resolvedTheme?.badge
    ),
  };

  const badgeLabel = appearance.badgeLabel?.trim();
  const showBadge = Boolean(badgeLabel);

  return (
    <div
      className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border border-blue-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-lg min-h-[280px] ${className}`}
    >
      <div className="flex items-start gap-4">
        {/* Иконка */}
        <div
          className="flex h-14 w-14 items-center justify-center rounded-xl text-2xl text-white shadow"
          style={iconGradientStyle}
        >
          {appearance.introIcon || '📖'}
        </div>

        <div className="flex-1 flex flex-col gap-2">
          {/* Бейдж */}
          {showBadge && (
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <span className="inline-flex items-center gap-1 rounded-full px-3 py-1" style={badgeGradientStyle}>
                {appearance.badgeIcon && <span>{appearance.badgeIcon}</span>}
                <span>{badgeLabel}</span>
              </span>
            </div>
          )}

          {/* Название */}
          {rootUnlocked ? (
            <Link
              to={`/tests/dynamic/${root.id}`}
              className={`text-left font-semibold text-gray-900 ${levels.length === 0 ? 'text-xl' : 'text-lg'} no-underline hover:no-underline focus-visible:no-underline transition-colors`}
            >
              {titleText}
            </Link>
          ) : (
            <div className={`font-semibold text-gray-900 ${levels.length === 0 ? 'text-xl' : 'text-lg'}`}>
              {titleText}
            </div>
          )}

          {/* Описание */}
          {description && (
            <p className={`${levels.length === 0 ? 'text-base' : 'text-sm'} text-gray-600 leading-snug line-clamp-3`}>
              {description}
            </p>
          )}

          {/* Метаданные */}
          <div className="mt-auto flex flex-wrap items-center gap-4 text-xs font-medium text-gray-500">
            <span className="flex items-center gap-1">
              <span>📋</span>
              <span>{root.questionCount} вопросов</span>
            </span>
            {levels.length > 0 && (
              <span className="flex items-center gap-1">
                <span>🔥</span>
                <span>{levels.length} уровня</span>
              </span>
            )}
            <BestResultBadge
              summary={resultsByTestId?.get(root.id)}
              passingThreshold={root.requiredPercentage ?? 70}
            />
          </div>
        </div>
      </div>

      {/* Уровни */}
      {levels.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {levels.map((level, idx) => {
            const label = formatLevelLabel(level, idx + 1);
            const unlocked = testUnlockStatus[level.id] ?? false;

            if (unlocked) {
              return (
                <Link
                  key={level.id}
                  to={`/tests/dynamic/${level.id}`}
                  className="flex items-center justify-between rounded-lg border-2 border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-700 transition-all hover:border-blue-400 hover:bg-blue-100"
                >
                  <span>{label}</span>
                  <span className="flex items-center gap-2">
                    <BestResultBadge
                      summary={resultsByTestId?.get(level.id)}
                      passingThreshold={level.requiredPercentage ?? 70}
                    />
                    <span className="text-xs text-blue-500">→</span>
                  </span>
                </Link>
              );
            }

            return (
              <div
                key={level.id}
                className="flex items-center justify-between rounded-lg border-2 border-gray-200 bg-gray-50 p-3 text-sm font-semibold text-gray-400"
              >
                <span>{label}</span>
                <span className="text-xs text-gray-400">🔒</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
