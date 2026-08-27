import type { TestSummary } from '../types/tests';

/**
 * Интерфейс цепочки тестов
 */
export interface TestChain {
  root: TestSummary;      // Корневой тест (без prerequisite)
  levels: TestSummary[];  // Уровни (с prerequisiteTestId)
}

/**
 * Максимальная длина цепочки
 */
export const MAX_CHAIN_LENGTH = 3;

/**
 * Очищает название уровня от префикса "Уровень N"
 */
export function cleanLevelLabel(text: string): string {
  return text
    .replace(/^Уровень\s*\d+\s*[-–—:]?\s*/i, '')
    .trim();
}

/**
 * Форматирует название уровня из title теста
 * Извлекает часть после ':' или возвращает очищенный title
 */
export function formatLevelLabel(test: TestSummary, index: number): string {
  const levelNumber = index + 1;
  const parts = test.title.split(':');

  if (parts.length > 1) {
    const suffix = cleanLevelLabel(parts.slice(1).join(':').trim());
    if (suffix) {
      return suffix;
    }
  }

  return cleanLevelLabel(test.title) || `Уровень ${levelNumber}`;
}

/**
 * Получает метаданные теста по рубрике
 */
export function getTestMetadata(rubric: string): {
  icon: string;
  color: string;
  description: string;
} {
  if (rubric === 'full-course') {
    return {
      icon: '🎓',
      color: 'from-indigo-500 to-indigo-600',
      description: 'Тест по всему курсу психологии развития',
    };
  }

  // Для возрастных периодов
  // Импортировать AGE_RANGE_LABELS здесь
  return {
    icon: '📖',
    color: 'from-teal-500 to-teal-600',
    description: 'Тематический тест',
  };
}

/**
 * Строит цепочки тестов из массива
 * Группирует тесты по prerequisite связям
 */
export function buildTestChains(tests: TestSummary[]): TestChain[] {
  // 1. Создать Map для быстрого доступа
  const map = new Map<string, TestSummary>();
  for (const test of tests) {
    map.set(test.id, test);
  }

  // 2. Найти корневые тесты
  const roots: TestSummary[] = [];
  for (const test of tests) {
    if (!test.prerequisiteTestId || !map.has(test.prerequisiteTestId)) {
      roots.push(test);
    }
  }

  // 3. Построить цепочки
  const chains: TestChain[] = [];
  for (const root of roots) {
    const visited = new Set<string>();
    visited.add(root.id);

    let current: TestSummary | undefined = root;
    const levels: TestSummary[] = [];

    while (current && levels.length < MAX_CHAIN_LENGTH) {
      const successors = tests.filter(
        (t) => t.prerequisiteTestId === current!.id && !visited.has(t.id)
      );

      if (successors.length === 0) break;

      const next = successors[0];
      visited.add(next.id);
      levels.push(next);
      current = next;
    }

    chains.push({ root, levels });
  }

  return chains;
}
