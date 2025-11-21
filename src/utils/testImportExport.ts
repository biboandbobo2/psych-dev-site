import type { Test, TestQuestion } from '../types/tests';
import {
  MIN_QUESTION_ANSWERS,
  MAX_QUESTION_ANSWERS,
  DEFAULT_REVEAL_POLICY,
} from '../types/tests';

/**
 * Экспорт целого теста в JSON
 */
export function exportTestToJson(test: Test): string {
  const exportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    test: {
      title: test.title,
      rubric: test.rubric,
      prerequisiteTestId: test.prerequisiteTestId,
      questionCount: test.questionCount,
      requiredPercentage: test.requiredPercentage,
      defaultRevealPolicy: test.defaultRevealPolicy,
      appearance: test.appearance,
      questions: test.questions,
    },
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Экспорт вопросов в JSON
 */
export function exportQuestionsToJson(questions: TestQuestion[]): string {
  const exportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    questions,
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Валидация структуры теста
 */
function validateTestStructure(data: any): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Некорректный формат JSON' };
  }

  if (!data.test && !data.questions) {
    return { valid: false, error: 'Отсутствуют данные теста или вопросов' };
  }

  if (data.test) {
    if (!data.test.title || typeof data.test.title !== 'string') {
      return { valid: false, error: 'Отсутствует название теста' };
    }

    if (!Array.isArray(data.test.questions)) {
      return { valid: false, error: 'Отсутствуют вопросы' };
    }

    if (data.test.questions.length === 0) {
      return { valid: false, error: 'Тест должен содержать хотя бы один вопрос' };
    }
  }

  if (data.questions && !Array.isArray(data.questions)) {
    return { valid: false, error: 'Вопросы должны быть массивом' };
  }

  return { valid: true };
}

/**
 * Нормализация вопроса из импортированных данных
 */
function normalizeImportedQuestion(rawQuestion: any, index: number): TestQuestion {
  const questionId = rawQuestion.id || `question-${Date.now()}-${index}`;

  // Нормализуем варианты ответов
  let answers = [];
  if (Array.isArray(rawQuestion.answers)) {
    answers = rawQuestion.answers.slice(0, MAX_QUESTION_ANSWERS).map((answer: any, idx: number) => ({
      id: answer?.id || `${questionId}-answer-${idx + 1}`,
      text: answer?.text || '',
    }));
  }

  // Если answers нет, но есть старый формат options
  if (answers.length < MIN_QUESTION_ANSWERS && Array.isArray(rawQuestion.options)) {
    answers = rawQuestion.options.slice(0, MAX_QUESTION_ANSWERS).map((option: any, idx: number) => ({
      id: `${questionId}-answer-${idx + 1}`,
      text: typeof option === 'string' ? option : '',
    }));
  }

  // Если всё ещё мало вариантов, добавляем пустые
  while (answers.length < MIN_QUESTION_ANSWERS) {
    answers.push({
      id: `${questionId}-answer-${answers.length + 1}`,
      text: '',
    });
  }

  // Определяем правильный ответ
  let correctAnswerId: string | null = null;
  if (typeof rawQuestion.correctAnswerId === 'string') {
    correctAnswerId = answers.find((a: any) => a.id === rawQuestion.correctAnswerId)?.id || null;
  } else if (typeof rawQuestion.correctOptionIndex === 'number' && rawQuestion.correctOptionIndex >= 0 && rawQuestion.correctOptionIndex < answers.length) {
    correctAnswerId = answers[rawQuestion.correctOptionIndex].id;
  }

  // Нормализуем reveal policy
  let revealPolicy = DEFAULT_REVEAL_POLICY;
  if (rawQuestion.revealPolicy && typeof rawQuestion.revealPolicy === 'object') {
    if (rawQuestion.revealPolicy.mode === 'after_attempts' && typeof rawQuestion.revealPolicy.attempts === 'number') {
      revealPolicy = {
        mode: 'after_attempts',
        attempts: Math.max(1, Math.min(3, rawQuestion.revealPolicy.attempts)),
      };
    } else if (['never', 'immediately', 'after_test'].includes(rawQuestion.revealPolicy.mode)) {
      revealPolicy = { mode: rawQuestion.revealPolicy.mode };
    }
  }

  return {
    id: questionId,
    questionText: rawQuestion.questionText || '',
    answers,
    correctAnswerId,
    shuffleAnswers: typeof rawQuestion.shuffleAnswers === 'boolean' ? rawQuestion.shuffleAnswers : true,
    revealPolicy,
    revealPolicySource: rawQuestion.revealPolicySource === 'inherit' ? 'inherit' : rawQuestion.revealPolicySource === 'custom' ? 'custom' : undefined,
    explanation: rawQuestion.explanation || undefined,
    customRightMsg: rawQuestion.customRightMsg || rawQuestion.successMessage || undefined,
    customWrongMsg: rawQuestion.customWrongMsg || rawQuestion.failureMessage || undefined,
    resourcesRight: Array.isArray(rawQuestion.resourcesRight) ? rawQuestion.resourcesRight : Array.isArray(rawQuestion.successResources) ? rawQuestion.successResources : undefined,
    resourcesWrong: Array.isArray(rawQuestion.resourcesWrong) ? rawQuestion.resourcesWrong : Array.isArray(rawQuestion.failureResources) ? rawQuestion.failureResources : undefined,
  };
}

/**
 * Импорт теста из JSON
 */
export function importTestFromJson(jsonString: string): { success: boolean; data?: Partial<Test>; questions?: TestQuestion[]; error?: string } {
  try {
    const parsed = JSON.parse(jsonString);
    const validation = validateTestStructure(parsed);

    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Если это полный тест
    if (parsed.test) {
      const normalizedQuestions = parsed.test.questions.map((q: any, idx: number) =>
        normalizeImportedQuestion(q, idx)
      );

      return {
        success: true,
        data: {
          title: parsed.test.title,
          rubric: parsed.test.rubric || 'full-course',
          prerequisiteTestId: parsed.test.prerequisiteTestId,
          requiredPercentage: parsed.test.requiredPercentage,
          defaultRevealPolicy: parsed.test.defaultRevealPolicy,
          appearance: parsed.test.appearance,
          questionCount: normalizedQuestions.length,
        },
        questions: normalizedQuestions,
      };
    }

    // Если это только вопросы
    if (parsed.questions && Array.isArray(parsed.questions)) {
      const normalizedQuestions = parsed.questions.map((q: any, idx: number) =>
        normalizeImportedQuestion(q, idx)
      );

      return {
        success: true,
        questions: normalizedQuestions,
      };
    }

    return { success: false, error: 'Неизвестный формат данных' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Ошибка парсинга JSON'
    };
  }
}

/**
 * Скачивание JSON файла
 */
export function downloadJson(jsonString: string, filename: string) {
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Чтение файла как текст
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        resolve(event.target.result as string);
      } else {
        reject(new Error('Не удалось прочитать файл'));
      }
    };
    reader.onerror = () => reject(new Error('Ошибка чтения файла'));
    reader.readAsText(file);
  });
}

/**
 * Генерация шаблона для целого теста с инструкциями
 */
export function generateTestTemplate(): string {
  const template = {
    _instructions: {
      ru: 'Это шаблон для создания теста. Удалите это поле перед загрузкой.',
      en: 'This is a template for creating a test. Remove this field before uploading.',
      guide: {
        title: 'Название теста (обязательно, макс 20 символов)',
        course: 'Курс: "development" (психология развития), "clinical" (клиническая), "general" (общая)',
        rubric: 'Рубрика: "full-course" (весь курс) или ID занятия (период для development, тема для clinical/general)',
        prerequisiteTestId: 'ID теста-предшественника (опционально)',
        requiredPercentage: 'Процент правильных ответов для прохождения (0-100)',
        questionCount: 'Количество вопросов (автоматически вычисляется)',
        defaultRevealPolicy: {
          mode: 'never | immediately | after_attempts | after_test',
          attempts: 'Количество попыток (только для after_attempts)',
        },
        appearance: {
          introIcon: 'Эмодзи для иконки теста',
          introTitle: 'Заголовок на экране приветствия',
          introDescription: 'Описание теста',
          bulletPoints: 'Массив пунктов-подсказок',
          badgeIcon: 'Эмодзи для значка',
          badgeLabel: 'Текст значка',
        },
        questions: {
          questionText: 'Текст вопроса (обязательно)',
          answers: 'Массив вариантов ответа (минимум 2, максимум 6)',
          correctAnswerId: 'ID правильного ответа',
          shuffleAnswers: 'Перемешивать ли варианты (true/false)',
          revealPolicy: 'Политика показа правильного ответа (наследуется от теста если не указана)',
          explanation: 'Объяснение правильного ответа',
          customRightMsg: 'Сообщение при правильном ответе',
          customWrongMsg: 'Сообщение при неправильном ответе',
        },
      },
    },
    version: '1.0',
    exportedAt: new Date().toISOString(),
    test: {
      title: 'Название теста',
      course: 'development',
      rubric: 'full-course',
      prerequisiteTestId: undefined,
      questionCount: 3,
      requiredPercentage: 70,
      defaultRevealPolicy: {
        mode: 'after_attempts',
        attempts: 2,
      },
      appearance: {
        introIcon: '🎯',
        introTitle: 'Заголовок теста',
        introDescription: 'Описание теста для студентов',
        bulletPoints: ['Подсказка 1', 'Подсказка 2', 'Подсказка 3'],
        badgeIcon: '🏆',
        badgeLabel: 'Значок за прохождение',
      },
      questions: [
        {
          id: 'q1',
          questionText: 'Вопрос 1?',
          answers: [
            { id: 'q1-a1', text: 'Вариант 1' },
            { id: 'q1-a2', text: 'Вариант 2 (правильный)' },
            { id: 'q1-a3', text: 'Вариант 3' },
          ],
          correctAnswerId: 'q1-a2',
          shuffleAnswers: true,
          explanation: 'Объяснение почему вариант 2 правильный',
          customRightMsg: 'Отлично! Вы правы.',
          customWrongMsg: 'Попробуйте ещё раз.',
        },
        {
          id: 'q2',
          questionText: 'Вопрос 2?',
          answers: [
            { id: 'q2-a1', text: 'Вариант А' },
            { id: 'q2-a2', text: 'Вариант Б (правильный)' },
          ],
          correctAnswerId: 'q2-a2',
          shuffleAnswers: true,
          revealPolicy: {
            mode: 'immediately',
          },
        },
        {
          id: 'q3',
          questionText: 'Вопрос 3?',
          answers: [
            { id: 'q3-a1', text: 'Да (правильный)' },
            { id: 'q3-a2', text: 'Нет' },
          ],
          correctAnswerId: 'q3-a1',
          shuffleAnswers: false,
        },
      ],
    },
  };

  return JSON.stringify(template, null, 2);
}

/**
 * Генерация шаблона для вопросов с инструкциями
 */
export function generateQuestionsTemplate(): string {
  const template = {
    _instructions: {
      ru: 'Это шаблон для импорта вопросов. Удалите это поле перед загрузкой.',
      en: 'This is a template for importing questions. Remove this field before uploading.',
      guide: {
        questionText: 'Текст вопроса (обязательно)',
        answers: 'Массив вариантов ответа (минимум 2, максимум 6)',
        id: 'Уникальный ID ответа',
        text: 'Текст варианта ответа',
        correctAnswerId: 'ID правильного ответа из массива answers',
        shuffleAnswers: 'Перемешивать ли варианты при показе (true/false)',
        revealPolicy: {
          mode: 'never | immediately | after_attempts | after_test',
          attempts: 'Количество попыток (только для after_attempts)',
        },
        explanation: 'Объяснение правильного ответа (опционально)',
        customRightMsg: 'Сообщение при правильном ответе (опционально)',
        customWrongMsg: 'Сообщение при неправильном ответе (опционально)',
      },
    },
    version: '1.0',
    exportedAt: new Date().toISOString(),
    questions: [
      {
        id: 'question-1',
        questionText: 'Какой вариант правильный?',
        answers: [
          { id: 'q1-answer-1', text: 'Вариант 1' },
          { id: 'q1-answer-2', text: 'Вариант 2 (правильный)' },
          { id: 'q1-answer-3', text: 'Вариант 3' },
        ],
        correctAnswerId: 'q1-answer-2',
        shuffleAnswers: true,
        revealPolicy: {
          mode: 'after_attempts',
          attempts: 2,
        },
        explanation: 'Вариант 2 правильный, потому что...',
        customRightMsg: 'Правильно!',
        customWrongMsg: 'Неверно, попробуйте снова.',
      },
      {
        id: 'question-2',
        questionText: 'Да или нет?',
        answers: [
          { id: 'q2-answer-1', text: 'Да (правильный)' },
          { id: 'q2-answer-2', text: 'Нет' },
        ],
        correctAnswerId: 'q2-answer-1',
        shuffleAnswers: false,
        revealPolicy: {
          mode: 'immediately',
        },
      },
    ],
  };

  return JSON.stringify(template, null, 2);
}
