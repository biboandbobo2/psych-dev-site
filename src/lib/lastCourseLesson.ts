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
  const current = readStorage();
  current[courseId] = {
    path: normalizedPath,
    label: label?.trim() || undefined,
    updatedAt: new Date().toISOString(),
  };
  writeStorage(current);
}

export function getLastCourseLesson(courseId: string): LastCourseLesson | null {
  if (!courseId) return null;
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
  const current = readStorage();
  let bestId: string | null = null;
  let bestStamp = 0;
  for (const [courseId, item] of Object.entries(current)) {
    if (!item || typeof item.path !== 'string' || !item.path) continue;
    const ts = item.updatedAt ? Date.parse(item.updatedAt) : 0;
    if (Number.isFinite(ts) && ts > bestStamp) {
      bestStamp = ts;
      bestId = courseId;
    }
  }
  return bestId;
}

