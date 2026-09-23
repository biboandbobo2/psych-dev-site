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
 * courseId всех курсов с сохранённым последним уроком или точкой видео —
 * свежие первыми. Облако приоритетнее localStorage. На /home из этого списка
 * берётся первый доступный курс, когда актуальных нет.
 */
export function getRecentlyWatchedCourseIds(): string[] {
  const byRecency = (items: Array<{ courseId: string; updatedAt?: string; hasPath: boolean }>) =>
    items
      .filter((item) => item.hasPath)
      .map((item) => ({
        courseId: item.courseId,
        ts: item.updatedAt ? Date.parse(item.updatedAt) : 0,
      }))
      .filter((item) => Number.isFinite(item.ts) && item.ts > 0)
      .sort((a, b) => b.ts - a.ts)
      .map((item) => item.courseId);

  const cloud = readAllCloudProgress();
  if (cloud) {
    const cloudIds = byRecency(
      Object.entries(cloud).map(([courseId, doc]) => ({
        courseId,
        updatedAt: doc.lastLesson?.updatedAt ?? doc.videoResume?.updatedAt,
        hasPath: Boolean(doc.lastLesson?.path || doc.videoResume?.path),
      }))
    );
    if (cloudIds.length > 0) return cloudIds;
  }

  return byRecency(
    Object.entries(readStorage()).map(([courseId, item]) => ({
      courseId,
      updatedAt: item?.updatedAt,
      hasPath: Boolean(item?.path),
    }))
  );
}
