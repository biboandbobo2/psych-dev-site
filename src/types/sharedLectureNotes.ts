import { normalizeLectureNoteSegments, type LectureNoteSegment } from './notes';
import type { LectureQuestionVisibility } from './lectureQuestions';

/**
 * Максимум сегментов в одном расшаренном конспекте — зеркало лимита
 * `segments.size() <= 100` из firestore.rules (create sharedLectureNotes).
 * Менять только синхронно с правилами.
 */
export const MAX_SHARED_NOTE_SEGMENTS = 100;

/**
 * Расшаренный фрагмент конспекта — снапшот выбранных сегментов на момент
 * отправки (не ссылка на живую заметку: правки задним числом не протекают,
 * личная заметка целиком не открывается).
 */
export interface SharedLectureNote {
  id: string;
  authorUid: string;
  authorName: string | null;
  courseId: string;
  periodId: string;
  periodTitle: string | null;
  lectureTitle: string | null;
  videoId: string | null;
  segments: LectureNoteSegment[];
  visibility: LectureQuestionVisibility;
  groupId: string | null;
  createdAt: Date;
}

export interface SharedLectureNoteInput {
  courseId: string;
  periodId: string;
  periodTitle?: string | null;
  lectureTitle?: string | null;
  videoId?: string | null;
  segments: LectureNoteSegment[];
  visibility: LectureQuestionVisibility;
  groupId?: string | null;
}

export function mapSharedLectureNoteRecord(
  id: string,
  data: Record<string, unknown>
): SharedLectureNote {
  return {
    id,
    authorUid: typeof data.authorUid === 'string' ? data.authorUid : '',
    authorName: typeof data.authorName === 'string' ? data.authorName : null,
    courseId: typeof data.courseId === 'string' ? data.courseId : '',
    periodId: typeof data.periodId === 'string' ? data.periodId : '',
    periodTitle: typeof data.periodTitle === 'string' ? data.periodTitle : null,
    lectureTitle: typeof data.lectureTitle === 'string' ? data.lectureTitle : null,
    videoId: typeof data.videoId === 'string' ? data.videoId : null,
    segments: normalizeLectureNoteSegments(data.segments),
    visibility: data.visibility === 'lecturers' ? 'lecturers' : 'group',
    groupId: typeof data.groupId === 'string' ? data.groupId : null,
    createdAt:
      (data.createdAt as { toDate?: () => Date } | undefined)?.toDate?.() ?? new Date(),
  };
}
