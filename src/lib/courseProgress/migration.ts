import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { debugError } from '../debug';
import type { CloudCourseProgress, CloudLastLesson, CloudVideoResume } from './types';

const LAST_LESSON_KEY = 'course-last-lesson-v1';
const VIDEO_RESUME_KEY = 'course-video-resume-v1';
const WATCHED_KEY = 'course-watched-lessons-v1';
const MIGRATION_FLAG_PREFIX = 'course-progress-migrated-';

/**
 * Однократно при первом логине заливает уже накопленный в localStorage
 * прогресс в Firestore, если в облаке у пользователя ещё пусто. После
 * успеха ставит флаг в localStorage, чтобы не запускать повторно.
 */
export async function migrateLocalProgressIfNeeded(uid: string): Promise<void> {
  if (!uid || typeof window === 'undefined') return;

  const flagKey = `${MIGRATION_FLAG_PREFIX}${uid}`;
  if (window.localStorage.getItem(flagKey)) return;

  try {
    const colRef = collection(db, 'users', uid, 'courseProgress');
    const existing = await getDocs(colRef);
    if (!existing.empty) {
      window.localStorage.setItem(flagKey, '1');
      return;
    }

    const lastLessonMap = readJson<Record<string, CloudLastLesson>>(LAST_LESSON_KEY) ?? {};
    const videoResumeMap = readJson<Record<string, CloudVideoResume>>(VIDEO_RESUME_KEY) ?? {};
    const watchedMap = readJson<Record<string, string[]>>(WATCHED_KEY) ?? {};

    const courseIds = new Set<string>([
      ...Object.keys(lastLessonMap),
      ...Object.keys(videoResumeMap),
      ...Object.keys(watchedMap),
    ]);

    if (courseIds.size === 0) {
      window.localStorage.setItem(flagKey, '1');
      return;
    }

    const batch = writeBatch(db);
    for (const courseId of courseIds) {
      const payload: Partial<CloudCourseProgress> & {
        updatedAt: ReturnType<typeof serverTimestamp>;
      } = {
        updatedAt: serverTimestamp(),
      };
      const ll = lastLessonMap[courseId];
      if (ll && typeof ll.path === 'string' && ll.path) {
        payload.lastLesson = ll;
      }
      const vr = videoResumeMap[courseId];
      if (vr && vr.path && vr.videoId && Number.isFinite(vr.timeSec)) {
        payload.videoResume = vr;
      }
      const watched = watchedMap[courseId];
      if (Array.isArray(watched) && watched.length > 0) {
        payload.watchedLessonIds = watched.filter(
          (s): s is string => typeof s === 'string',
        );
      }
      batch.set(doc(db, 'users', uid, 'courseProgress', courseId), payload, {
        merge: true,
      });
    }
    await batch.commit();
    window.localStorage.setItem(flagKey, '1');
  } catch (err) {
    debugError('courseProgress: migration failed', err);
  }
}

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as T;
  } catch {
    return null;
  }
}
