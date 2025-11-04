/**
 * Логика доступа к тестам с prerequisite
 */

import { getTestResults } from './testResults';

/**
 * Проверить, доступен ли тест для пользователя
 *
 * @param userId - ID пользователя
 * @param prerequisiteTestId - ID prerequisite теста (если есть)
 * @returns true если тест доступен, false если заблокирован
 */
export async function isTestUnlocked(
  userId: string,
  prerequisiteTestId?: string,
  requiredPercentage: number = 70
): Promise<boolean> {
  // Если нет prerequisite, тест доступен всем
  if (!prerequisiteTestId) {
    return true;
  }

  // Проверяем результаты prerequisite теста
  try {
    const results = await getTestResults(userId, prerequisiteTestId);

    // Если нет результатов, тест заблокирован
    if (results.length === 0) {
      return false;
    }

    // Проверяем, есть ли хотя бы один результат >= 70%
    const hasPassingScore = results.some((result) => result.percentage >= requiredPercentage);

    return hasPassingScore;
  } catch (error) {
    console.error('Ошибка проверки доступа к тесту:', error);
    return false;
  }
}

/**
 * Получить информацию о блокировке теста
 *
 * @param userId - ID пользователя
 * @param prerequisiteTestId - ID prerequisite теста
 * @returns Объект с информацией о блокировке
 */
export async function getTestLockInfo(
  userId: string,
  prerequisiteTestId: string,
  requiredPercentage: number = 70
): Promise<{
  isLocked: boolean;
  bestScore: number | null;
  attemptsCount: number;
}> {
  try {
    const results = await getTestResults(userId, prerequisiteTestId);

    if (results.length === 0) {
      return {
        isLocked: true,
        bestScore: null,
        attemptsCount: 0,
      };
    }

    const bestScore = Math.max(...results.map((r) => r.percentage));
    const isLocked = bestScore < requiredPercentage;

    return {
      isLocked,
      bestScore,
      attemptsCount: results.length,
    };
  } catch (error) {
    console.error('Ошибка получения информации о блокировке:', error);
    return {
      isLocked: true,
      bestScore: null,
      attemptsCount: 0,
    };
  }
}
