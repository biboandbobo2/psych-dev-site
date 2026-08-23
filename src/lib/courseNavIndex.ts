// LS-3: лёгкий nav-индекс курса — один маленький док courseNavIndex/{courseId}
// (только id/title/order опубликованных занятий) вместо чтения полной коллекции
// уроков ради списка навигации. Пересобирается админ-хуками после мутаций
// контента; клиент читает его в useCourseNavItems с fallback на полную коллекцию.

import { doc, getDoc, getDocs, orderBy, query, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { Period } from '../types/content';
import { debugError } from './debug';
import { getCourseLessonsCollectionRef, mapCanonicalCourseLessons } from './courseLessons';
import { isCourseOpen } from './courseOpenness';
import { invalidateCourseContent } from './courseContentCache';

export interface CourseNavIndexItem {
  id: string; // канонический lesson id (period)
  title: string;
  order?: number;
}

export interface CourseNavIndexDoc {
  v: number;
  updatedAt: string;
  items: CourseNavIndexItem[];
  /** «Открытость» курса (isCourseOpen): все published-уроки с публичными видео. */
  courseOpen?: boolean;
}

export const COURSE_NAV_INDEX_VERSION = 1;

/** Ключ localStorage SWR-кэша (см. courseContentCache). */
export function courseNavCacheKey(courseId: string): string {
  return `nav-index:${courseId}`;
}

function courseNavIndexDocRef(courseId: string) {
  return doc(db, 'courseNavIndex', courseId);
}

/** Firestore SDK может висеть бесконечно (offline) — все чтения навигации под таймаутом. */
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout after ${ms}ms: ${label}`));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function toNavIndexItem(lesson: {
  period: string;
  title?: string;
  label?: string;
  order?: number;
}): CourseNavIndexItem {
  return {
    id: lesson.period,
    // Приоритет как в buildCourseNavItems: label || title
    title: lesson.label || lesson.title || lesson.period,
    ...(typeof lesson.order === 'number' ? { order: lesson.order } : {}),
  };
}

/** null — индекса нет или он невалиден: вызывающий уходит в fallback на полную коллекцию. */
export async function fetchCourseNavIndexDoc(
  courseId: string
): Promise<Pick<CourseNavIndexDoc, 'items' | 'courseOpen'> | null> {
  const snapshot = await getDoc(courseNavIndexDocRef(courseId));
  if (!snapshot.exists()) return null;

  const data = snapshot.data() as Partial<CourseNavIndexDoc> | undefined;
  if (!data || data.v !== COURSE_NAV_INDEX_VERSION || !Array.isArray(data.items)) return null;

  return {
    items: data.items.filter(
      (item): item is CourseNavIndexItem =>
        Boolean(item) && typeof item.id === 'string' && typeof item.title === 'string'
    ),
    ...(typeof data.courseOpen === 'boolean' ? { courseOpen: data.courseOpen } : {}),
  };
}

/** Опубликованные уроки курса из полной коллекции (fallback-путь и пересборка индекса). */
export async function loadPublishedCourseLessons(courseId: string): Promise<Period[]> {
  const snapshot = await getDocs(
    query(getCourseLessonsCollectionRef(courseId), orderBy('order', 'asc'))
  );
  return mapCanonicalCourseLessons(courseId, snapshot.docs).filter(
    (lesson) => lesson.published !== false
  ) as Period[];
}

/** Строит элементы индекса из полной коллекции уроков курса (только опубликованные). */
export async function loadCourseNavIndexItems(courseId: string): Promise<CourseNavIndexItem[]> {
  return (await loadPublishedCourseLessons(courseId)).map(toNavIndexItem);
}

/**
 * Пересобирает и сохраняет индекс; вызывается админ-хуками после сохранения,
 * удаления и reorder уроков. Fire-and-forget: ошибка не должна ломать сейв,
 * шторка переживёт устаревший индекс (fallback + следующая правка перезапишет).
 */
export async function rebuildCourseNavIndex(courseId: string): Promise<void> {
  try {
    const lessons = await loadPublishedCourseLessons(courseId);
    const payload: CourseNavIndexDoc = {
      v: COURSE_NAV_INDEX_VERSION,
      updatedAt: new Date().toISOString(),
      items: lessons.map(toNavIndexItem),
      courseOpen: isCourseOpen(lessons),
    };
    await setDoc(courseNavIndexDocRef(courseId), payload);
    await invalidateCourseContent(courseNavCacheKey(courseId));
  } catch (error) {
    debugError('[courseNavIndex] Failed to rebuild index', { courseId, error });
  }
}
