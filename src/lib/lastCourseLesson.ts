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

