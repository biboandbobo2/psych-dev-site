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

      const dynamicCourses: CourseOption[] = snapshot.docs
        .map((docSnap, index) => {
          const data = docSnap.data() as Record<string, unknown>;
          const name = typeof data.name === 'string' && data.name.trim()
            ? data.name.trim()
            : typeof data.title === 'string' && data.title.trim()
            ? data.title.trim()
            : docSnap.id;
          const icon = typeof data.icon === 'string' && data.icon.trim()
            ? data.icon.trim()
            : '🎓';
          const order = typeof data.order === 'number'
            ? data.order
            : 100 + index;
          const published = data.published !== false;

          return {
            id: docSnap.id,
            name,
            icon,
            order,
            published,
            isCore: false,
          };
        })
        .filter((course) => !isCoreCourse(course.id));

      const coreCourses = CORE_COURSE_LIST.map((course, index) => ({
        id: course.id,
        name: course.name,
        icon: course.icon,
        order: index,
        published: true,
        isCore: true,
      }));

      const merged = [...coreCourses, ...dynamicCourses]
        .filter((course) => includeUnpublished || course.published !== false)
        .sort((a, b) => {
          if (a.order !== b.order) {
            return a.order - b.order;
          }
          return a.name.localeCompare(b.name, 'ru');
        });

      setCourses(merged);
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
