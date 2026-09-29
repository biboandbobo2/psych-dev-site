import { useEffect, useState } from 'react';
import { collectLessonDocVideoKeys } from '../../../features/periods/utils/lessonVideos';
import { sortCourseLessonItems } from '../../../lib/courseLessons';
import { loadPublishedCourseLessons } from '../../../lib/courseNavIndex';
import { debugError } from '../../../lib/debug';

export interface CourseLessonVideos {
  id: string;
  title: string;
  /** Ключи основных видео занятия; первый — главная лекция. */
  videoKeys: string[];
}

/**
 * Опубликованные занятия курса с ключами их основных видео — основа
 * квадратиков просмотров. Список тот же, что у nav-индекса и процента на
 * главной (loadPublishedCourseLessons), поэтому цифры у студента и
 * преподавателя совпадают.
 */
export function useCourseLessonVideos(courseId: string | null) {
  const [lessons, setLessons] = useState<CourseLessonVideos[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLessons([]);
    if (!courseId) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    loadPublishedCourseLessons(courseId)
      .then((docs) => {
        if (cancelled) return;
        setLessons(
          sortCourseLessonItems(courseId, docs).map((lesson) => ({
            id: lesson.period,
            title: String(lesson.title || lesson.label || lesson.period).trim(),
            videoKeys: collectLessonDocVideoKeys(lesson),
          }))
        );
      })
      .catch((error) => {
        debugError('[useCourseLessonVideos] failed to load lessons', { courseId, error });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [courseId]);

  return { lessons, loading };
}
