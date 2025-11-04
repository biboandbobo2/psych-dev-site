import { useState } from 'react';
import type { TestQuestion, TestResource } from '../types/tests';

interface QuestionEditorProps {
  question: TestQuestion;
  questionNumber: number;
  onChange: (question: TestQuestion) => void;
  onDelete: () => void;
}

export function QuestionEditor({
  question,
  questionNumber,
  onChange,
  onDelete,
}: QuestionEditorProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleQuestionTextChange = (text: string) => {
    onChange({ ...question, questionText: text });
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...question.options] as [string, string, string, string];
    newOptions[index] = value;
    onChange({ ...question, options: newOptions });
  };

  const handleCorrectIndexChange = (index: number) => {
    onChange({ ...question, correctOptionIndex: index });
  };

  const handleSuccessMessageChange = (message: string) => {
    onChange({ ...question, successMessage: message || undefined });
  };

  const handleFailureMessageChange = (message: string) => {
    onChange({ ...question, failureMessage: message || undefined });
  };

  const handleSuccessResourceChange = (index: number, field: keyof TestResource, value: string) => {
    const resources = [...(question.successResources ?? [])];
    resources[index] = {
      ...resources[index],
      [field]: value,
    };
    onChange({
      ...question,
      successResources: resources.map((res) =>
        res.title.trim() === '' && res.url.trim() === '' ? res : { ...res }
      ),
    });
  };

  const handleAddSuccessResource = () => {
    const resources = [...(question.successResources ?? [])];
    resources.push({ title: '', url: '' });
    onChange({ ...question, successResources: resources });
  };

  const handleRemoveSuccessResource = (index: number) => {
    const resources = (question.successResources ?? []).filter((_, i) => i !== index);
    onChange({ ...question, successResources: resources.length ? resources : undefined });
  };

  const handleFailureResourceChange = (index: number, field: keyof TestResource, value: string) => {
    const resources = [...(question.failureResources ?? [])];
    resources[index] = {
      ...resources[index],
      [field]: value,
    };
    onChange({
      ...question,
      failureResources: resources.map((res) =>
        res.title.trim() === '' && res.url.trim() === '' ? res : { ...res }
      ),
    });
  };

  const handleAddFailureResource = () => {
    const resources = [...(question.failureResources ?? [])];
    resources.push({ title: '', url: '' });
    onChange({ ...question, failureResources: resources });
  };

  const handleRemoveFailureResource = (index: number) => {
    const resources = (question.failureResources ?? []).filter((_, i) => i !== index);
    onChange({ ...question, failureResources: resources.length ? resources : undefined });
  };

  // Проверка заполненности
  const isComplete =
    question.questionText.trim() !== '' &&
    question.options.every((opt) => opt.trim() !== '');

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Заголовок вопроса */}
      <div
        className="flex cursor-pointer items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-gray-700">
            Вопрос {questionNumber}
          </span>
          {!isComplete && (
            <span className="rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-800">
              Не заполнен
            </span>
          )}
          {isComplete && (
            <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-800">
              ✓ Готов
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="rounded px-2 py-1 text-sm text-red-600 transition hover:bg-red-50"
          >
            Удалить
          </button>
          <span className="text-gray-400">{isExpanded ? '▼' : '▶'}</span>
        </div>
      </div>

      {/* Содержимое вопроса */}
      {isExpanded && (
        <div className="space-y-4 p-4">
          {/* Текст вопроса */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Текст вопроса <span className="text-red-500">*</span>
            </label>
            <textarea
              value={question.questionText}
              onChange={(e) => handleQuestionTextChange(e.target.value)}
              placeholder="Введите вопрос..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              rows={2}
            />
          </div>

          {/* Варианты ответов */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Варианты ответов <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {question.options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={question.correctOptionIndex === index}
                    onChange={() => handleCorrectIndexChange(index)}
                    className="h-4 w-4 text-blue-600"
                  />
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Вариант ${index + 1}...`}
                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Отметьте радиокнопку у правильного ответа
            </p>
          </div>

          {/* Кастомные сообщения (опционально) */}
          <details className="rounded-md border border-gray-200 bg-gray-50 p-3">
            <summary className="cursor-pointer text-sm font-medium text-gray-700">
              Кастомные сообщения (опционально)
            </summary>
            <div className="mt-3 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Сообщение при правильном ответе
                </label>
                <textarea
                  value={question.successMessage || ''}
                  onChange={(e) => handleSuccessMessageChange(e.target.value)}
                  placeholder="Будет показано вместо стандартного сообщения..."
                  className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100"
                  rows={2}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Сообщение при неправильном ответе
                </label>
                <textarea
                  value={question.failureMessage || ''}
                  onChange={(e) => handleFailureMessageChange(e.target.value)}
                  placeholder="Будет показано вместо стандартного сообщения..."
                  className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100"
                  rows={2}
                />
              </div>
            </div>
          </details>

          <details className="rounded-md border border-gray-200 bg-gray-50 p-3">
            <summary className="cursor-pointer text-sm font-medium text-gray-700">
              Рекомендуемые материалы (опционально)
            </summary>
            <div className="mt-3 space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-green-800">
                    Для правильного ответа
                  </span>
                  <button
                    type="button"
                    onClick={handleAddSuccessResource}
                    className="text-xs text-green-700 hover:text-green-900"
                  >
                    + Добавить ресурс
                  </button>
                </div>
                {(question.successResources ?? []).length === 0 ? (
                  <p className="text-xs text-gray-500">
                    Добавьте ссылки на статьи, книги или видео, которые откроются после правильного ответа.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {question.successResources?.map((resource, index) => (
                      <div key={index} className="rounded-md border border-green-200 bg-white p-3 space-y-2">
                        <div className="flex items-start justify-between">
                          <span className="text-xs font-semibold text-green-700">Ресурс {index + 1}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSuccessResource(index)}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            Удалить
                          </button>
                        </div>
                        <input
                          type="text"
                          value={resource.title}
                          onChange={(e) => handleSuccessResourceChange(index, 'title', e.target.value)}
                          placeholder="Название материала"
                          className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-100"
                        />
                        <input
                          type="url"
                          value={resource.url}
                          onChange={(e) => handleSuccessResourceChange(index, 'url', e.target.value)}
                          placeholder="https://..."
                          className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-100"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-orange-800">
                    Для неправильного ответа
                  </span>
                  <button
                    type="button"
                    onClick={handleAddFailureResource}
                    className="text-xs text-orange-700 hover:text-orange-900"
                  >
                    + Добавить ресурс
                  </button>
                </div>
                {(question.failureResources ?? []).length === 0 ? (
                  <p className="text-xs text-gray-500">
                    Укажите материалы, которые помогут участнику разобраться при ошибке.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {question.failureResources?.map((resource, index) => (
                      <div key={index} className="rounded-md border border-orange-200 bg-white p-3 space-y-2">
                        <div className="flex items-start justify-between">
                          <span className="text-xs font-semibold text-orange-700">Ресурс {index + 1}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFailureResource(index)}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            Удалить
                          </button>
                        </div>
                        <input
                          type="text"
                          value={resource.title}
                          onChange={(e) => handleFailureResourceChange(index, 'title', e.target.value)}
                          placeholder="Название материала"
                          className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-100"
                        />
                        <input
                          type="url"
                          value={resource.url}
                          onChange={(e) => handleFailureResourceChange(index, 'url', e.target.value)}
                          placeholder="https://..."
                          className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-100"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
