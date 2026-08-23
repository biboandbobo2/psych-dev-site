import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Period } from '../types/content';
import { debugError } from '../lib/debug';
import { buildCourseNavItems, type CourseNavItem } from '../lib/courseNavItems';
import {
  courseNavCacheKey,
  fetchCourseNavIndexDoc,
  loadCourseNavIndexItems,
  withTimeout,
  type CourseNavIndexItem,
} from '../lib/courseNavIndex';
import {
  readCourseContentCache,
  writeCourseContentCache,
  subscribeCourseContentInvalidation,
} from '../lib/courseContentCache';

export { buildCourseNavItems };

// LS-3: сначала лёгкий nav-индекс (1 маленький doc-read), fallback — полная
// коллекция уроков (как до LS-3). Всё под таймаутом: зависший getDocs раньше
// застревал в in-flight кэше навсегда — «вечная Загрузка занятий…» до
// перезагрузки страницы. SWR-кэш в localStorage даёт мгновенный рендер шторки.
const LOAD_TIMEOUT_MS = 8000;

const NAV_REQUESTS = new Map<string, Promise<CourseNavIndexItem[]>>();

async function loadNavItems(courseId: string): Promise<CourseNavIndexItem[]> {
  const inFlight = NAV_REQUESTS.get(courseId);
  if (inFlight) return inFlight;

  const request = (async () => {
    let indexed: CourseNavIndexItem[] | null = null;
    try {
      const indexDoc = await withTimeout(
        fetchCourseNavIndexDoc(courseId),
        LOAD_TIMEOUT_MS,
        `navIndex:${courseId}`
      );
      indexed = indexDoc?.items ?? null;
    } catch (error) {
      debugError('[useCourseNavItems] Nav index read failed, falling back to lessons', {
        courseId,
        error,
      });
    }
    if (indexed) return indexed;

    return withTimeout(loadCourseNavIndexItems(courseId), LOAD_TIMEOUT_MS, `lessons:${courseId}`);
  })().finally(() => {
    NAV_REQUESTS.delete(courseId);
  });

  NAV_REQUESTS.set(courseId, request);
  return request;
}

function toTopicsMap(items: CourseNavIndexItem[]): Map<string, Period> {
  const topics = new Map<string, Period>();
  items.forEach((item) => {
    topics.set(item.id, {
      period: item.id,
      title: item.title,
      order: item.order,
      published: true,
    } as Period);
  });
  return topics;
}

export function resetCourseNavItemsCacheForTests() {
  NAV_REQUESTS.clear();
}

interface NavItemsState {
  items: CourseNavIndexItem[];
  loading: boolean;
  error: Error | null;
}

export function useCourseNavItems(courseId: string | null) {
  const [state, setState] = useState<NavItemsState>(() => {
    const cached = courseId
      ? readCourseContentCache<CourseNavIndexItem[]>(courseNavCacheKey(courseId))
      : null;
    return { items: cached ?? [], loading: Boolean(courseId) && !cached, error: null };
  });
  const activeCourseIdRef = useRef(courseId);
  activeCourseIdRef.current = courseId;

  const loadLessons = useCallback(async () => {
    if (!courseId) {
      setState({ items: [], loading: false, error: null });
      return;
    }

    const cached = readCourseContentCache<CourseNavIndexItem[]>(courseNavCacheKey(courseId));
    setState((prev) => ({
      items: cached ?? (activeCourseIdRef.current === courseId ? prev.items : []),
      loading: !cached,
      error: null,
    }));

    try {
      const items = await loadNavItems(courseId);
      if (activeCourseIdRef.current !== courseId) return;
      writeCourseContentCache(courseNavCacheKey(courseId), items);
      setState({ items, loading: false, error: null });
    } catch (err) {
      debugError('[useCourseNavItems] Failed to load course lessons', { courseId, error: err });
      if (activeCourseIdRef.current !== courseId) return;
      // Ошибка ревалидации не перекрывает уже показанный кэш
      setState((prev) => ({
        items: prev.items,
        loading: false,
        error: prev.items.length ? null : (err as Error),
      }));
    }
  }, [courseId]);

  useEffect(() => {
    void loadLessons();
    if (!courseId) return;
    return subscribeCourseContentInvalidation(courseNavCacheKey(courseId), loadLessons);
  }, [loadLessons, courseId]);

  const items = useMemo<CourseNavItem[]>(
    () => buildCourseNavItems(courseId, toTopicsMap(state.items)),
    [courseId, state.items]
  );

  return { items, loading: state.loading, error: state.error, reload: loadLessons };
}
