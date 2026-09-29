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
 * Просмотр одного видео занятия. `spans` — реально проигранные отрезки в
 * секундах плоским массивом [start0, end0, start1, end1, …] (Firestore не
 * хранит массивы массивов), слитые и отсортированные.
 */
export interface CloudVideoStat {
  /** Проиграно ≥ 60% длительности — по минутам, а не по позиции ползунка. */
  watched?: boolean;
  /** Открывал видео вне сайта: ссылка на YouTube/источник или кнопка YouTube в плеере. */
  openedExternally?: boolean;
  spans?: number[];
  /** Длительность видео в секундах. */
  duration?: number;
}

/** lessonId → ключ видео (getLessonVideoKey) → статистика просмотра. */
export type CloudLessonVideoStats = Record<string, Record<string, CloudVideoStat>>;

/**
 * Документ users/{uid}/courseProgress/{courseId}.
 * Все поля опциональны — клиент пишет с merge:true.
 */
export interface CloudCourseProgress {
  videoResume?: CloudVideoResume;
  lastLesson?: CloudLastLesson;
  /** Занятия, у которых просмотрена главная (первая) лекция. */
  watchedLessonIds?: string[];
  videoStats?: CloudLessonVideoStats;
}
