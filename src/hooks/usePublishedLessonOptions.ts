import { useEffect, useMemo, useState } from 'react';
import { getDocs } from 'firebase/firestore';
import { getCourseLessonsCollectionRef, mapCanonicalCourseLessons, sortCourseLessonItems } from '../lib/courseLessons';
import { buildNotePeriodKey } from '../types/notes';
import { useClinicalTopics } from './useClinicalTopics';
import { useCourses } from './useCourses';
import { useGeneralTopics } from './useGeneralTopics';
import { usePeriods } from './usePeriods';
import { debugError } from '../lib/debug';

export interface PublishedLessonOption {
  courseId: string;
  courseLabel: string;
  periodKey: string;
  periodId: string;
  periodTitle: string;
}

function buildCourseLessons(
  courseId: string,
  courseLabel: string,
  entries: Array<{ period: string; title?: string; label?: string; order?: number }>
) {
  return sortCourseLessonItems(courseId, entries).map((entry) => ({
    courseId,
    courseLabel,
    periodKey: buildNotePeriodKey(courseId, entry.period),
    periodId: entry.period,
    periodTitle: String(entry.title || entry.label || entry.period).trim(),
  }));
}

export function usePublishedLessonOptions() {
  const { periods, loading: periodsLoading } = usePeriods(true);
  const { topics: clinicalTopics, loading: clinicalLoading } = useClinicalTopics();
  const { topics: generalTopics, loading: generalLoading } = useGeneralTopics();
  const { courses, loading: coursesLoading } = useCourses();
  const [dynamicLessons, setDynamicLessons] = useState<Record<string, PublishedLessonOption[]>>({});
  const [dynamicLoading, setDynamicLoading] = useState(false);

  const dynamicCourses = useMemo(
    () => courses.filter((course) => !course.isCore),
    [courses]
  );

  useEffect(() => {
    let cancelled = false;

    const loadDynamicLessons = async () => {
      if (!dynamicCourses.length) {
        setDynamicLessons({});
        setDynamicLoading(false);
        return;
      }

      try {
        setDynamicLoading(true);
        const nextEntries = await Promise.all(
          dynamicCourses.map(async (course) => {
            const snapshot = await getDocs(
              getCourseLessonsCollectionRef(course.id)
            );
            const normalizedLessons = mapCanonicalCourseLessons(course.id, snapshot.docs).filter(
              (lesson) => lesson.published !== false
            );
            return [
              course.id,
              buildCourseLessons(course.id, course.name, normalizedLessons),
            ] as const;
          })
        );

        if (!cancelled) {
          setDynamicLessons(Object.fromEntries(nextEntries));
        }
      } catch (error) {
        if (!cancelled) {
          debugError('[usePublishedLessonOptions] Failed to load dynamic lessons', error);
          setDynamicLessons({});
        }
      } finally {
        if (!cancelled) {
          setDynamicLoading(false);
        }
      }
    };

    loadDynamicLessons();

    return () => {
      cancelled = true;
    };
  }, [dynamicCourses]);

  const lessonsByCourse = useMemo<Record<string, PublishedLessonOption[]>>(() => {
    const developmentLessons = buildCourseLessons('development', 'Психология развития', periods);
    const clinicalLessons = buildCourseLessons(
      'clinical',
      'Клиническая психология',
      [...clinicalTopics.values()]
    );
    const generalLessons = buildCourseLessons(
      'general',
      'Общая психология',
      [...generalTopics.values()]
    );

    return {
      development: developmentLessons,
      clinical: clinicalLessons,
      general: generalLessons,
      ...dynamicLessons,
    };
  }, [clinicalTopics, dynamicLessons, generalTopics, periods]);

  const lessonGroups = useMemo(
    () =>
      courses
        .map((course) => ({
          courseId: course.id,
          courseLabel: course.name,
          lessons: lessonsByCourse[course.id] ?? [],
        }))
        .filter((group) => group.lessons.length > 0),
    [courses, lessonsByCourse]
  );

  const rubricOptions = useMemo(
    () =>
      lessonGroups.reduce<Record<string, Record<string, string>>>((acc, group) => {
        acc[group.courseId] = group.lessons.reduce<Record<string, string>>((courseAcc, lesson) => {
          courseAcc[lesson.periodId] = lesson.periodTitle;
          return courseAcc;
        }, {});
        return acc;
      }, {}),
    [lessonGroups]
  );

  return {
    courseOptions: courses,
    lessonGroups,
    lessonsByCourse,
    loading: periodsLoading || clinicalLoading || generalLoading || coursesLoading || dynamicLoading,
    rubricOptions,
  };
}
