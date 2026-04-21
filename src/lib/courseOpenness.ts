import type { Period } from '../types/content';

/**
 * Считает курс «открытым», если у каждого опубликованного урока есть хотя бы
 * одно видео и все видео в плейлисте помечены isPublic = true. Пустой урок
 * (без видео) делает курс закрытым — гостю на него смотреть нечего.
 */
export function isCourseOpen(lessons: Period[]): boolean {
  const published = lessons.filter((lesson) => lesson?.published !== false);
  if (published.length === 0) return false;
  return published.every((lesson) => {
    const videos = lesson.video_playlist ?? [];
    if (videos.length === 0) return false;
    return videos.every((video) => video?.isPublic === true);
  });
}
