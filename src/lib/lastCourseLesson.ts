import {
  readAllCloudProgress,
  readCloudProgress,
  scheduleLastLessonUpload,
} from './courseProgress/cloudSync';

const STORAGE_KEY = 'course-last-lesson-v1';

export interface LastCourseLesson {
  path: string;
  label?: string;
  updatedAt: string;
}

type LastCourseLessonMap = Record<string, LastCourseLesson>;

function readStorage(): LastCourseLessonMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as LastCourseLessonMap;
  } catch {
    return {};
  }
}

function writeStorage(data: LastCourseLessonMap): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore storage write failures
  }
}

export function saveLastCourseLesson(courseId: string, path: string, label?: string): void {
  if (!courseId || !path) return;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const entry: LastCourseLesson = {
    path: normalizedPath,
    label: label?.trim() || undefined,
    updatedAt: new Date().toISOString(),
  };
  const current = readStorage();
  current[courseId] = entry;
  writeStorage(current);
  scheduleLastLessonUpload(courseId, entry);
}

export function getLastCourseLesson(courseId: string): LastCourseLesson | null {
  if (!courseId) return null;
  const cloud = readCloudProgress(courseId)?.lastLesson;
  if (cloud && typeof cloud.path === 'string' && cloud.path) {
    return {
      path: cloud.path,
      label: cloud.label,
      updatedAt: cloud.updatedAt,
    };
  }
  const current = readStorage();
  const item = current[courseId];
  if (!item || typeof item.path !== 'string' || !item.path) return null;
  return item;
}

/**
 * Возвращает courseId с самой свежей `updatedAt` среди сохранённых записей.
 * Используется на /home чтобы выбрать «продолжить» один курс, когда у
 * пользователя нет личных/групповых featured-настроек. Если сохранений нет —
 * возвращает null.
 */
export function getMostRecentlyWatchedCourseId(): string | null {
  let bestId: string | null = null;
  let bestStamp = 0;
  const consider = (courseId: string, updatedAt: string | undefined, hasPath: boolean): void => {
    if (!hasPath) return;
    const ts = updatedAt ? Date.parse(updatedAt) : 0;
    if (Number.isFinite(ts) && ts > bestStamp) {
      bestStamp = ts;
      bestId = courseId;
    }
  };

  const cloud = readAllCloudProgress();
  if (cloud) {
    for (const [courseId, doc] of Object.entries(cloud)) {
      const ll = doc.lastLesson;
      const vr = doc.videoResume;
      const updatedAt = ll?.updatedAt ?? vr?.updatedAt;
      consider(courseId, updatedAt, Boolean(ll?.path || vr?.path));
    }
    if (bestId) return bestId;
  }

  const local = readStorage();
  for (const [courseId, item] of Object.entries(local)) {
    consider(courseId, item?.updatedAt, Boolean(item?.path));
  }
  return bestId;
}

