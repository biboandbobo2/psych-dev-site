import { useEffect, useMemo, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAllGroups } from '../../../hooks/useAllGroups';
import { usePublishedLessonOptions } from '../../../hooks';
import { debugError } from '../../../lib/debug';

interface GroupWatchStatsProps {
  courseId: string;
}

interface MemberProgress {
  uid: string;
  name: string;
  watchedLessonIds: Set<string>;
}

function normalizeLessonId(lessonId: string): string {
  try {
    return decodeURIComponent(lessonId).trim();
  } catch {
    return lessonId.trim();
  }
}

async function loadMemberProgress(uid: string, courseId: string): Promise<MemberProgress> {
  const [userSnap, progressSnap] = await Promise.all([
    getDoc(doc(db, 'users', uid)),
    getDoc(doc(db, 'users', uid, 'courseProgress', courseId)),
  ]);

  const userData = userSnap.exists() ? userSnap.data() : {};
  const name =
    (typeof userData.displayName === 'string' && userData.displayName.trim()) ||
    (typeof userData.email === 'string' && userData.email) ||
    uid;

  const rawWatched = progressSnap.exists() ? progressSnap.data().watchedLessonIds : [];
  const watchedLessonIds = new Set(
    Array.isArray(rawWatched)
      ? rawWatched
          .filter((value): value is string => typeof value === 'string')
          .map(normalizeLessonId)
      : []
  );

  return { uid, name, watchedLessonIds };
}

/**
 * Загрузка прогресса всех участников с мягкой деградацией:
 * упавший участник не валит батч, а получает fallback-строку.
 */
export async function loadGroupProgress(
  memberIds: string[],
  courseId: string
): Promise<{ members: MemberProgress[]; failedCount: number }> {
  let failedCount = 0;
  const members = await Promise.all(
    memberIds.map((uid) =>
      loadMemberProgress(uid, courseId).catch((err): MemberProgress => {
        debugError('[GroupWatchStats] failed to load member progress', uid, err);
        failedCount += 1;
        return { uid, name: `${uid} (не загрузился)`, watchedLessonIds: new Set() };
      })
    )
  );
  return { members, failedCount };
}

/**
 * Статистика просмотров лекций по группе — для лектора курса.
 * Точечные чтения courseProgress участников (десятки чтений на открытие),
 * без серверной агрегации.
 */
export function GroupWatchStats({ courseId }: GroupWatchStatsProps) {
  const { groups } = useAllGroups();
  const { lessonsByCourse } = usePublishedLessonOptions();
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [members, setMembers] = useState<MemberProgress[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const targetGroups = useMemo(
    () => groups.filter((group) => group.id !== 'everyone' && !group.isSystem),
    [groups]
  );
  const lessons = lessonsByCourse[courseId] ?? [];
  const selectedGroup = targetGroups.find((group) => group.id === selectedGroupId) ?? null;

  useEffect(() => {
    setMembers([]);
    setLoadError(false);

    if (!selectedGroup || selectedGroup.memberIds.length === 0) {
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    loadGroupProgress(selectedGroup.memberIds, courseId)
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
  }, [courseId, selectedGroup]);

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
              {group.name} ({group.memberIds.length})
            </option>
          ))}
        </select>
      </div>

      {!selectedGroup ? (
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
