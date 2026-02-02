import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getDoc } from 'firebase/firestore';
import { PeriodPage } from './PeriodPage';
import NotFound from '../app/NotFound';
import { SITE_NAME } from '../routes';
import type { Period } from '../types/content';
import { getCourseLessonDocRef } from '../lib/courseLessons';
import { useCourseStore } from '../stores/useCourseStore';
import type { CourseType } from '../types/tests';

export default function DynamicCoursePeriodPage() {
  const { courseId, periodId } = useParams<{ courseId: string; periodId: string }>();
  const setCurrentCourse = useCourseStore((state) => state.setCurrentCourse);
  const [period, setPeriod] = useState<Period | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (courseId) {
      setCurrentCourse(courseId as CourseType);
    }
  }, [courseId, setCurrentCourse]);

  useEffect(() => {
    let cancelled = false;

    const loadPeriod = async () => {
      if (!courseId || !periodId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const docRef = getCourseLessonDocRef(courseId, periodId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          if (!cancelled) {
            setPeriod(null);
          }
          return;
        }
        const data = docSnap.data() as Period;
        if (!cancelled) {
          setPeriod({
            ...data,
            period: data.period || periodId,
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadPeriod();

    return () => {
      cancelled = true;
    };
  }, [courseId, periodId]);

  if (!courseId || !periodId) {
    return <NotFound />;
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!period || period.published === false) {
    return <NotFound />;
  }

  const config = {
    path: `/course/${courseId}/${periodId}`,
    navLabel: period.title,
    periodId,
    themeKey: courseId,
    placeholderDefaultEnabled: false,
    meta: {
      title: `${period.title} — ${SITE_NAME}`,
      description: period.subtitle || '',
    },
  };

  return <PeriodPage config={config} period={period} />;
}
