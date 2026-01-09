/**
 * Утилиты для работы с массивами
 */

/**
 * Перемешивает массив случайным образом (Fisher-Yates shuffle)
 * Не мутирует исходный массив
 */
export function shuffleArray<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Перемешивает массив детерминированно на основе seed (Linear Congruential Generator)
 * Один и тот же seed всегда даёт один и тот же результат
 * Используется для стабильного перемешивания в preview
 */
export function shuffleArraySeeded<T>(items: T[], seed: number): T[] {
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
