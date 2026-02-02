import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { generateLessonId } from '../utils/transliterate';
import { useCreateCourse } from '../hooks/useCreateCourse';
import { isCoreCourse } from '../constants/courses';

interface CreateCourseModalProps {
  onClose: () => void;
  onCreated: (courseId: string) => void;
}

export default function CreateCourseModal({ onClose, onCreated }: CreateCourseModalProps) {
  const { createCourse, checkCourseIdExists, creating } = useCreateCourse();
  const [courseName, setCourseName] = useState('');
  const [courseId, setCourseId] = useState('');
  const [courseIdManuallyEdited, setCourseIdManuallyEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [courseIdExists, setCourseIdExists] = useState(false);
  const [lessons, setLessons] = useState<Array<{ title: string; id: string; idManuallyEdited: boolean }>>([
    { title: '', id: '', idManuallyEdited: false },
  ]);

  useEffect(() => {
    if (!courseIdManuallyEdited && courseName) {
      setCourseId(generateLessonId(courseName));
    }
  }, [courseName, courseIdManuallyEdited]);

  useEffect(() => {
    if (!courseId) {
      setCourseIdExists(false);
      return;
    }

    const timer = setTimeout(async () => {
      const exists = await checkCourseIdExists(courseId);
      setCourseIdExists(exists);
    }, 300);

    return () => clearTimeout(timer);
  }, [courseId, checkCourseIdExists]);

  const handleCourseIdChange = (value: string) => {
    const normalized = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setCourseId(normalized);
    setCourseIdManuallyEdited(true);
    setError(null);
  };

  const updateLessonTitle = (index: number, value: string) => {
    setLessons((prev) =>
      prev.map((lesson, idx) => {
        if (idx !== index) return lesson;
        const nextId = lesson.idManuallyEdited ? lesson.id : generateLessonId(value);
        return { ...lesson, title: value, id: nextId };
      })
    );
    setError(null);
  };

  const updateLessonId = (index: number, value: string) => {
    const normalized = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setLessons((prev) =>
      prev.map((lesson, idx) =>
        idx === index ? { ...lesson, id: normalized, idManuallyEdited: true } : lesson
      )
    );
    setError(null);
  };

  const addLesson = () => {
    setLessons((prev) => [...prev, { title: '', id: '', idManuallyEdited: false }]);
  };

  const removeLesson = (index: number) => {
    setLessons((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== index) : prev));
  };

  const handleSubmit = async () => {
    setError(null);

    if (!courseName.trim()) {
      setError('Введите название курса');
      return;
    }

    if (!courseId.trim()) {
      setError('ID курса не может быть пустым');
      return;
    }

    if (isCoreCourse(courseId)) {
      setError('ID курса совпадает с одним из основных курсов');
      return;
    }

    if (courseIdExists) {
      setError('Курс с таким ID уже существует');
      return;
    }

    const normalizedLessons = lessons.map((lesson) => ({
      id: lesson.id.trim(),
      title: lesson.title.trim(),
    }));

    if (normalizedLessons.some((lesson) => !lesson.title)) {
      setError('Заполните название каждого занятия');
      return;
    }

    if (normalizedLessons.some((lesson) => !lesson.id)) {
      setError('Заполните ID каждого занятия');
      return;
    }

    const lessonIdSet = new Set(normalizedLessons.map((lesson) => lesson.id));
    if (lessonIdSet.size !== normalizedLessons.length) {
      setError('ID занятий должны быть уникальны');
      return;
    }

    const result = await createCourse(courseId, courseName, normalizedLessons);
    if (result.success) {
      onCreated(courseId);
    } else {
      setError(result.error ?? 'Не удалось создать курс');
    }
  };

  const previewLessonId = lessons[0]?.id || 'lesson-id';
  const previewUrl = `/course/${courseId || 'course-id'}/${previewLessonId}`;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-xl rounded-lg bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-xl font-bold">Создать новый курс</h2>
          <button
            onClick={onClose}
            className="text-2xl text-gray-400 transition hover:text-gray-600"
            aria-label="Закрыть"
          >
            ×
          </button>
        </header>

        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Название курса *</label>
            <input
              type="text"
              value={courseName}
              onChange={(e) => {
                setCourseName(e.target.value);
                setError(null);
              }}
              placeholder="Например: Социальная психология"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">ID курса (для URL)</label>
            <input
              type="text"
              value={courseId}
              onChange={(e) => handleCourseIdChange(e.target.value)}
              placeholder="social-psychology"
              className={`w-full rounded-md border px-3 py-2 font-mono text-sm focus:outline-none focus:ring-1 ${
                courseIdExists
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }`}
            />
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">
                URL: <code className="rounded bg-gray-100 px-1">{previewUrl}</code>
              </span>
              {courseIdExists && <span className="text-red-600">ID уже существует</span>}
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Занятия курса *</label>

            {lessons.map((lesson, index) => (
              <div key={index} className="rounded-md border border-gray-200 bg-gray-50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-600">Занятие {index + 1}</span>
                  {lessons.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLesson(index)}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      Удалить
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={lesson.title}
                    onChange={(e) => updateLessonTitle(index, e.target.value)}
                    placeholder="Название занятия"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={lesson.id}
                    onChange={(e) => updateLessonId(index, e.target.value)}
                    placeholder="ID занятия"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addLesson}
              className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <span aria-hidden>＋</span>
              <span>Добавить ещё занятие</span>
            </button>
          </div>

          <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-700">
            <p>
              <strong>По умолчанию:</strong> занятия создаются с заглушкой и сразу видны студентам. Вы сможете
              изменить публикацию и содержимое в редакторе.
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

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
            disabled={creating || !courseName.trim() || !courseId.trim() || courseIdExists}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
          >
            {creating ? 'Создание...' : 'Создать курс'}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
