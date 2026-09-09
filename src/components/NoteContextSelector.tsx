import { useMemo } from 'react';
import { usePublishedLessonOptions } from '../hooks';
import { SELECT_CHEVRON_CLASS, SELECT_CHEVRON_STYLE } from './ui/selectChevron';

/** Общий вид полей формы заметки (селекты, инпут, textarea). */
export const NOTE_FIELD_CLASS =
  'w-full rounded-md border border-border bg-card px-4 py-2 text-fg focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-60';

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
        <label htmlFor="note-course" className="mb-2 block text-sm font-medium text-fg">
          Курс
        </label>
        <select
          id="note-course"
          value={selectedCourseId ?? ''}
          onChange={(event) => {
            const nextCourseId = event.target.value || null;
            onCourseChange(nextCourseId);
            onPeriodChange(null, null);
          }}
          className={`${NOTE_FIELD_CLASS} ${SELECT_CHEVRON_CLASS}`}
          style={SELECT_CHEVRON_STYLE}
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
        <label htmlFor="note-period" className="mb-2 block text-sm font-medium text-fg">
          Занятие
        </label>
        <select
          id="note-period"
          value={selectedPeriodId ?? ''}
          onChange={(event) => {
            const periodId = event.target.value || null;
            const selectedLesson = selectedLessons.find((lesson) => lesson.periodId === periodId) ?? null;
            onPeriodChange(periodId, selectedLesson?.periodTitle ?? null);
          }}
          className={`${NOTE_FIELD_CLASS} ${SELECT_CHEVRON_CLASS}`}
          style={SELECT_CHEVRON_STYLE}
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
