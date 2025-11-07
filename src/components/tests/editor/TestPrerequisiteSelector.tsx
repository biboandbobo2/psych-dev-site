import { useMemo } from 'react';
import type { Test } from '../../../types/tests';

interface TestPrerequisiteSelectorProps {
  prerequisiteTestId?: string;
  requiredPercentage: number;
  existingTests: Test[];
  currentTestId?: string;
  onPrerequisiteChange: (testId: string | undefined) => void;
  onPercentageChange: (percentage: number) => void;
}

export function TestPrerequisiteSelector({
  prerequisiteTestId,
  requiredPercentage,
  existingTests,
  currentTestId,
  onPrerequisiteChange,
  onPercentageChange,
}: TestPrerequisiteSelectorProps) {
  // Фильтровать тесты: исключить текущий и уже используемые
  const availableTests = useMemo(() => {
    const usedIds = new Set(
      existingTests
        .filter((t) => t.prerequisiteTestId && t.id !== currentTestId) // Исключаем текущий тест
        .map((t) => t.prerequisiteTestId)
    );

    return existingTests.filter(
      (t) => t.id !== currentTestId && !usedIds.has(t.id)
    );
  }, [existingTests, currentTestId]);

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Требования доступа</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Требуется пройти тест (опционально)
        </label>
        <select
          value={prerequisiteTestId || ''}
          onChange={(e) =>
            onPrerequisiteChange(e.target.value || undefined)
          }
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Нет (тест доступен сразу)</option>
          {availableTests.map((test) => (
            <option key={test.id} value={test.id}>
              {test.title}
            </option>
          ))}
        </select>
        <p className="text-sm text-gray-500 mt-1">
          Если выбран тест, пользователь должен сначала пройти его
        </p>
      </div>

      {prerequisiteTestId && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Требуемый процент для разблокировки
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="50"
              max="100"
              step="5"
              value={requiredPercentage}
              onChange={(e) => onPercentageChange(parseInt(e.target.value))}
              className="flex-1"
            />
            <span className="text-lg font-semibold w-16 text-right">
              {requiredPercentage}%
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Пользователь должен набрать минимум {requiredPercentage}% на
            предыдущем тесте
          </p>
        </div>
      )}
    </div>
  );
}
