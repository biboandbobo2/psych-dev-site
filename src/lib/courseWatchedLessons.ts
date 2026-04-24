const STORAGE_KEY = 'course-watched-lessons-v1';

type WatchedLessonsMap = Record<string, string[]>;

function normalizeLessonId(lessonId: string): string {
  return decodeURIComponent(lessonId).trim();
}

function readStorage(): WatchedLessonsMap {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as WatchedLessonsMap;
  } catch {
    return {};
  }
}

function writeStorage(data: WatchedLessonsMap): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore storage write failures
  }
}

export function getWatchedLessonIds(courseId: string): Set<string> {
  if (!courseId) return new Set();

  const data = readStorage();
  const values = Array.isArray(data[courseId]) ? data[courseId] : [];

  return new Set(
    values
      .filter((value): value is string => typeof value === 'string')
      .map((value) => normalizeLessonId(value))
      .filter(Boolean)
  );
}

export function isLessonWatched(courseId: string, lessonId: string): boolean {
  if (!courseId || !lessonId) return false;
  return getWatchedLessonIds(courseId).has(normalizeLessonId(lessonId));
}

export function markLessonWatched(courseId: string, lessonId: string): boolean {
  if (!courseId || !lessonId) return false;

  const normalizedLessonId = normalizeLessonId(lessonId);
  if (!normalizedLessonId) return false;

  const current = readStorage();
  const watched = new Set(
    (Array.isArray(current[courseId]) ? current[courseId] : [])
      .filter((value): value is string => typeof value === 'string')
      .map((value) => normalizeLessonId(value))
      .filter(Boolean)
  );

  const sizeBefore = watched.size;
  watched.add(normalizedLessonId);
  if (watched.size === sizeBefore) return false;

  current[courseId] = [...watched];
  writeStorage(current);
  return true;
}

export function unmarkLessonWatched(courseId: string, lessonId: string): boolean {
  if (!courseId || !lessonId) return false;

  const normalizedLessonId = normalizeLessonId(lessonId);
  if (!normalizedLessonId) return false;

  const current = readStorage();
  const watched = new Set(
    (Array.isArray(current[courseId]) ? current[courseId] : [])
      .filter((value): value is string => typeof value === 'string')
      .map((value) => normalizeLessonId(value))
      .filter(Boolean)
  );

  const changed = watched.delete(normalizedLessonId);
  if (!changed) return false;

  current[courseId] = [...watched];
  writeStorage(current);
  return true;
}
