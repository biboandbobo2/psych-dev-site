import { useMemo } from 'react';
import { usePublishedLessonOptions } from '../hooks';

interface NoteContextSelectorProps {
  selectedCourseId: string | null;
  selectedPeriodId: string | null;
  saving: boolean;
  onCourseChange: (courseId: string | null) => void;
  onPeriodChange: (periodId: string | null, periodTitle: string | null) => void;
}

export function NoteContextSelector({
  selectedCourseId,
  selectedPeriodId,
  saving,
  onCourseChange,
  onPeriodChange,
}: NoteContextSelectorProps) {
  const { courseOptions, lessonsByCourse } = usePublishedLessonOptions();

  const selectedLessons = useMemo(
    () => (selectedCourseId ? lessonsByCourse[selectedCourseId] ?? [] : []),
    [lessonsByCourse, selectedCourseId]
  );

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">Курс</label>
        <select
          value={selectedCourseId ?? ''}
          onChange={(event) => {
            const nextCourseId = event.target.value || null;
            onCourseChange(nextCourseId);
            onPeriodChange(null, null);
          }}
          className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={saving}
        >
          <option value="">Выберите курс</option>
          {courseOptions.map((course) => (
            <option key={course.id} value={course.id}>
              {course.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">Занятие</label>
        <select
          value={selectedPeriodId ?? ''}
          onChange={(event) => {
            const periodId = event.target.value || null;
            const selectedLesson = selectedLessons.find((lesson) => lesson.periodId === periodId) ?? null;
            onPeriodChange(periodId, selectedLesson?.periodTitle ?? null);
          }}
          className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={saving || !selectedCourseId}
        >
          <option value="">{selectedCourseId ? 'Выберите занятие' : 'Сначала выберите курс'}</option>
          {selectedLessons.map((lesson) => (
            <option key={lesson.periodKey} value={lesson.periodId}>
              {lesson.periodTitle}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
