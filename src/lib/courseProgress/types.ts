export interface CloudVideoResume {
  videoId: string;
  timeSec: number;
  path: string;
  lessonLabel?: string;
  videoTitle?: string;
  updatedAt: string;
}

export interface CloudLastLesson {
  path: string;
  label?: string;
  updatedAt: string;
}

/**
 * Документ users/{uid}/courseProgress/{courseId}.
 * Все поля опциональны — клиент пишет с merge:true.
 */
export interface CloudCourseProgress {
  videoResume?: CloudVideoResume;
  lastLesson?: CloudLastLesson;
  watchedLessonIds?: string[];
}
