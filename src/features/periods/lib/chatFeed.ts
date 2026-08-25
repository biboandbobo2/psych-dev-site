import type { LectureQuestion } from '../../../types/lectureQuestions';
import type { LectureNoteSegment } from '../../../types/notes';
import type { OpenLectureNote } from '../../../hooks/useOpenLectureNotes';

/**
 * Элемент единой ленты чата занятия: вопросы группы и абзацы живых открытых
 * конспектов (плюс абзацы собственного конспекта — без них диалог рвётся).
 */
export type ChatFeedItem =
  | {
      kind: 'question';
      key: string;
      anchorMs: number | null;
      sortTime: number;
      question: LectureQuestion;
    }
  | {
      kind: 'note-paragraph';
      key: string;
      anchorMs: number | null;
      sortTime: number;
      authorName: string | null;
      isOwn: boolean;
      /** 'lecturers' — конспект открыт только лекторам (бейдж в ленте). */
      visibility: 'group' | 'lecturers' | null;
      text: string;
    };

interface BuildChatFeedInput {
  questions: LectureQuestion[];
  /** Открытые конспекты одногруппников (или все — в лекторском режиме). */
  openNotes: OpenLectureNote[];
  /** Абзацы собственного конспекта текущей лекции (local draft). */
  ownSegments: LectureNoteSegment[];
  currentUserUid: string | null;
  /** Текущая лекция: чужие конспекты других видео занятия не показываем. */
  videoId: string | null;
}

/** Хронология лекции: с якорем — по моменту видео, без якоря — в конец по дате. */
function compareFeedItems(a: ChatFeedItem, b: ChatFeedItem) {
  if (a.anchorMs !== null && b.anchorMs !== null) return a.anchorMs - b.anchorMs;
  if (a.anchorMs !== null) return -1;
  if (b.anchorMs !== null) return 1;
  return a.sortTime - b.sortTime;
}

export function buildChatFeed({
  questions,
  openNotes,
  ownSegments,
  currentUserUid,
  videoId,
}: BuildChatFeedInput): ChatFeedItem[] {
  const items: ChatFeedItem[] = questions.map((question) => ({
    kind: 'question' as const,
    key: `question-${question.id}`,
    anchorMs: question.startMs,
    sortTime: question.createdAt.getTime(),
    question,
  }));

  for (const note of openNotes) {
    // Свои абзацы приходят из локального draft — документ автора пропускаем.
    if (note.userId === currentUserUid || note.lectureVideoId !== videoId) {
      continue;
    }

    for (const segment of note.segments) {
      if (!segment.text.trim()) {
        continue;
      }

      items.push({
        kind: 'note-paragraph',
        key: `note-${note.id}-${segment.id}`,
        anchorMs: segment.startMs,
        sortTime: note.updatedAt.getTime(),
        authorName: note.authorName,
        isOwn: false,
        visibility: note.visibility,
        text: segment.text,
      });
    }
  }

  for (const segment of ownSegments) {
    if (!segment.text.trim()) {
      continue;
    }

    items.push({
      kind: 'note-paragraph',
      key: `own-${segment.id}`,
      anchorMs: segment.startMs,
      sortTime: Number.MAX_SAFE_INTEGER,
      authorName: null,
      isOwn: true,
      visibility: null,
      text: segment.text,
    });
  }

  return items.sort(compareFeedItems);
}
