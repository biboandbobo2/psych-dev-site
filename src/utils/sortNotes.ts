import { buildNotePeriodKey, type Note } from '../types/notes';

export type SortOption = 'date-new' | 'date-old' | 'period';

const getDate = (value: Date | string | undefined): number => {
  if (!value) return 0;
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
};

/** Дата последней правки: конспект живёт неделями, «свежесть» — это updatedAt. */
const noteTime = (note: Note) => getDate(note.updatedAt ?? note.createdAt);

const compareDateDesc = (a: Note, b: Note) => noteTime(b) - noteTime(a);
const compareDateAsc = (a: Note, b: Note) => noteTime(a) - noteTime(b);

/** Ключ занятия `courseId::periodId`; для легаси-заметок без periodKey собирается из полей. */
export function getEffectivePeriodKey(note: Note): string | null {
  if (note.periodKey) {
    return note.periodKey;
  }

  const fallbackPeriodId = note.periodId ?? note.ageRange ?? null;
  if (!fallbackPeriodId) {
    return null;
  }

  return buildNotePeriodKey(note.courseId ?? 'development', fallbackPeriodId);
}

/**
 * @param lessonOrder periodKey занятий в порядке курса — для режима «По занятиям».
 * Заметки без занятия или с неизвестным занятием уходят в конец.
 */
export function sortNotes(notes: Note[], sortBy: SortOption, lessonOrder: string[] = []): Note[] {
  const copy = [...notes];

  switch (sortBy) {
    case 'date-old':
      return copy.sort(compareDateAsc);
    case 'period': {
      const rank = new Map(lessonOrder.map((key, index) => [key, index]));
      const rankOf = (note: Note) => {
        const key = getEffectivePeriodKey(note);
        return key !== null ? rank.get(key) ?? Number.POSITIVE_INFINITY : Number.POSITIVE_INFINITY;
      };
      return copy.sort((a, b) => rankOf(a) - rankOf(b) || compareDateDesc(a, b));
    }
    case 'date-new':
    default:
      return copy.sort(compareDateDesc);
  }
}
