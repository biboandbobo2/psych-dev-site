import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getDoc, getDocs, orderBy, query } from 'firebase/firestore';
import { PeriodPage } from './PeriodPage';
import NotFound from '../app/NotFound';
import { SITE_NAME } from '../routes';
import type { Period } from '../types/content';
import {
  getCourseLessonDocRef,
  getCourseLessonsCollectionRef,
  mapCanonicalCourseLessons,
  sortCourseLessonItems,
} from '../lib/courseLessons';
import { useCourseStore } from '../stores/useCourseStore';
import type { CourseType } from '../types/tests';
import { useCourses } from '../hooks/useCourses';

type DynamicIntroState = {
  startPath: string;
  firstLessonTitle: string;
};

const DEFAULT_DYNAMIC_INTRO_PLACEHOLDER =
  'Это главная страница курса. Ознакомьтесь со структурой обучения и переходите к первому занятию.';

export default function DynamicCoursePeriodPage() {
  const { courseId, periodId } = useParams<{ courseId: string; periodId: string }>();
  const setCurrentCourse = useCourseStore((state) => state.setCurrentCourse);
  const { courseMap } = useCourses();
  const [period, setPeriod] = useState<Period | null>(null);
  const [dynamicIntro, setDynamicIntro] = useState<DynamicIntroState | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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
        setNotFound(true);
        return;
      }

      try {
        setLoading(true);
        setNotFound(false);
        setDynamicIntro(null);
        setPeriod(null);

        const docRef = getCourseLessonDocRef(courseId, periodId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as Period;
          if (!cancelled) {
            setPeriod({
              ...data,
              period: data.period || periodId,
            });
          }
          return;
        }

        if (periodId !== 'intro') {
          if (!cancelled) {
            setNotFound(true);
          }
          return;
        }

        const lessonsRef = getCourseLessonsCollectionRef(courseId);
        const lessonsSnapshot = await getDocs(query(lessonsRef, orderBy('order', 'asc')));
        const canonicalLessons = mapCanonicalCourseLessons(courseId, lessonsSnapshot.docs)
          .filter((lesson) => lesson.published !== false);
        const sortedLessons = sortCourseLessonItems(courseId, canonicalLessons);
        const firstLesson = sortedLessons.find((lesson) => lesson.period !== 'intro') ?? sortedLessons[0];

        if (!firstLesson) {
          if (!cancelled) {
            setNotFound(true);
          }
          return;
        }

        if (!cancelled) {
          setDynamicIntro({
            startPath: `/course/${encodeURIComponent(courseId)}/${encodeURIComponent(firstLesson.period)}`,
            firstLessonTitle: firstLesson.title || firstLesson.label || 'Первое занятие курса',
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadPeriod();

    return () => {
      cancelled = true;
    };
  }, [courseId, periodId]);

  const decodedCourseId = useMemo(() => {
    if (!courseId) return 'Курс';
    try {
      return decodeURIComponent(courseId);
    } catch {
      return courseId;
    }
  }, [courseId]);

  const courseName = (courseId && courseMap.get(courseId)?.name) || decodedCourseId;

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

  if (notFound) {
    return <NotFound />;
  }

  if (dynamicIntro) {
    const config = {
      path: `/course/${courseId}/intro`,
      navLabel: courseName,
      periodId: 'dynamic-intro',
      themeKey: courseId,
      placeholderDefaultEnabled: false,
      placeholderText: DEFAULT_DYNAMIC_INTRO_PLACEHOLDER,
      startCoursePath: dynamicIntro.startPath,
      startCourseLabel: `Начните с темы «${dynamicIntro.firstLessonTitle}»`,
      startCourseDescription:
        'Это вводная страница курса. Нажмите кнопку ниже, чтобы перейти к первой теме и начать обучение.',
      meta: {
        title: `${courseName} — ${SITE_NAME}`,
        description: `Вводная страница курса ${courseName}.`,
      },
    };

    return <PeriodPage config={config} period={null} />;
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
