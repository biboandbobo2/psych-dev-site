import type { Period } from '../types/content';

interface VideoLike {
  isPublic?: boolean;
}

/**
 * Возвращает все видео урока, объединяя старую (`video_playlist`) и
 * современную (`sections.video_section.content[]`) схемы. Текущая админка
 * пишет видео в sections, поэтому пустой `video_playlist` ещё не значит,
 * что у урока нет видео.
 */
function collectLessonVideos(lesson: Period): VideoLike[] {
  const playlist = Array.isArray(lesson?.video_playlist) ? lesson.video_playlist : [];
  const sectionContent = lesson?.sections?.video_section?.content;
  const sectionVideos = Array.isArray(sectionContent) ? sectionContent : [];
  return [...playlist, ...sectionVideos];
}

/**
 * Считает курс «открытым», если у каждого опубликованного урока есть хотя бы
 * одно видео и все видео помечены isPublic = true. Видео берутся из обеих
 * структур: legacy `video_playlist` и современной `sections.video_section`.
 * Пустой урок (без видео) делает курс закрытым — гостю на него смотреть нечего.
 */
export function isCourseOpen(lessons: Period[]): boolean {
  const published = lessons.filter((lesson) => lesson?.published !== false);
  if (published.length === 0) return false;
  return published.every((lesson) => {
    const videos = collectLessonVideos(lesson);
    if (videos.length === 0) return false;
    return videos.every((video) => video?.isPublic === true);
  });
}
