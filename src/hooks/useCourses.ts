import { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CORE_COURSE_LIST, isCoreCourse } from '../constants/courses';
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

  const loadCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const q = query(collection(db, 'courses'), orderBy('order', 'asc'));
      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        data: docSnap.data() as Record<string, unknown>,
      }));

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
  }, [loadCourses]);

  const courseMap = useMemo(() => {
    const map = new Map<string, CourseOption>();
    courses.forEach((course) => map.set(course.id, course));
    return map;
  }, [courses]);

  return { courses, courseMap, loading, error, reload: loadCourses };
}
