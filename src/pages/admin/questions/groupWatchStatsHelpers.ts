import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { debugError } from '../../../lib/debug';

export interface MemberProgress {
  uid: string;
  name: string;
  watchedLessonIds: Set<string>;
}

export function normalizeLessonId(lessonId: string): string {
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
