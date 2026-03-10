import { useEffect, useMemo, useState } from 'react';
import { getCourseDisplayName, getCourseIcon } from '../../../constants/courses';
import { useLectureSources } from '../hooks/useLectureSources';

interface LectureSelectorProps {
  selectedCourseId: string;
  onCourseChange: (courseId: string) => void;
  useWholeCourse: boolean;
  onUseWholeCourseChange: (value: boolean) => void;
  selectedLectureKeys: string[];
  onLectureKeysChange: (lectureKeys: string[]) => void;
}

export function LectureSelector({
  selectedCourseId,
  onCourseChange,
  useWholeCourse,
  onUseWholeCourseChange,
  selectedLectureKeys,
  onLectureKeysChange,
}: LectureSelectorProps) {
  const { courses, loading, error } = useLectureSources();
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!courses.length) {
      return;
    }

    const currentCourseExists = courses.some((course) => course.courseId === selectedCourseId);
    if (!selectedCourseId || !currentCourseExists) {
      onCourseChange(courses[0].courseId);
    }
  }, [courses, onCourseChange, selectedCourseId]);

  const selectedCourse = useMemo(
    () => courses.find((course) => course.courseId === selectedCourseId) ?? null,
    [courses, selectedCourseId]
  );

  useEffect(() => {
    if (!selectedCourse) {
      return;
    }

    const lectureKeySet = new Set(selectedCourse.lectures.map((lecture) => lecture.lectureKey));
    const nextKeys = selectedLectureKeys.filter((lectureKey) => lectureKeySet.has(lectureKey));

    if (nextKeys.length !== selectedLectureKeys.length) {
      onLectureKeysChange(nextKeys);
    }
  }, [onLectureKeysChange, selectedCourse, selectedLectureKeys]);

  if (loading) {
    return <div className="text-sm text-muted py-2">Загрузка транскриптов лекций...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-600 py-2">Ошибка: {error}</div>;
  }

  if (!courses.length) {
    return (
      <div className="text-sm text-muted py-2">
        Транскрипты для AI пока не подготовлены.
      </div>
    );
  }

  const toggleLecture = (lectureKey: string) => {
    if (selectedLectureKeys.includes(lectureKey)) {
      onLectureKeysChange(selectedLectureKeys.filter((value) => value !== lectureKey));
      return;
    }

    onLectureKeysChange([...selectedLectureKeys, lectureKey]);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="text-sm font-medium text-fg">Источник ответа</div>
        <div className="grid gap-2 sm:grid-cols-3">
          {courses.map((course) => {
            const selected = course.courseId === selectedCourseId;
            return (
              <button
                key={course.courseId}
                type="button"
                onClick={() => onCourseChange(course.courseId)}
                className={`rounded-lg border px-3 py-3 text-left transition ${
                  selected
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                    : 'border-border bg-card text-fg hover:bg-card2'
                }`}
              >
                <div className="text-sm font-semibold">
                  {getCourseIcon(course.courseId)} {getCourseDisplayName(course.courseId)}
                </div>
                <div className="mt-1 text-xs text-muted">
                  {course.lectures.length} лекц.
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedCourse ? (
        <div className="space-y-3 rounded-lg border border-border bg-card p-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onUseWholeCourseChange(true)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                useWholeCourse
                  ? 'bg-emerald-600 text-white'
                  : 'border border-border bg-card2 text-muted hover:text-fg'
              }`}
            >
              Все транскрипты курса
            </button>
            <button
              type="button"
              onClick={() => {
                onUseWholeCourseChange(false);
                setIsExpanded(true);
              }}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                !useWholeCourse
                  ? 'bg-amber-600 text-white'
                  : 'border border-border bg-card2 text-muted hover:text-fg'
              }`}
            >
              Конкретные лекции
            </button>
            <button
              type="button"
              onClick={() => setIsExpanded((value) => !value)}
              className="ml-auto rounded-lg border border-border bg-card2 px-3 py-2 text-xs font-medium text-muted transition hover:text-fg"
            >
              {isExpanded ? 'Скрыть список' : 'Показать список'}
            </button>
          </div>

          {!useWholeCourse ? (
            <div className="text-xs text-muted">
              Выбрано лекций: {selectedLectureKeys.length}
            </div>
          ) : null}

          {isExpanded ? (
            <div className="max-h-56 overflow-y-auto space-y-1 rounded-lg border border-border bg-card2 p-2">
              {selectedCourse.lectures.map((lecture) => {
                const selected = selectedLectureKeys.includes(lecture.lectureKey);
                return (
                  <label
                    key={lecture.lectureKey}
                    className={`flex items-start gap-2 rounded p-2 transition ${
                      selected
                        ? 'bg-emerald-50 border border-emerald-200'
                        : 'hover:bg-card'
                    } ${useWholeCourse ? 'opacity-60' : 'cursor-pointer'}`}
                  >
                    <input
                      type="checkbox"
                      checked={useWholeCourse ? true : selected}
                      disabled={useWholeCourse}
                      onChange={() => toggleLecture(lecture.lectureKey)}
                      className="mt-1 rounded border-border text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-fg">
                        {lecture.lectureTitle}
                      </div>
                      <div className="text-xs text-muted">
                        {lecture.periodTitle}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
