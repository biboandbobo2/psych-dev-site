import type { LectureQuestionVisibility } from '../../../types/lectureQuestions';

const QUESTIONS_VISIBILITY_PREFIX = 'studyQuestionsVisibility:';

/**
 * Per-lecture настройка «мои вопросы видят» из шестерёнки оверлея.
 * Хранится в localStorage по lectureKey; приоритетнее дефолта аккаунта
 * (users/{uid}.studyDefaults.questionsVisibility).
 */
export function readLectureQuestionsVisibility(
  lectureKey: string | null
): LectureQuestionVisibility | null {
  if (!lectureKey) {
    return null;
  }

  try {
    const raw = localStorage.getItem(QUESTIONS_VISIBILITY_PREFIX + lectureKey);
    return raw === 'group' || raw === 'lecturers' ? raw : null;
  } catch {
    return null;
  }
}

export function writeLectureQuestionsVisibility(
  lectureKey: string | null,
  value: LectureQuestionVisibility
): void {
  if (!lectureKey) {
    return;
  }

  try {
    localStorage.setItem(QUESTIONS_VISIBILITY_PREFIX + lectureKey, value);
  } catch {
    // localStorage недоступен (private mode) — настройка живёт до конца сессии
  }
}
