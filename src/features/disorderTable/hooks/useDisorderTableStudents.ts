import { useEffect, useState } from 'react';
import { debugError } from '../../../lib/debug';
import { getCourseStudents } from '../../../lib/adminFunctions';
import { courseStudentLabel, type CourseStudent } from '../../../types/courseStudents';
import type { DisorderTableStudent } from '../types';

/** Группы + индивидуальные доступы → плоский список без дублей. */
function flattenCourseStudents(
  groups: Array<{ students: CourseStudent[] }>,
  individual: CourseStudent[]
): DisorderTableStudent[] {
  const byUid = new Map<string, DisorderTableStudent>();
  for (const student of [...groups.flatMap((group) => group.students), ...individual]) {
    if (byUid.has(student.uid)) continue;
    byUid.set(student.uid, {
      uid: student.uid,
      displayName: courseStudentLabel(student),
      email: student.email ?? '',
    });
  }
  return [...byUid.values()].sort((a, b) => a.displayName.localeCompare(b.displayName, 'ru'));
}

/**
 * Список студентов курса для режима преподавателя. Идёт через callable
 * `getCourseStudents`: коллекция `users/*` админу курса не читается.
 */
export function useDisorderTableStudents(courseId: string, enabled: boolean) {
  const [students, setStudents] = useState<DisorderTableStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setStudents([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getCourseStudents({ courseId })
      .then((response) => {
        if (cancelled) return;
        setStudents(flattenCourseStudents(response.groups, response.individual));
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        debugError('Failed to load students for disorder table admin mode', err);
        setStudents([]);
        setError('Не удалось загрузить список студентов');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [courseId, enabled]);

  return {
    students,
    loading,
    error,
  };
}
