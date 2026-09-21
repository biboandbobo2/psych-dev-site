import { useEffect, useMemo, useState } from 'react';
import { usePublishedLessonOptions } from '../../../hooks';
import { getCourseStudents } from '../../../lib/adminFunctions';
import { debugError } from '../../../lib/debug';
import { courseStudentLabel, type CourseStudentsGroup } from '../../../types/courseStudents';
import {
  loadGroupProgress,
  normalizeLessonId,
  type MemberProgress,
} from './groupWatchStatsHelpers';

interface GroupWatchStatsProps {
  courseId: string;
}

/**
 * Статистика просмотров лекций по группе — для лектора курса.
 * Состав групп и имена участников приходят из callable `getCourseStudents`
 * (читать `users/*` лектору нельзя), прогресс — точечными чтениями
 * courseProgress участников, без серверной агрегации.
 */
export function GroupWatchStats({ courseId }: GroupWatchStatsProps) {
  const { lessonsByCourse } = usePublishedLessonOptions();
  const [targetGroups, setTargetGroups] = useState<CourseStudentsGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [members, setMembers] = useState<MemberProgress[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [groupsError, setGroupsError] = useState(false);

  const lessons = lessonsByCourse[courseId] ?? [];
  const selectedGroup = targetGroups.find((group) => group.id === selectedGroupId) ?? null;

  useEffect(() => {
    let cancelled = false;
    setTargetGroups([]);
    setSelectedGroupId('');
    setGroupsError(false);

    getCourseStudents({ courseId })
      .then((response) => {
        if (cancelled) return;
        setTargetGroups(response.groups);
      })
      .catch((err) => {
        if (cancelled) return;
        debugError('[GroupWatchStats] failed to load course students', err);
        setGroupsError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const groupMembers = useMemo(
    () =>
      (selectedGroup?.students ?? []).map((student) => ({
        uid: student.uid,
        name: courseStudentLabel(student),
      })),
    [selectedGroup]
  );

  useEffect(() => {
    setMembers([]);
    setLoadError(false);

    if (groupMembers.length === 0) {
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    loadGroupProgress(groupMembers, courseId)
      .then(({ members: loaded, failedCount }) => {
        if (cancelled) {
          return;
        }
        if (failedCount === loaded.length) {
          setLoadError(true);
        } else {
          setMembers(loaded.sort((a, b) => a.name.localeCompare(b.name, 'ru')));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [courseId, groupMembers]);

  return (
    <section className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Просмотры лекций</h2>
        <select
          value={selectedGroupId}
          onChange={(event) => setSelectedGroupId(event.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          aria-label="Группа"
        >
          <option value="">Выберите группу…</option>
          {targetGroups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name} ({group.students.length})
            </option>
          ))}
        </select>
      </div>

      {groupsError ? (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Не удалось загрузить состав групп курса. Попробуйте обновить страницу.
        </p>
      ) : !selectedGroup ? (
        <p className="mt-3 text-sm text-gray-500">
          Выберите группу, чтобы увидеть, кто посмотрел лекции курса.
        </p>
      ) : loading ? (
        <p className="mt-3 text-sm text-gray-500">Загружаем прогресс участников…</p>
      ) : loadError ? (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Не удалось загрузить прогресс участников. Попробуйте обновить страницу.
        </p>
      ) : lessons.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">У курса нет опубликованных занятий.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {lessons.map((lesson) => {
            const watchers = members.filter((member) =>
              member.watchedLessonIds.has(normalizeLessonId(lesson.periodId))
            );

            return (
              <li key={lesson.periodKey}>
                <details className="rounded-xl border border-gray-200 bg-white px-4 py-2">
                  <summary className="cursor-pointer text-sm">
                    <span className="font-medium">{lesson.periodTitle}</span>
                    <span
                      className={`ml-2 ${
                        watchers.length === members.length && members.length > 0
                          ? 'text-emerald-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {watchers.length}/{members.length}
                    </span>
                  </summary>
                  <ul className="mt-2 space-y-1 border-t border-gray-100 pt-2">
                    {members.map((member) => {
                      const hasWatched = member.watchedLessonIds.has(
                        normalizeLessonId(lesson.periodId)
                      );
                      return (
                        <li key={member.uid} className="flex items-center gap-2 text-sm">
                          <span aria-hidden>{hasWatched ? '✅' : '⬜'}</span>
                          <span className={hasWatched ? 'text-gray-900' : 'text-gray-400'}>
                            {member.name}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
