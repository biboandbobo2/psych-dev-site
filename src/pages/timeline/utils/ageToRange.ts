import type { AgeRange } from '../../../types/notes';

/**
 * Определяет возрастной период (AgeRange) по возрасту в годах
 * Если возраст на границе двух периодов, возвращает старший период
 */
export function ageToRange(age: number): AgeRange | null {
  // Пренатальный период - не применяется для событий таймлайна
  if (age < 0) return null;

  // Младенчество (0-1 год)
  if (age < 1) return 'infancy';

  // На границе 1 года: между infancy (0-1) и toddler (1-3)
  // Берём старший период - toddler
  if (age === 1) return 'toddler';

  // Раннее детство (1-3 года)
  if (age < 3) return 'toddler';

  // На границе 3 лет: между toddler (1-3) и preschool (3-7)
  // Берём старший период - preschool
  if (age === 3) return 'preschool';

  // Дошкольный возраст (3-7 лет)
  if (age < 7) return 'preschool';

  // На границе 7 лет: между preschool (3-7) и primary-school (7-10)
  // Берём старший период - primary-school
  if (age === 7) return 'primary-school';

  // Младший школьный возраст (7-10 лет)
  if (age < 10) return 'primary-school';

  // На границе 10 лет: между primary-school (7-10) и earlyAdolescence (10-13)
  // Берём старший период - earlyAdolescence
  if (age === 10) return 'earlyAdolescence';

  // Ранняя подростковость (10-13 лет)
  if (age < 13) return 'earlyAdolescence';

  // На границе 13 лет
  if (age === 13) return 'earlyAdolescence';

  // Подростковость (14-18 лет)
  if (age < 18) return 'adolescence';

  // На границе 18 лет
  if (age === 18) return 'adolescence';

  // Юность (19-22 года)
  if (age < 22) return 'emergingAdult';

  // На границе 22 лет
  if (age === 22) return 'earlyAdult';

  // Ранняя зрелость (22-40 лет)
  if (age < 40) return 'earlyAdult';

  // На границе 40 лет
  if (age === 40) return 'midlife';

  // Средняя зрелость (40-65 лет)
  if (age < 65) return 'midlife';

  // На границе 65 лет
  if (age === 65) return 'midlife';

  // Пожилой возраст (66-80 лет)
  if (age < 80) return 'lateAdult';

  // Долголетие (80+ лет)
  return 'oldestOld';
}
