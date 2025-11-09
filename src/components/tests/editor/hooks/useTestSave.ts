import { useState, useCallback } from 'react';
import { useAuth } from '../../../../auth/AuthProvider';
import {
  createTest,
  updateTest,
  updateTestQuestions,
  publishTest,
  unpublishTest,
  isTestTitleUnique,
} from '../../../../lib/tests';
import type { TestQuestion, TestAppearance, TestRubric } from '../../../../types/tests';
import { MIN_QUESTION_ANSWERS } from '../../../../types/tests';

interface FormData {
  title: string;
  rubric: TestRubric;
  questionCount: number;
  questions: TestQuestion[];
  currentStatus: 'draft' | 'published' | 'unpublished';
  questionCountError: string | null;
}

interface PrerequisiteData {
  isNextLevel: boolean;
  prerequisiteTestId?: string;
  requiredPercentage: number;
  previousTestError: string | null;
  thresholdError: string | null;
  canAttachPrerequisite: (targetId?: string) => boolean;
}

interface UseTestSaveOptions {
  testId: string | null;
  formData: FormData;
  prerequisiteData: PrerequisiteData;
  buildAppearancePayload: () => TestAppearance;
  onSaved: () => void;
}

export function useTestSave({
  testId,
  formData,
  prerequisiteData,
  buildAppearancePayload,
  onSaved,
}: UseTestSaveOptions) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  // Validation for publish
  const validateForPublish = useCallback((): boolean => {
    const { title, questions, questionCountError } = formData;
    const { isNextLevel, prerequisiteTestId, previousTestError, thresholdError, requiredPercentage } = prerequisiteData;

    if (!title.trim()) {
      alert('Введите название теста');
      return false;
    }

    if (questions.length === 0) {
      alert('Добавьте хотя бы один вопрос');
      return false;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText.trim()) {
        alert(`Вопрос ${i + 1}: заполните текст вопроса`);
        return false;
      }
      const filledAnswers = q.answers.filter((answer) => answer.text.trim().length > 0);
      if (filledAnswers.length < MIN_QUESTION_ANSWERS) {
        alert(
          `Вопрос ${i + 1}: заполните минимум ${MIN_QUESTION_ANSWERS} варианта ответа`
        );
        return false;
      }
      const correctAnswer = q.answers.find((answer) => answer.id === q.correctAnswerId);
      if (!correctAnswer || correctAnswer.text.trim().length === 0) {
        alert(`Вопрос ${i + 1}: выберите правильный ответ`);
        return false;
      }
    }

    if (questionCountError) {
      alert(questionCountError);
      return false;
    }

    if (isNextLevel) {
      if (!prerequisiteTestId) {
        alert('Выберите тест, после которого открывается этот уровень.');
        return false;
      }
      if (previousTestError) {
        alert(previousTestError);
        return false;
      }
      if (
        thresholdError ||
        Number.isNaN(requiredPercentage) ||
        requiredPercentage < 0 ||
        requiredPercentage > 100
      ) {
        alert('Укажите порог прохождения от 0 до 100%.');
        return false;
      }
    }

    return true;
  }, [formData, prerequisiteData]);

  // Save as draft
  const handleSaveDraft = useCallback(async () => {
    if (!user) {
      alert('Необходима авторизация');
      return;
    }

    const { title, rubric, questions, questionCountError, currentStatus } = formData;
    const { isNextLevel, prerequisiteTestId, requiredPercentage, previousTestError, thresholdError, canAttachPrerequisite } = prerequisiteData;

    if (!title.trim()) {
      alert('Введите название теста');
      return;
    }

    if (questionCountError) {
      alert(questionCountError);
      return;
    }

    // Check title uniqueness
    const isUnique = await isTestTitleUnique(title.trim(), testId || undefined);
    if (!isUnique) {
      alert('Тест с таким названием уже существует. Пожалуйста, выберите другое название.');
      return;
    }

    if (isNextLevel) {
      if (!prerequisiteTestId) {
        alert('Выберите тест, после которого открывается этот уровень.');
        return;
      }
      if (previousTestError) {
        alert(previousTestError);
        return;
      }
      if (
        thresholdError ||
        Number.isNaN(requiredPercentage) ||
        requiredPercentage < 0 ||
        requiredPercentage > 100
      ) {
        alert('Укажите порог прохождения от 0 до 100%.');
        return;
      }
    }

    if (isNextLevel && !canAttachPrerequisite(prerequisiteTestId)) {
      alert('Пока можно связать не больше трёх уровней в цепочке тестов.');
      return;
    }

    try {
      setSaving(true);
      const appearancePayload = buildAppearancePayload();

      if (testId) {
        // Update existing test
        await updateTest(testId, {
          title: title.trim(),
          rubric,
          prerequisiteTestId: isNextLevel ? prerequisiteTestId : undefined,
          questionCount: questions.length,
          requiredPercentage: isNextLevel ? requiredPercentage : undefined,
          appearance: appearancePayload,
        });
        await updateTestQuestions(testId, questions);
      } else {
        // Create new test
        const newTestId = await createTest(
          {
            title: title.trim(),
            rubric,
            prerequisiteTestId: isNextLevel ? prerequisiteTestId : undefined,
            questionCount: questions.length,
            status: 'draft',
            requiredPercentage: isNextLevel ? requiredPercentage : undefined,
            appearance: appearancePayload,
          },
          user.uid
        );
        await updateTestQuestions(newTestId, questions);
      }

      const message = currentStatus === 'draft' ? 'Тест сохранён как черновик' : 'Изменения сохранены';
      console.log(`✅ ${message}, возвращаемся к списку`);
      alert(message);
      onSaved();
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      alert('Не удалось сохранить тест');
    } finally {
      setSaving(false);
    }
  }, [user, testId, formData, prerequisiteData, buildAppearancePayload, onSaved]);

  // Unpublish
  const handleUnpublish = useCallback(async () => {
    if (!testId) {
      alert('Невозможно снять с публикации несохранённый тест');
      return;
    }

    if (!confirm('Снять тест с публикации? Студенты больше не смогут его проходить.')) {
      return;
    }

    try {
      setSaving(true);
      await unpublishTest(testId);
      alert('Тест снят с публикации');
      onSaved();
    } catch (error) {
      console.error('Ошибка снятия с публикации:', error);
      alert('Не удалось снять тест с публикации');
    } finally {
      setSaving(false);
    }
  }, [testId, onSaved]);

  // Publish
  const handlePublish = useCallback(async () => {
    if (!validateForPublish()) return;
    if (!user) {
      alert('Необходима авторизация');
      return;
    }

    const { title, rubric, questions, questionCountError } = formData;
    const { isNextLevel, prerequisiteTestId, requiredPercentage, previousTestError, thresholdError, canAttachPrerequisite } = prerequisiteData;

    if (questionCountError) {
      alert(questionCountError);
      return;
    }

    // Check title uniqueness
    const isUnique = await isTestTitleUnique(title.trim(), testId || undefined);
    if (!isUnique) {
      alert('Тест с таким названием уже существует. Пожалуйста, выберите другое название.');
      return;
    }

    if (isNextLevel) {
      if (!prerequisiteTestId) {
        alert('Выберите тест, после которого открывается этот уровень.');
        return;
      }
      if (previousTestError) {
        alert(previousTestError);
        return;
      }
      if (
        thresholdError ||
        Number.isNaN(requiredPercentage) ||
        requiredPercentage < 0 ||
        requiredPercentage > 100
      ) {
        alert('Укажите порог прохождения от 0 до 100%.');
        return;
      }
    }

    if (isNextLevel && !canAttachPrerequisite(prerequisiteTestId)) {
      alert('Пока можно связать не больше трёх уровней в цепочке тестов.');
      return;
    }

    try {
      setSaving(true);
      const appearancePayload = buildAppearancePayload();

      if (testId) {
        // Update and publish
        await updateTest(testId, {
          title: title.trim(),
          rubric,
          prerequisiteTestId: isNextLevel ? prerequisiteTestId : undefined,
          questionCount: questions.length,
          requiredPercentage: isNextLevel ? requiredPercentage : undefined,
          appearance: appearancePayload,
        });
        await updateTestQuestions(testId, questions);
        await publishTest(testId);
      } else {
        // Create and publish immediately
        const newTestId = await createTest(
          {
            title: title.trim(),
            rubric,
            prerequisiteTestId: isNextLevel ? prerequisiteTestId : undefined,
            questionCount: questions.length,
            status: 'published',
            requiredPercentage: isNextLevel ? requiredPercentage : undefined,
            appearance: appearancePayload,
          },
          user.uid
        );
        await updateTestQuestions(newTestId, questions);
      }

      alert('Тест опубликован!');
      onSaved();
    } catch (error) {
      console.error('Ошибка публикации:', error);
      alert('Не удалось опубликовать тест');
    } finally {
      setSaving(false);
    }
  }, [user, testId, formData, prerequisiteData, buildAppearancePayload, onSaved, validateForPublish]);

  return {
    saving,
    handlers: {
      handleSaveDraft,
      handlePublish,
      handleUnpublish,
    },
  };
}
