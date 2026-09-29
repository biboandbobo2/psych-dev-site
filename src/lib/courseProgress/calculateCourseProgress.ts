export interface ProgressLessonItem {
  period: string;
}

export interface CourseProgressStats {
  percent: number;
  completed: number;
  total: number;
}

interface CourseProgressInput {
  lessons: ProgressLessonItem[];
  watchedLessonIds: Set<string>;
}

const normalizeLessonId = (lessonId: string): string => lessonId.trim();

export function calculateCourseProgress({ lessons, watchedLessonIds }: CourseProgressInput): CourseProgressStats {
  const uniqueLessonIds = new Set(
    lessons
      .map((lesson) => normalizeLessonId(lesson.period))
      .filter(Boolean)
  );

  const total = uniqueLessonIds.size;
  if (!total) {
    return { percent: 0, completed: 0, total: 0 };
  }

  let completed = 0;
  uniqueLessonIds.forEach((lessonId) => {
    if (watchedLessonIds.has(lessonId)) {
      completed += 1;
    }
  });

  return {
    total,
    completed,
    percent: Math.round((completed / total) * 100),
  };
}
