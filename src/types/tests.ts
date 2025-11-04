import type { AgeRange } from '../hooks/useNotes';
import type { ThemeSettings, DerivedTheme } from './themes';

/**
 * Рубрика теста - на что направлен тест
 */
export type TestRubric =
  | 'full-course' // Курс целиком
  | AgeRange; // Конкретный возрастной период

/**
 * Статус публикации теста
 */
export type TestStatus = 'draft' | 'published' | 'unpublished';

/**
 * Вопрос в тесте
 */
export interface TestResource {
  title: string;
  url: string;
}

export interface TestAppearance {
  introIcon?: string; // Эмодзи или пиктограмма для стартового экрана
  introDescription?: string; // Краткое описание перед началом
  badgeIcon?: string; // Иконка бейджа уровня
  badgeLabel?: string; // Надпись на бейдже
  badgeGradientFrom?: string; // Цвет градиента бейджа (начало)
  badgeGradientTo?: string; // Цвет градиента бейджа (конец)
  backgroundGradientFrom?: string; // Цвет фона страницы (начало градиента)
  backgroundGradientTo?: string; // Цвет фона страницы (конец градиента)
  accentGradientFrom?: string; // Цвет акцентного градиента (кнопки, прогресс)
  accentGradientTo?: string; // Цвет акцентного градиента (конец)
  bulletPoints?: string[]; // Список особенностей/правил
  theme?: ThemeSettings; // Новая система оформления
  resolvedTheme?: DerivedTheme; // Вычисленная тема для предпросмотра
}

export interface TestQuestion {
  id: string; // UUID вопроса
  questionText: string; // Текст вопроса
  options: [string, string, string, string]; // Ровно 4 варианта ответа
  correctOptionIndex: number; // Индекс правильного ответа (0-3)
  successMessage?: string; // Кастомное сообщение при правильном ответе
  failureMessage?: string; // Кастомное сообщение при неправильном ответе
  successResources?: TestResource[]; // Рекомендуемые материалы при правильном ответе
  failureResources?: TestResource[]; // Материалы при неправильном ответе
}

/**
 * Определение теста
 */
export interface Test {
  id: string; // UUID теста
  title: string; // Название теста
  rubric: TestRubric; // Рубрика (курс целиком или период)
  prerequisiteTestId?: string; // ID теста-предшественника (если это следующий уровень)
  questionCount: number; // Количество вопросов (1-20)
  questions: TestQuestion[]; // Массив вопросов
  status: TestStatus; // Статус публикации
  requiredPercentage?: number; // Порог прохождения для открытия следующего уровня
  appearance?: TestAppearance; // Настройки внешнего вида
  createdAt: Date; // Дата создания
  updatedAt: Date; // Дата последнего обновления
  createdBy: string; // UID создателя (admin)
}

/**
 * Данные для создания нового теста
 */
export type CreateTestData = Omit<Test, 'id' | 'createdAt' | 'updatedAt' | 'questions'>;

/**
 * Данные для обновления существующего теста
 */
export type UpdateTestData = Partial<Omit<Test, 'id' | 'createdAt' | 'createdBy'>>;
