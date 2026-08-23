import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CORE_COURSE_LIST, isCoreCourse } from '../constants/courses';
import { isPublicRestAvailable, restListPublicCollection } from '../lib/firestorePublicRest';
import { debugError } from '../lib/debug';

export interface CourseOption {
  id: string;
  name: string;
  icon: string;
  order: number;
  published: boolean;
  isCore?: boolean;
}

interface UseCoursesOptions {
  includeUnpublished?: boolean;
}

interface CourseDocInput {
  id: string;
  data: Record<string, unknown>;
}

// Все живые экземпляры useCourses подписаны сюда: invalidateCourses()
// заставляет каждый перечитать список. Нужно, потому что у сайдбара и
// страниц — независимые экземпляры хука, и reload() только одного из них
// оставлял остальным устаревший список (например, без только что
// созданного курса).
const reloadListeners = new Set<() => Promise<void>>();

export function invalidateCourses(): Promise<void> {
  return Promise.all([...reloadListeners].map((listener) => listener())).then(() => undefined);
}

const resolveCourseName = (courseId: string, data: Record<string, unknown>, fallback: string) => {
  if (typeof data.name === 'string' && data.name.trim()) return data.name.trim();
  if (typeof data.title === 'string' && data.title.trim()) return data.title.trim();
  return fallback || courseId;
};

const resolveCourseIcon = (data: Record<string, unknown>, fallback: string) => {
  if (typeof data.icon === 'string' && data.icon.trim()) return data.icon.trim();
  return fallback;
};

export function buildCourseOptions(courseDocs: CourseDocInput[], includeUnpublished: boolean): CourseOption[] {
  const docsById = new Map(courseDocs.map((doc) => [doc.id, doc.data]));

  const coreCourses = CORE_COURSE_LIST.map((course, index) => {
    const override = docsById.get(course.id) ?? {};
    const order = typeof override.order === 'number' ? override.order : index;
    return {
      id: course.id,
      name: resolveCourseName(course.id, override, course.name),
      icon: resolveCourseIcon(override, course.icon),
      order,
      published: true,
      isCore: true,
    } as CourseOption;
  });

  const dynamicCourses = courseDocs
    .filter((doc) => !isCoreCourse(doc.id))
    .map((doc, index) => {
      const name = resolveCourseName(doc.id, doc.data, doc.id);
      const icon = resolveCourseIcon(doc.data, '🎓');
      const order = typeof doc.data.order === 'number'
        ? doc.data.order
        : 100 + index;
      const published = doc.data.published !== false;
      return {
        id: doc.id,
        name,
        icon,
        order,
        published,
        isCore: false,
      } as CourseOption;
    });

  return [...coreCourses, ...dynamicCourses]
    .filter((course) => includeUnpublished || course.published !== false)
    .sort((a, b) => {
      if (a.order !== b.order) {
        return a.order - b.order;
      }
      return a.name.localeCompare(b.name, 'ru');
    });
}

export function useCourses(options: UseCoursesOptions = {}) {
  const { includeUnpublished = false } = options;
  const [courses, setCourses] = useState<CourseOption[]>(() =>
    CORE_COURSE_LIST.map((course, index) => ({
      id: course.id,
      name: course.name,
      icon: course.icon,
      order: index,
      published: true,
      isCore: true,
    }))
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  // LS-4: SDK — источник истины; REST-префетч применяется, только пока SDK
  // ещё не отдал список
  const sdkDeliveredRef = useRef(false);

  const loadCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const snapshot = await getDocs(collection(db, 'courses'));
      const docs = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        data: docSnap.data() as Record<string, unknown>,
      }));

      sdkDeliveredRef.current = true;
      setCourses(buildCourseOptions(docs, includeUnpublished));
    } catch (err) {
      debugError('Error loading courses', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [includeUnpublished]);

  useEffect(() => {
    loadCourses();
    reloadListeners.add(loadCourses);
    return () => {
      reloadListeners.delete(loadCourses);
    };
  }, [loadCourses]);

  // LS-4: публичный список курсов REST-запросом сразу, не дожидаясь
  // инициализации Firebase Auth (SDK не шлёт запросы до неё — на первом
  // визите это ~0,5–2 с). Гостевой /home целиком ждёт useCourses, поэтому
  // это его LCP. Ошибка REST-пути молча оставляет прежнее поведение.
  useEffect(() => {
    if (!isPublicRestAvailable()) return;
    let cancelled = false;
    restListPublicCollection('courses')
      .then((docs) => {
        if (cancelled || sdkDeliveredRef.current || docs.length === 0) return;
        setCourses(buildCourseOptions(docs, includeUnpublished));
        setError(null);
        setLoading(false);
      })
      .catch(() => {
        // SDK-путь остаётся источником истины
      });
    return () => {
      cancelled = true;
    };
  }, [includeUnpublished]);

  const courseMap = useMemo(() => {
    const map = new Map<string, CourseOption>();
    courses.forEach((course) => map.set(course.id, course));
    return map;
  }, [courses]);

  return { courses, courseMap, loading, error, reload: invalidateCourses };
}
