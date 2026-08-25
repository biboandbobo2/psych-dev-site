import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useMyGroups } from '../../../hooks/useMyGroups';
import {
  useLectureQuestionActions,
  useMyLectureQuestions,
} from '../../../hooks/useLectureQuestions';
import {
  LECTURE_QUESTION_MAX_LENGTH,
  type LectureQuestionVisibility,
} from '../../../types/lectureQuestions';
import {
  readLectureQuestionsVisibility,
  writeLectureQuestionsVisibility,
} from '../lib/studyVisibilitySettings';
import type { LectureNoteSegment } from '../../../types/notes';
import { debugError } from '../../../lib/debug';
import { trackFeatureEvent } from '../../../lib/telemetry';

interface UseSegmentQuestionsOptions {
  /** false — оверлей закрыт: листенеры не открываются (LP-17). */
  enabled: boolean;
  courseId: string;
  periodId: string;
  periodTitle: string;
  videoTitle: string;
  youtubeVideoId: string | null;
  lectureKey: string | null;
}

/**
 * Контур «?» на абзаце конспекта: настройка «мои вопросы видят»
 * (сессионный выбор > localStorage по лекции > дефолт аккаунта > 'group')
 * и тоггл вопроса-снапшота в lectureQuestions по сегменту.
 */
export function useSegmentQuestions({
  enabled,
  courseId,
  periodId,
  periodTitle,
  videoTitle,
  youtubeVideoId,
  lectureKey,
}: UseSegmentQuestionsOptions) {
  const user = useAuthStore((state) => state.user);
  const accountQuestionsVisibility = useAuthStore(
    (state) => state.studyQuestionsDefaultVisibility
  );

  const storedQuestionsVisibility = useMemo(
    () => readLectureQuestionsVisibility(lectureKey),
    [lectureKey]
  );
  const [visibilityOverride, setVisibilityOverride] =
    useState<LectureQuestionVisibility | null>(null);
  useEffect(() => {
    setVisibilityOverride(null);
  }, [lectureKey]);
  const questionsVisibility: LectureQuestionVisibility =
    visibilityOverride ?? storedQuestionsVisibility ?? accountQuestionsVisibility ?? 'group';
  const setQuestionsVisibility = useCallback(
    (value: LectureQuestionVisibility) => {
      setVisibilityOverride(value);
      writeLectureQuestionsVisibility(lectureKey, value);
    },
    [lectureKey]
  );

  // Свои вопросы занятия дают отметки сегментов и id вопроса для снятия.
  const { groups } = useMyGroups(enabled && Boolean(user));
  const targetGroupId = useMemo(() => {
    const target = groups.find((group) => group.id !== 'everyone' && !group.isSystem);
    return target?.id ?? null;
  }, [groups]);
  const myQuestions = useMyLectureQuestions(enabled && user ? courseId : null, periodId);
  const questionIdBySegment = useMemo(() => {
    const map = new Map<string, string>();
    for (const question of myQuestions) {
      if (question.sourceSegmentId && question.videoId === youtubeVideoId) {
        map.set(question.sourceSegmentId, question.id);
      }
    }
    return map;
  }, [myQuestions, youtubeVideoId]);
  const questionedSegmentIds = useMemo(
    () => new Set(questionIdBySegment.keys()),
    [questionIdBySegment]
  );
  const { createQuestion, deleteQuestion } = useLectureQuestionActions();

  const toggleSegmentQuestion = useCallback(
    async (segment: LectureNoteSegment) => {
      try {
        const existingQuestionId = questionIdBySegment.get(segment.id);
        if (existingQuestionId) {
          await deleteQuestion(existingQuestionId);
          return;
        }

        const text = segment.text.trim().slice(0, LECTURE_QUESTION_MAX_LENGTH);
        if (!text) {
          return;
        }

        // Без группы вопрос уходит только лекторам (как в бывшей модалке).
        const visibility: LectureQuestionVisibility = targetGroupId
          ? questionsVisibility
          : 'lecturers';
        await createQuestion({
          courseId,
          periodId,
          periodTitle: periodTitle.trim() || videoTitle,
          lectureTitle: videoTitle,
          videoId: youtubeVideoId,
          startMs: segment.startMs,
          text,
          visibility,
          groupId: visibility === 'group' ? targetGroupId : null,
          sourceSegmentId: segment.id,
        });
        trackFeatureEvent('lecture_question_asked', { courseId, periodId });
      } catch (error) {
        debugError('[useSegmentQuestions] failed to toggle segment question', error);
      }
    },
    [
      courseId,
      createQuestion,
      deleteQuestion,
      periodId,
      periodTitle,
      questionIdBySegment,
      questionsVisibility,
      targetGroupId,
      videoTitle,
      youtubeVideoId,
    ]
  );

  return {
    /** null — гость: «?» не показываем. */
    isSignedIn: Boolean(user),
    /** Первая учебная группа пользователя — целевая для вопросов и конспекта. */
    targetGroupId,
    questionsVisibility,
    setQuestionsVisibility,
    questionedSegmentIds,
    toggleSegmentQuestion,
  };
}
