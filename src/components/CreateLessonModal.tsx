import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import type { CourseType } from '../types/tests';
import { useCreateLesson } from '../hooks/useCreateLesson';
import { generateLessonId } from '../utils/transliterate';

interface CreateLessonModalProps {
  onClose: () => void;
  defaultCourse?: CourseType;
}

interface CourseOption {
  id: CourseType;
  name: string;
  icon: string;
  basePath: string;
}

const COURSES: CourseOption[] = [
  { id: 'development', name: 'Психология развития', icon: '👶', basePath: '' },
  { id: 'clinical', name: 'Клиническая психология', icon: '🧠', basePath: 'clinical/' },
  { id: 'general', name: 'Общая психология', icon: '📚', basePath: 'general/' },
];

export function CreateLessonModal({ onClose, defaultCourse = 'development' }: CreateLessonModalProps) {
  const navigate = useNavigate();
  const { createLesson, checkIdExists, creating } = useCreateLesson();

  const [selectedCourse, setSelectedCourse] = useState<CourseType>(defaultCourse);
  const [title, setTitle] = useState('');
  const [periodId, setPeriodId] = useState('');
  const [idManuallyEdited, setIdManuallyEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idExists, setIdExists] = useState(false);

  // Автогенерация ID из названия
  useEffect(() => {
    if (!idManuallyEdited && title) {
      setPeriodId(generateLessonId(title));
    }
  }, [title, idManuallyEdited]);

  // Проверка уникальности ID с debounce
  useEffect(() => {
    if (!periodId) {
      setIdExists(false);
      return;
    }

    const timer = setTimeout(async () => {
      const exists = await checkIdExists(selectedCourse, periodId);
      setIdExists(exists);
    }, 300);

    return () => clearTimeout(timer);
  }, [periodId, selectedCourse, checkIdExists]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    setError(null);
  };

  const handleIdChange = (value: string) => {
    // Нормализуем ID: только латиница, цифры, дефисы
    const normalized = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setPeriodId(normalized);
    setIdManuallyEdited(true);
    setError(null);
  };

  const handleCourseChange = (course: CourseType) => {
    setSelectedCourse(course);
    setError(null);
    // Сбрасываем проверку ID при смене курса
    setIdExists(false);
  };

  const handleSubmit = async () => {
    setError(null);

    if (!title.trim()) {
      setError('Введите название занятия');
      return;
    }

    if (!periodId.trim()) {
      setError('ID не может быть пустым');
      return;
    }

    if (idExists) {
      setError('Занятие с таким ID уже существует');
      return;
    }

    const result = await createLesson(selectedCourse, title, periodId);

    if (result.success) {
      onClose();
      navigate(`/admin/content/edit/${periodId}?course=${selectedCourse}`);
    } else {
      setError(result.error ?? 'Не удалось создать занятие');
    }
  };

  const selectedCourseData = COURSES.find(c => c.id === selectedCourse);
  const previewUrl = `/${selectedCourseData?.basePath ?? ''}${periodId || 'id'}`;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-lg rounded-lg bg-white shadow-2xl">
        {/* Header */}
        <header className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-xl font-bold">Создать занятие</h2>
          <button
            onClick={onClose}
            className="text-2xl text-gray-400 transition hover:text-gray-600"
            aria-label="Закрыть"
          >
            ×
          </button>
        </header>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Выбор курса */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Курс
            </label>
            <div className="flex flex-wrap gap-2">
              {COURSES.map((course) => (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => handleCourseChange(course.id)}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition ${
                    selectedCourse === course.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span>{course.icon}</span>
                  <span>{course.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Название */}
          <div className="space-y-2">
            <label htmlFor="lesson-title" className="block text-sm font-medium text-gray-700">
              Название занятия *
            </label>
            <input
              id="lesson-title"
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Например: Психология старения"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          </div>

          {/* ID */}
          <div className="space-y-2">
            <label htmlFor="lesson-id" className="block text-sm font-medium text-gray-700">
              ID (для URL)
            </label>
            <input
              id="lesson-id"
              type="text"
              value={periodId}
              onChange={(e) => handleIdChange(e.target.value)}
              placeholder="psihologia-stareniya"
              className={`w-full rounded-md border px-3 py-2 font-mono text-sm focus:outline-none focus:ring-1 ${
                idExists
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }`}
            />
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">
                URL: <code className="rounded bg-gray-100 px-1">{previewUrl}</code>
              </span>
              {idExists && (
                <span className="text-red-600">ID уже существует</span>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-700">
            <p>
              <strong>По умолчанию:</strong> занятие будет создано как черновик с заглушкой.
              Вы сможете отредактировать содержимое и опубликовать его позже.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-end gap-3 border-t bg-gray-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={creating || !title.trim() || !periodId.trim() || idExists}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
          >
            {creating ? 'Создание...' : 'Создать занятие'}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
