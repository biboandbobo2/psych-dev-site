import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { debugError } from '../../../lib/debug';
import type { CloudLessonVideoStats } from '../../../lib/courseProgress/types';

export interface GroupMember {
  uid: string;
  name: string;
}

export interface MemberProgress extends GroupMember {
  /** Занятия с просмотренной главной лекцией. */
  watchedLessonIds: Set<string>;
  /** Просмотры и переходы на YouTube по каждому видео занятий. */
  videoStats: CloudLessonVideoStats;
}

export function normalizeLessonId(lessonId: string): string {
  try {
    return decodeURIComponent(lessonId).trim();
  } catch {
    return lessonId.trim();
  }
}

/**
 * Имя участника приходит из callable `getCourseStudents` — читать `users/{uid}`
 * админу курса нельзя. Здесь остаётся только прогресс по курсу.
 */
async function loadMemberProgress(
  member: GroupMember,
  courseId: string
): Promise<MemberProgress> {
  const progressSnap = await getDoc(doc(db, 'users', member.uid, 'courseProgress', courseId));

  const data = progressSnap.exists() ? progressSnap.data() : {};
  const rawWatched = data.watchedLessonIds;
  const rawVideoStats = data.videoStats;
  const watchedLessonIds = new Set(
    Array.isArray(rawWatched)
      ? rawWatched
          .filter((value): value is string => typeof value === 'string')
          .map(normalizeLessonId)
      : []
  );

  const videoStats =
    rawVideoStats && typeof rawVideoStats === 'object' && !Array.isArray(rawVideoStats)
      ? (rawVideoStats as CloudLessonVideoStats)
      : {};

  return { ...member, watchedLessonIds, videoStats };
}

/**
 * Загрузка прогресса всех участников с мягкой деградацией:
 * упавший участник не валит батч, а получает fallback-строку.
 */
export async function loadGroupProgress(
  members: GroupMember[],
  courseId: string
): Promise<{ members: MemberProgress[]; failedCount: number }> {
  let failedCount = 0;
  const loaded = await Promise.all(
    members.map((member) =>
      loadMemberProgress(member, courseId).catch((err): MemberProgress => {
        debugError('[CourseStudents] failed to load member progress', member.uid, err);
        failedCount += 1;
        return {
          ...member,
          name: `${member.name} (не загрузился)`,
          watchedLessonIds: new Set(),
          videoStats: {},
        };
      })
    )
  );
  return { members: loaded, failedCount };
}
