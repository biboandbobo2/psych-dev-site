import { useState, useEffect, useCallback } from 'react';
import { getTestById } from '../../../../lib/tests';
import type { Test, TestQuestion, TestRubric } from '../../../../types/tests';
import { DEFAULT_REVEAL_POLICY } from '../../../../types/tests';
import { importTestFromJson, readFileAsText, generateQuestionsTemplate, downloadJson } from '../../../../utils/testImportExport';

interface ImportedData {
  data?: Partial<Test>;
  questions?: TestQuestion[];
}

interface UseTestEditorFormOptions {
  testId: string | null;
  importedData?: ImportedData | null;
}

export function createEmptyQuestion(): TestQuestion {
  return {
    id: crypto.randomUUID(),
    questionText: '',
    answers: Array.from({ length: 4 }, () => ({
      id: crypto.randomUUID(),
      text: '',
    })),
    correctAnswerId: null,
    shuffleAnswers: true,
    revealPolicy: { ...DEFAULT_REVEAL_POLICY },
  };
}

export function useTestEditorForm({ testId, importedData }: UseTestEditorFormOptions) {
  // Basic fields
  const [title, setTitle] = useState('');
  const [rubric, setRubric] = useState<TestRubric>('full-course');
  const [questionCount, setQuestionCount] = useState(10);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [currentStatus, setCurrentStatus] = useState<'draft' | 'published' | 'unpublished'>('draft');

  // Input validation
  const [questionCountInput, setQuestionCountInput] = useState<string>('10');
  const [questionCountError, setQuestionCountError] = useState<string | null>(null);

  // Loading state
  const [loading, setLoading] = useState(false);

  // Apply question count with normalization
  const applyQuestionCount = useCallback((target: number) => {
    const normalized = Math.max(1, Math.min(20, Math.floor(target)));
    setQuestionCount(normalized);
    setQuestionCountInput(String(normalized));
    setQuestionCountError(null);
    setQuestions((prev) => {
      if (normalized > prev.length) {
        const additionalQuestions: TestQuestion[] = Array.from(
          { length: normalized - prev.length },
          () => createEmptyQuestion()
        );
        return [...prev, ...additionalQuestions];
      }
      if (normalized < prev.length) {
        return prev.slice(0, normalized);
      }
      return prev;
    });
  }, []);

  // Question count input handler
  const handleQuestionCountInputChange = useCallback((value: string) => {
    setQuestionCountInput(value);
    if (!value) {
      setQuestionCountError('Введите количество вопросов от 1 до 20');
      return;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
      setQuestionCountError('Введите целое число от 1 до 20');
      return;
    }
    if (parsed < 1 || parsed > 20) {
      setQuestionCountError('Допустимо от 1 до 20 вопросов');
      return;
    }
    setQuestionCountError(null);
    applyQuestionCount(parsed);
  }, [applyQuestionCount]);

  // Question handlers
  const handleQuestionChange = useCallback((index: number, updatedQuestion: TestQuestion) => {
    const newQuestions = [...questions];
    newQuestions[index] = updatedQuestion;
    setQuestions(newQuestions);
  }, [questions]);

  const handleQuestionDelete = useCallback((index: number) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    setQuestions(newQuestions);
    setQuestionCount(newQuestions.length);
    setQuestionCountInput(String(newQuestions.length));
    setQuestionCountError(null);
  }, [questions]);

  const handleAddQuestion = useCallback(() => {
    if (questions.length >= 20) {
      alert('Максимум 20 вопросов');
      return;
    }
    const newQuestion = createEmptyQuestion();
    setQuestions([...questions, newQuestion]);
    setQuestionCount(questions.length + 1);
    setQuestionCountInput(String(questions.length + 1));
    setQuestionCountError(null);
  }, [questions]);

  const handleImportQuestions = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const content = await readFileAsText(file);
      const result = importTestFromJson(content);

      if (!result.success) {
        alert(result.error || 'Ошибка импорта вопросов');
        return;
      }

      if (!result.questions || result.questions.length === 0) {
        alert('В файле не найдены вопросы для импорта');
        return;
      }

      const totalQuestions = questions.length + result.questions.length;
      if (totalQuestions > 20) {
        const canAdd = 20 - questions.length;
        if (canAdd <= 0) {
          alert('Невозможно добавить вопросы: достигнут лимит в 20 вопросов');
          return;
        }
        const confirmAdd = window.confirm(
          `Импортировано ${result.questions.length} вопросов, но можно добавить только ${canAdd}. Добавить первые ${canAdd} вопросов?`
        );
        if (!confirmAdd) return;

        const questionsToAdd = result.questions.slice(0, canAdd);
        setQuestions([...questions, ...questionsToAdd]);
        setQuestionCount(questions.length + questionsToAdd.length);
        setQuestionCountInput(String(questions.length + questionsToAdd.length));
        alert(`Добавлено ${questionsToAdd.length} вопросов`);
      } else {
        setQuestions([...questions, ...result.questions]);
        setQuestionCount(totalQuestions);
        setQuestionCountInput(String(totalQuestions));
        alert(`Добавлено ${result.questions.length} вопросов`);
      }
    } catch (error) {
      alert('Не удалось прочитать файл');
    }
  }, [questions]);

  const handleDownloadQuestionsTemplate = useCallback(() => {
    const template = generateQuestionsTemplate();
    const filename = `questions-template-${new Date().toISOString().split('T')[0]}.json`;
    downloadJson(template, filename);
  }, []);

  // Load existing test
  useEffect(() => {
    if (!testId) return;

    const loadTest = async () => {
      try {
        setLoading(true);
        const test = await getTestById(testId);
        if (test) {
          setTitle(test.title);
          setRubric(test.rubric);
          setQuestionCount(test.questionCount);
          setQuestionCountInput(String(test.questionCount));
          setQuestionCountError(null);
          setQuestions(test.questions);
          setCurrentStatus(test.status);
        }
      } catch (error) {
        console.error('Ошибка загрузки теста:', error);
        alert('Не удалось загрузить тест');
      } finally {
        setLoading(false);
      }
    };

    loadTest();
  }, [testId]);

  // Load imported data
  useEffect(() => {
    if (!testId && importedData) {
      const { data, questions: importedQuestions } = importedData;

      if (data) {
        if (data.title) setTitle(data.title);
        if (data.rubric) setRubric(data.rubric);
      }

      if (importedQuestions && importedQuestions.length > 0) {
        setQuestionCount(importedQuestions.length);
        setQuestionCountInput(String(importedQuestions.length));
        setQuestions(importedQuestions);
      }
    }
  }, [importedData, testId]);

  // Initialize empty questions when needed
  useEffect(() => {
    if (!importedData && questions.length === 0 && questionCount > 0) {
      const emptyQuestions: TestQuestion[] = Array.from({ length: questionCount }, () =>
        createEmptyQuestion()
      );
      setQuestions(emptyQuestions);
    }
  }, [questionCount, questions.length, importedData]);

  const TITLE_MAX = 20;
  const titleHint = `До ${TITLE_MAX} символов. Осталось ${Math.max(0, TITLE_MAX - title.length)}.`;
  const questionHint = `Сейчас добавлено ${questionCount} вопрос(ов).`;

  return {
    // State
    form: {
      title,
      rubric,
      questionCount,
      questions,
      currentStatus,
      questionCountInput,
      questionCountError,
      titleMaxLength: TITLE_MAX,
      titleHint,
      questionHint,
    },
    loading,
    // Setters
    setters: {
      setTitle,
      setRubric,
      setCurrentStatus,
    },
    // Handlers
    handlers: {
      handleQuestionCountInputChange,
      handleQuestionChange,
      handleQuestionDelete,
      handleAddQuestion,
      handleImportQuestions,
      handleDownloadQuestionsTemplate,
    },
  };
}
