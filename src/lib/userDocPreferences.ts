/**
 * Личные настройки из корневого users/{uid}, которые useAuthStore кладёт
 * в стор: правки «актуальных курсов» (continue-cards на /home) и дефолты
 * режима конспекта (studyDefaults). Мусорные значения → пусто/null.
 */
export interface UserDocPreferences {
  /** Добавленные в «актуальные» поверх курсов потока и купленных. */
  featuredCourseIds: string[];
  /** Убранные из курсов потока и купленных. */
  unfeaturedCourseIds: string[];
  studyQuestionsDefaultVisibility: 'group' | 'lecturers' | null;
  studyNoteDefaultVisibility: 'private' | 'group' | 'lecturers' | null;
}

const toCourseIds = (raw: unknown): string[] =>
  Array.isArray(raw) ? raw.filter((c): c is string => typeof c === 'string') : [];

export function parseUserDocPreferences(
  data: Record<string, unknown> | undefined
): UserDocPreferences {
  const studyDefaults = data?.studyDefaults as
    | { questionsVisibility?: unknown; noteVisibility?: unknown }
    | undefined;
  const questions = studyDefaults?.questionsVisibility;
  const note = studyDefaults?.noteVisibility;
  return {
    featuredCourseIds: toCourseIds(data?.featuredCourseIds),
    unfeaturedCourseIds: toCourseIds(data?.unfeaturedCourseIds),
    studyQuestionsDefaultVisibility:
      questions === 'group' || questions === 'lecturers' ? questions : null,
    studyNoteDefaultVisibility:
      note === 'private' || note === 'group' || note === 'lecturers' ? note : null,
  };
}
