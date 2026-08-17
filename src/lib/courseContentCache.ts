// LS-1: SWR-кэш курс-данных (periods / clinical-topics / general-topics) в
// localStorage. Хуки рендерят сразу из кэша и обновляют его фоновым чтением из
// Firestore; админка инвалидирует кэш при правках контента.

const KEY_PREFIX = 'course-content-cache:';
export const COURSE_CONTENT_CACHE_VERSION = 1;
// Контент меняется редко, а фоновая ревалидация заменяет данные при каждом
// заходе — maxAge лишь страхует от показа совсем древнего кэша.
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const COURSE_CONTENT_CACHE_KEYS = {
  development: 'periods',
  clinical: 'clinical-topics',
  general: 'general-topics',
} as const;

interface CacheEnvelope<T> {
  v: number;
  savedAt: number;
  data: T;
}

function storageKey(key: string): string {
  return `${KEY_PREFIX}${key}`;
}

export function readCourseContentCache<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(storageKey(key));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CacheEnvelope<T> | null;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      parsed.v !== COURSE_CONTENT_CACHE_VERSION ||
      typeof parsed.savedAt !== 'number' ||
      Date.now() - parsed.savedAt > MAX_AGE_MS ||
      parsed.data === undefined
    ) {
      window.localStorage.removeItem(storageKey(key));
      return null;
    }

    return parsed.data;
  } catch {
    clearCourseContentCache(key);
    return null;
  }
}

export function writeCourseContentCache<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;

  try {
    const envelope: CacheEnvelope<T> = {
      v: COURSE_CONTENT_CACHE_VERSION,
      savedAt: Date.now(),
      data,
    };
    window.localStorage.setItem(storageKey(key), JSON.stringify(envelope));
  } catch {
    // quota / приватный режим — кэш опционален
  }
}

export function clearCourseContentCache(key: string): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(storageKey(key));
  } catch {
    // ignore storage failures
  }
}

// Живые экземпляры хуков подписаны сюда (по образцу invalidateCourses в
// useCourses): инвалидация чистит localStorage и заставляет каждый экземпляр
// перечитать данные из Firestore.
const invalidationListeners = new Map<string, Set<() => void | Promise<void>>>();

export function subscribeCourseContentInvalidation(
  key: string,
  listener: () => void | Promise<void>
): () => void {
  let listeners = invalidationListeners.get(key);
  if (!listeners) {
    listeners = new Set();
    invalidationListeners.set(key, listeners);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function invalidateCourseContent(key: string): Promise<void> {
  clearCourseContentCache(key);
  const listeners = invalidationListeners.get(key);
  if (!listeners?.size) return Promise.resolve();
  return Promise.all([...listeners].map((listener) => listener())).then(() => undefined);
}

/** Вход для админки: core-курсы инвалидируются по courseId, динамические этим кэшем не покрыты. */
export function invalidateCourseContentByCourseId(courseId: string): Promise<void> {
  const key = COURSE_CONTENT_CACHE_KEYS[courseId as keyof typeof COURSE_CONTENT_CACHE_KEYS];
  if (!key) return Promise.resolve();
  return invalidateCourseContent(key);
}
