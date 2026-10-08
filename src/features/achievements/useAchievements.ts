import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { debugError } from '../../lib/debug';
import { useAuthStore, useCourseAccessChecker } from '../../stores/useAuthStore';
import { useCourseProgressStore } from '../../stores/useCourseProgressStore';
import { useCourses } from '../../hooks/useCourses';
import { useMyGroups } from '../../hooks/useMyGroups';
import { useCoursesOpenness } from '../../hooks/useCoursesOpenness';
import { useNotes } from '../../hooks/useNotes';
import { loadNavItems } from '../../hooks/useCourseNavItems';
import { getWatchedLessonIds } from '../../lib/courseWatchedLessons';
import { getPublishedTests } from '../../lib/tests';
import { getAllTestResults } from '../../lib/testResults';
import { mapLectureQuestionRecord } from '../../types/lectureQuestions';
import type { CourseType } from '../../types/tests';
import {
  computeAchievements,
  resolveAchievementSet,
  type AchievementsResult,
  type TestInput,
} from './compute';
import type { AchievementSet } from './catalog';
import { readNotFoundVisited } from './notFoundMark';

interface RemoteData {
  lessonIds: Record<string, string[]>;
  tests: TestInput[];
  questionDates: Date[];
}

/**
 * Данные пользователя для «Достижений»: всё считается в браузере из того,
 * что пользователь и так может читать (прогресс, тесты, конспекты, вопросы).
 */
export function useAchievements(): {
  result: AchievementsResult | null;
  set: AchievementSet;
  loading: boolean;
} {
  const user = useAuthStore((s) => s.user);
  const hasCourseAccess = useCourseAccessChecker();
  const { courses, loading: coursesLoading } = useCourses();
  const { groups, loading: groupsLoading } = useMyGroups(Boolean(user));
  const { notes, loading: notesLoading } = useNotes();
  const progressVersion = useCourseProgressStore((s) => s.version);
  const byCourse = useCourseProgressStore((s) => s.byCourse);

  const accessibleCourseIds = useMemo(
    () => courses.filter((c) => hasCourseAccess(c.id as CourseType)).map((c) => c.id),
    [courses, hasCourseAccess],
  );
  const { openCourseIds, loading: opennessLoading } = useCoursesOpenness(accessibleCourseIds);

  const [remote, setRemote] = useState<RemoteData | null>(null);
  const coursesKey = accessibleCourseIds.join('|');

  useEffect(() => {
    if (!user || coursesLoading) return;
    let cancelled = false;
    const courseIds = coursesKey ? coursesKey.split('|') : [];

    (async () => {
      const [lessonEntries, publishedTests, results, questionsSnap] = await Promise.all([
        Promise.all(
          courseIds.map(async (id) => {
            try {
              return [id, (await loadNavItems(id)).map((item) => item.id)] as const;
            } catch (error) {
              debugError('[achievements] lessons load failed', { id, error });
              return [id, []] as const;
            }
          }),
        ),
        getPublishedTests().catch((error) => {
          debugError('[achievements] tests load failed', error);
          return [];
        }),
        getAllTestResults(user.uid).catch((error) => {
          debugError('[achievements] results load failed', error);
          return [];
        }),
        getDocs(query(collection(db, 'lectureQuestions'), where('authorUid', '==', user.uid))).catch(
          (error) => {
            debugError('[achievements] questions load failed', error);
            return null;
          },
        ),
      ]);
      if (cancelled) return;

      const tests: TestInput[] = publishedTests.map((t) => ({
        testId: t.id,
        requiredPercentage: t.requiredPercentage ?? 70,
        prerequisiteTestId: t.prerequisiteTestId,
        attempts: results
          .filter((r) => r.testId === t.id)
          .map((r) => ({ percentage: r.percentage, at: r.completedAt })),
      }));

      setRemote({
        lessonIds: Object.fromEntries(lessonEntries.map(([id, ids]) => [id, [...ids]])),
        tests,
        questionDates:
          questionsSnap?.docs.map((d) => mapLectureQuestionRecord(d.id, d.data()).createdAt) ?? [],
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [user, coursesLoading, coursesKey]);

  const set = useMemo(
    () => resolveAchievementSet({ groups, accessibleCourseIds, openCourseIds }),
    [groups, accessibleCourseIds, openCourseIds],
  );

  const result = useMemo(() => {
    void progressVersion;
    if (!remote) return null;
    const watchedVideos = Object.values(byCourse).reduce(
      (sum, progress) =>
        sum +
        Object.values(progress.videoStats ?? {}).reduce(
          (inner, videos) => inner + Object.values(videos).filter((v) => v.watched).length,
          0,
        ),
      0,
    );
    return computeAchievements({
      set,
      accessibleCourseIds,
      courses: accessibleCourseIds.map((id) => {
        const lessonIds = remote.lessonIds[id] ?? [];
        const watched = getWatchedLessonIds(id);
        return {
          id,
          totalLessons: lessonIds.length,
          doneLessons: lessonIds.filter((lessonId) => watched.has(lessonId)).length,
        };
      }),
      watchedVideos,
      tests: remote.tests,
      notes: notes.map((n) => ({
        lessonKey: n.courseId && n.periodId ? `${n.courseId}::${n.periodId}` : null,
        isLecture: n.noteScope === 'lecture',
        shared: n.visibility === 'group' || n.visibility === 'lecturers',
        at: n.createdAt ?? null,
      })),
      questionDates: remote.questionDates,
      foundNotFound: readNotFoundVisited(),
    });
  }, [remote, byCourse, progressVersion, set, accessibleCourseIds, notes]);

  return {
    result,
    set,
    loading: !result || groupsLoading || notesLoading || opennessLoading,
  };
}
