export type LectureQuestionVisibility = 'group' | 'lecturers';

export interface LectureQuestion {
  id: string;
  authorUid: string;
  authorName: string | null;
  courseId: string;
  periodId: string;
  periodTitle: string | null;
  lectureTitle: string | null;
  /** YouTube id видео, если вопрос задан из режима конспекта. */
  videoId: string | null;
  /** Момент лекции, к которому относится вопрос. */
  startMs: number | null;
  text: string;
  visibility: LectureQuestionVisibility;
  /** Обязателен при visibility='group'. */
  groupId: string | null;
  createdAt: Date;
}

export interface LectureQuestionInput {
  courseId: string;
  periodId: string;
  periodTitle?: string | null;
  lectureTitle?: string | null;
  videoId?: string | null;
  startMs?: number | null;
  text: string;
  visibility: LectureQuestionVisibility;
  groupId?: string | null;
}

export const LECTURE_QUESTION_MAX_LENGTH = 2000;

export function mapLectureQuestionRecord(
  id: string,
  data: Record<string, unknown>
): LectureQuestion {
  return {
    id,
    authorUid: typeof data.authorUid === 'string' ? data.authorUid : '',
    authorName: typeof data.authorName === 'string' ? data.authorName : null,
    courseId: typeof data.courseId === 'string' ? data.courseId : '',
    periodId: typeof data.periodId === 'string' ? data.periodId : '',
    periodTitle: typeof data.periodTitle === 'string' ? data.periodTitle : null,
    lectureTitle: typeof data.lectureTitle === 'string' ? data.lectureTitle : null,
    videoId: typeof data.videoId === 'string' ? data.videoId : null,
    startMs: typeof data.startMs === 'number' && Number.isFinite(data.startMs) ? data.startMs : null,
    text: typeof data.text === 'string' ? data.text : '',
    visibility: data.visibility === 'lecturers' ? 'lecturers' : 'group',
    groupId: typeof data.groupId === 'string' ? data.groupId : null,
    createdAt:
      (data.createdAt as { toDate?: () => Date } | undefined)?.toDate?.() ?? new Date(),
  };
}
