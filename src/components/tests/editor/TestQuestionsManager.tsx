import { useRef } from 'react';
import type { TestQuestion } from '../../../types/tests';
import { QuestionEditor } from '../../QuestionEditor';

interface TestQuestionsManagerProps {
  questions: TestQuestion[];
  onQuestionChange: (index: number, question: TestQuestion) => void;
  onQuestionDelete: (index: number) => void;
  onAddQuestion: () => void;
  onImportQuestions: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDownloadTemplate: () => void;
  saving: boolean;
  testId?: string;
  onRequestSave: () => void;
}

export function TestQuestionsManager({
  questions,
  onQuestionChange,
  onQuestionDelete,
  onAddQuestion,
  onImportQuestions,
  onDownloadTemplate,
  saving,
  testId,
  onRequestSave,
}: TestQuestionsManagerProps) {
  const questionsFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImportClick = () => {
    questionsFileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      {/* Header с кнопками */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">
          Вопросы ({questions.length})
        </h3>
        <div className="flex gap-2">
          {/* Hidden file input */}
          <input
            ref={questionsFileInputRef}
            type="file"
            accept=".json"
            onChange={onImportQuestions}
            className="hidden"
          />

          {/* Кнопка скачать шаблон */}
          <button
            onClick={onDownloadTemplate}
            disabled={saving}
            className="rounded-md bg-blue-600 px-3 py-1 text-sm text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            title="Скачать шаблон JSON вопросов"
          >
            📄 Шаблон
          </button>

          {/* Кнопка импорта */}
          <button
            onClick={handleImportClick}
            disabled={questions.length >= 20 || saving}
            className="rounded-md bg-purple-600 px-3 py-1 text-sm text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            title="Импортировать вопросы из JSON"
          >
            📥 Импорт
          </button>

          {/* Кнопка добавить вопрос */}
          <button
            onClick={onAddQuestion}
            disabled={questions.length >= 20 || saving}
            className="rounded-md bg-green-600 px-3 py-1 text-sm text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            title="Добавить новый вопрос"
          >
            + Добавить вопрос
          </button>
        </div>
      </div>

      {/* Подсказка о лимите */}
      {questions.length >= 20 && (
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
          ⚠️ Достигнут максимальный лимит: 20 вопросов
        </div>
      )}

      {/* Список вопросов или пустое состояние */}
      {questions.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-500">
          <p className="mb-4">Нет вопросов</p>
          <p className="text-sm text-gray-400">
            Добавьте вопросы вручную или импортируйте из JSON файла
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((question, index) => (
            <QuestionEditor
              key={question.id}
              question={question}
              questionNumber={index + 1}
              onChange={(updated) => onQuestionChange(index, updated)}
              onDelete={() => onQuestionDelete(index)}
              onRequestSave={onRequestSave}
              testId={testId}
            />
          ))}
        </div>
      )}

      {/* Информация о статусе */}
      {questions.length > 0 && (
        <div className="text-sm text-gray-500 text-right">
          {questions.length} / 20 вопросов
        </div>
      )}
    </div>
  );
}
