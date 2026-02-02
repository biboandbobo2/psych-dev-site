import type { AgeRange } from '../hooks/useNotes';
import type { ThemeSettings, DerivedTheme } from './themes';

/**
 * Типы основных курсов (встроенные)
 */
export type CoreCourseType = 'development' | 'clinical' | 'general';

/**
 * Тип курса (включая динамические)
 */
export type CourseType = CoreCourseType | (string & {});

/**
 * Рубрика теста - на что направлен тест
 * - 'full-course' - весь курс целиком
 * - AgeRange - возрастной период (для курса development)
 * - string - ID темы из clinical-topics или general-topics
 */
export type TestRubric = 'full-course' | AgeRange | string;

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

export type RevealPolicy =
  | { mode: 'never' }
  | { mode: 'after_attempts'; attempts: number }
  | { mode: 'after_test' }
  | { mode: 'immediately' };

export type QuestionRevealPolicySource = 'inherit' | 'custom';

export const DEFAULT_REVEAL_POLICY: RevealPolicy = { mode: 'after_test' };
export const MIN_QUESTION_ANSWERS = 2;
export const MAX_QUESTION_ANSWERS = 8;
export const DEFAULT_ANSWER_PRESETS = [4, 6, 8] as const;
export const MAX_REVEAL_ATTEMPTS = 3;

export interface QuestionAnswer {
  id: string;
  text: string;
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
  answers: QuestionAnswer[]; // 2..8 вариантов ответа
  correctAnswerId: string | null; // ID выбранного правильного ответа
  shuffleAnswers: boolean; // Перемешивать варианты при прохождении
  revealPolicy: RevealPolicy; // Политика показа правильного ответа
  revealPolicySource?: QuestionRevealPolicySource; // Наследовать политику теста или использовать свою
  explanation?: string; // Пояснение, показываемое при разрешённом показе
  customRightMsg?: string; // Кастомное сообщение при правильном ответе
  customWrongMsg?: string; // Кастомное сообщение при неправильном ответе
  resourcesRight?: TestResource[]; // Материалы при правильном ответе
  resourcesWrong?: TestResource[]; // Материалы при неправильном ответе
  imageUrl?: string; // URL картинки из Firebase Storage
  audioUrl?: string; // URL аудио из Firebase Storage
  videoUrl?: string; // URL видео (YouTube, Vimeo и т.д.)
}

/**
 * Определение теста
 */
export interface Test {
  id: string; // UUID теста
  title: string; // Название теста
  course: CourseType; // Курс (включая динамические)
  rubric: TestRubric; // Рубрика (курс целиком или период)
  prerequisiteTestId?: string; // ID теста-предшественника (если это следующий уровень)
  questionCount: number; // Количество вопросов (1-20)
  questions: TestQuestion[]; // Массив вопросов
  status: TestStatus; // Статус публикации
  requiredPercentage?: number; // Порог прохождения для открытия следующего уровня
  defaultRevealPolicy?: RevealPolicy; // Глобальная политика показа правильного ответа
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
