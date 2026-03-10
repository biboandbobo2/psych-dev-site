import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
  type CollectionReference,
  type DocumentReference,
  type DocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Period } from '../types/content';
import { CORE_COURSE_META, isCoreCourse } from '../constants/courses';
import { canonicalizePeriodId } from './firestoreHelpers';
import { ROUTE_CONFIG, CLINICAL_ROUTE_CONFIG, GENERAL_ROUTE_CONFIG } from '../routes';

export { buildCourseLessonPath } from './courseLessonPaths';

const normalizeLessonId = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const FALLBACK_ORDER = Number.MAX_SAFE_INTEGER;

type LessonDocLike<T extends Partial<Period>> = {
  id: string;
  data: () => T;
};

type CoreRouteConfig = typeof ROUTE_CONFIG;

export function getCourseLessonsCollectionRef(courseId: string): CollectionReference<Period> {
  if (isCoreCourse(courseId)) {
    return collection(db, CORE_COURSE_META[courseId].collection) as CollectionReference<Period>;
  }
  return collection(db, 'courses', courseId, 'lessons') as CollectionReference<Period>;
}

export function getCourseLessonDocRef(courseId: string, periodId: string): DocumentReference<Period> {
  if (isCoreCourse(courseId)) {
    const lessonId = courseId === 'development' ? canonicalizePeriodId(periodId) : periodId;
    return doc(db, CORE_COURSE_META[courseId].collection, lessonId) as DocumentReference<Period>;
  }
  return doc(db, 'courses', courseId, 'lessons', periodId) as DocumentReference<Period>;
}

export function getCanonicalCourseLessonId(
  courseId: string,
  docId: string,
  data?: Partial<Period> | null
): string {
  const storedLessonId = normalizeLessonId(data?.period);
  const fallbackLessonId = normalizeLessonId(docId);
  const resolvedLessonId = storedLessonId || fallbackLessonId;

  return courseId === 'development'
    ? canonicalizePeriodId(resolvedLessonId)
    : resolvedLessonId;
}

export function getCoreCourseRoutes(courseId: string): CoreRouteConfig {
  return courseId === 'clinical' ? CLINICAL_ROUTE_CONFIG :
    courseId === 'general' ? GENERAL_ROUTE_CONFIG :
    courseId === 'development' ? ROUTE_CONFIG :
    [];
}

export function getLessonRouteOrderMap(courseId: string): Record<string, number> {
  return getCoreCourseRoutes(courseId).reduce(
    (acc, config, index) => {
      if (config.periodId) {
        acc[config.periodId] = index;
      }
      return acc;
    },
    {} as Record<string, number>
  );
}

export function mapCanonicalCourseLessons<T extends Partial<Period>>(
  courseId: string,
  docs: Array<LessonDocLike<T>>
): Array<T & { period: string; sourceDocId: string }> {
  const lessonMap = new Map<string, (T & { period: string; sourceDocId: string })>();

  docs.forEach((docSnap) => {
    const docData = docSnap.data();
    const lessonId = getCanonicalCourseLessonId(courseId, docSnap.id, docData);
    const current = lessonMap.get(lessonId);
    const nextIsCanonicalDoc = docSnap.id === lessonId;
    const currentIsCanonicalDoc = current?.sourceDocId === lessonId;

    if (current && currentIsCanonicalDoc && !nextIsCanonicalDoc) {
      return;
    }

    lessonMap.set(lessonId, {
      ...docData,
      period: lessonId,
      sourceDocId: docSnap.id,
    });
  });

  return [...lessonMap.values()];
}

export function sortCourseLessonItems<
  T extends {
    period: string;
    order?: number;
    title?: string;
    label?: string;
    published?: boolean;
  }
>(
  courseId: string,
  items: T[],
  options: { draftsLast?: boolean } = {}
): T[] {
  const { draftsLast = false } = options;
  const routeOrderMap = getLessonRouteOrderMap(courseId);

  return [...items].sort((a, b) => {
    if (draftsLast) {
      const draftRankA = a.published === false ? 1 : 0;
      const draftRankB = b.published === false ? 1 : 0;
      if (draftRankA !== draftRankB) {
        return draftRankA - draftRankB;
      }
    }

    const orderA = typeof a.order === 'number' ? a.order : routeOrderMap[a.period] ?? FALLBACK_ORDER;
    const orderB = typeof b.order === 'number' ? b.order : routeOrderMap[b.period] ?? FALLBACK_ORDER;
    if (orderA !== orderB) {
      return orderA - orderB;
    }

    const fallbackOrderA = routeOrderMap[a.period] ?? FALLBACK_ORDER;
    const fallbackOrderB = routeOrderMap[b.period] ?? FALLBACK_ORDER;
    if (fallbackOrderA !== fallbackOrderB) {
      return fallbackOrderA - fallbackOrderB;
    }

    return String(a.title || a.label || a.period).localeCompare(
      String(b.title || b.label || b.period),
      'ru'
    );
  });
}

export function sortNavItemsWithRouteFallback<
  T extends {
    path: string;
    order?: number;
    label?: string;
  }
>(
  routes: Array<{ path: string }>,
  items: T[]
): T[] {
  const routeOrderMap = new Map(routes.map((route, index) => [route.path, index]));

  return [...items].sort((a, b) => {
    const orderA = typeof a.order === 'number' ? a.order : FALLBACK_ORDER;
    const orderB = typeof b.order === 'number' ? b.order : FALLBACK_ORDER;
    if (orderA !== orderB) {
      return orderA - orderB;
    }

    const routeOrderA = routeOrderMap.get(a.path) ?? FALLBACK_ORDER;
    const routeOrderB = routeOrderMap.get(b.path) ?? FALLBACK_ORDER;
    if (routeOrderA !== routeOrderB) {
      return routeOrderA - routeOrderB;
    }

    return String(a.label || a.path).localeCompare(String(b.label || b.path), 'ru');
  });
}

export async function findCourseLessonDoc(
  courseId: string,
  lessonId: string
): Promise<{ ref: DocumentReference<Period>; snapshot: DocumentSnapshot<Period> } | null> {
  const directRef = getCourseLessonDocRef(courseId, lessonId);
  const directSnapshot = await getDoc(directRef);

  if (directSnapshot.exists()) {
    return { ref: directRef, snapshot: directSnapshot };
  }

  if (!isCoreCourse(courseId)) {
    return null;
  }

  const normalizedLessonId = normalizeLessonId(lessonId);
  if (!normalizedLessonId) {
    return null;
  }

  const lessonsRef = getCourseLessonsCollectionRef(courseId);
  const snapshot = await getDocs(
    query(lessonsRef, where('period', '==', normalizedLessonId), limit(1))
  );

  if (snapshot.empty) {
    return null;
  }

  const matchedDoc = snapshot.docs[0];
  return {
    ref: matchedDoc.ref as DocumentReference<Period>,
    snapshot: matchedDoc,
  };
}
