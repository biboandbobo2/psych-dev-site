import { useState, useRef, useCallback } from 'react';
import type { Test, TestQuestion } from '../../../../types/tests';
import {
  importTestFromJson,
  readFileAsText,
  generateTestTemplate,
  downloadJson,
} from '../../../../utils/testImportExport';

interface ImportedTest {
  data?: Partial<Test>;
  questions?: TestQuestion[];
}

interface FeedbackState {
  type: 'success' | 'error';
  message: string;
}

/**
 * Hook for test import/export functionality
 */
export function useTestImportExport() {
  const [importedTest, setImportedTest] = useState<ImportedTest | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = useCallback(
    async (
      e: React.ChangeEvent<HTMLInputElement>,
      onSuccess: () => void,
      onFeedback: (feedback: FeedbackState) => void
    ) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const content = await readFileAsText(file);
        const result = importTestFromJson(content);

        if (!result.success) {
          onFeedback({
            type: 'error',
            message: result.error || 'Ошибка импорта',
          });
          return;
        }

        setImportedTest({ data: result.data, questions: result.questions });
        onSuccess();
      } catch (error) {
        onFeedback({
          type: 'error',
          message: 'Не удалось прочитать файл',
        });
      } finally {
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    []
  );

  const handleDownloadTestTemplate = useCallback(() => {
    const template = generateTestTemplate();
    const filename = `test-template-${new Date().toISOString().split('T')[0]}.json`;
    downloadJson(template, filename);
  }, []);

  const clearImportedTest = useCallback(() => {
    setImportedTest(null);
  }, []);

  return {
    importedTest,
    fileInputRef,
    handleFileChange,
    handleDownloadTestTemplate,
    clearImportedTest,
  };
}
