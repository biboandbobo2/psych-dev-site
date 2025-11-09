import { useCallback } from 'react';
import type { TestRubric, TestStatus } from '../../../types/tests';
import { AGE_RANGE_LABELS } from '../../../types/notes';
import type { AgeRange } from '../../../hooks/useNotes';

interface TestMetadataEditorProps {
  title: string;
  description: string;
  rubric: TestRubric;
  status: TestStatus;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
  onRubricChange: (rubric: TestRubric) => void;
  onStatusChange: (status: TestStatus) => void;
}

export function TestMetadataEditor({
  title,
  description,
  rubric,
  status,
  onTitleChange,
  onDescriptionChange,
  onRubricChange,
  onStatusChange,
}: TestMetadataEditorProps) {
  const titleMaxLength = 100;
  const descriptionMaxLength = 300;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Основная информация</h3>

      {/* Название */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Название теста *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          maxLength={titleMaxLength}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Например: Авторы психологии развития"
        />
        <p className="text-sm text-gray-500 mt-1">
          {title.length} / {titleMaxLength}
        </p>
      </div>

      {/* Описание */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Описание (опционально)
        </label>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          maxLength={descriptionMaxLength}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Краткое описание теста"
        />
        <p className="text-sm text-gray-500 mt-1">
          {description.length} / {descriptionMaxLength}
        </p>
      </div>

      {/* Рубрика */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Рубрика *
        </label>
        <select
          value={rubric}
          onChange={(e) => onRubricChange(e.target.value as TestRubric)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="full-course">Курс целиком</option>
          <optgroup label="Возрастные периоды">
            {Object.entries(AGE_RANGE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* Статус */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Статус
        </label>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="draft"
              checked={status === 'draft'}
              onChange={(e) => onStatusChange(e.target.value as TestStatus)}
              className="mr-2"
            />
            <span>Черновик</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="published"
              checked={status === 'published'}
              onChange={(e) => onStatusChange(e.target.value as TestStatus)}
              className="mr-2"
            />
            <span>Опубликован</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="unpublished"
              checked={status === 'unpublished'}
              onChange={(e) => onStatusChange(e.target.value as TestStatus)}
              className="mr-2"
            />
            <span>Снят с публикации</span>
          </label>
        </div>
      </div>
    </div>
  );
}
