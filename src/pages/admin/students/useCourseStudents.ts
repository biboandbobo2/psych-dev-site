import { useCallback, useEffect, useState } from 'react';
import { getCourseStudents } from '../../../lib/adminFunctions';
import { reportAppError } from '../../../lib/errorHandler';
import type { CourseStudentsResponse } from '../../../types/courseStudents';
import { loadGroupProgress } from './courseProgress';

/**
 * Состав курса + прогресс просмотра его студентов.
 *
 * Состав приходит из callable `getCourseStudents` (коллекция `users` админу
 * курса закрыта), прогресс — точечными чтениями `users/{uid}/courseProgress/
 * {courseId}`, которые rules разрешают лектору курса. Прогресс отдаётся
 * множествами id занятий: пересчёт в «X из N» зависит от списка занятий и
 * живёт на стороне страницы, лишней перезагрузки не вызывает.
 */
export function useCourseStudents(courseId: string | null) {
  const [data, setData] = useState<CourseStudentsResponse | null>(null);
  const [progress, setProgress] = useState<Map<string, Set<string>>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((value) => value + 1), []);

  useEffect(() => {
    setData(null);
    setProgress(new Map());
    setError(null);

    if (!courseId) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    getCourseStudents({ courseId })
      .then(async (response) => {
        if (cancelled) return;
        setData(response);

        const uids = Array.from(
          new Set([
            ...response.groups.flatMap((group) => group.students.map((s) => s.uid)),
            ...response.individual.map((student) => student.uid),
          ])
        );
        if (uids.length === 0) return;

        // name здесь не используется: подписи строк берутся из ответа callable.
        const { members } = await loadGroupProgress(
          uids.map((uid) => ({ uid, name: uid })),
          courseId
        );
        if (cancelled) return;
        setProgress(new Map(members.map((member) => [member.uid, member.watchedLessonIds])));
      })
      .catch((err) => {
        if (cancelled) return;
        reportAppError({
          message: 'Не удалось загрузить студентов курса',
          error: err,
          context: 'CourseStudents',
        });
        setError('Не удалось загрузить студентов курса. Попробуйте обновить страницу.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [courseId, reloadToken]);

  return { data, progress, loading, error, reload };
}
