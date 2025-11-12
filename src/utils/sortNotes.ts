import { type Note, type AgeRange, AGE_RANGE_ORDER } from '../types/notes';

export type SortOption = 'date-new' | 'date-old' | 'period';

// Lazy initialization to avoid "Cannot access uninitialized variable" in production
let PERIOD_PRIORITY: Record<AgeRange, number> | null = null;

function getPeriodPriority(): Record<AgeRange, number> {
  if (!PERIOD_PRIORITY) {
    PERIOD_PRIORITY = AGE_RANGE_ORDER.reduce<Record<AgeRange, number>>((acc, key, index) => {
      acc[key] = index;
      return acc;
    }, {} as Record<AgeRange, number>);
  }
  return PERIOD_PRIORITY;
}

const getDate = (value: Date | undefined): number => {
  if (!value) return 0;
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
};

const compareDateDesc = (a: Note, b: Note) => getDate(b.createdAt) - getDate(a.createdAt);
const compareDateAsc = (a: Note, b: Note) => getDate(a.createdAt) - getDate(b.createdAt);

const getPeriodKey = (note: Note): AgeRange | null => {
  return (note.periodId ?? note.ageRange ?? null) as AgeRange | null;
};

export function sortNotes(notes: Note[], sortBy: SortOption): Note[] {
  const copy = [...notes];

  switch (sortBy) {
    case 'date-old':
      return copy.sort(compareDateAsc);
    case 'period':
      return copy.sort((a, b) => {
        const periodA = getPeriodKey(a);
        const periodB = getPeriodKey(b);

        if (!periodA && !periodB) {
          return compareDateDesc(a, b);
        }

        if (!periodA) return 1;
        if (!periodB) return -1;

        const priority = getPeriodPriority();
        const indexA = priority[periodA] ?? Number.POSITIVE_INFINITY;
        const indexB = priority[periodB] ?? Number.POSITIVE_INFINITY;

        if (indexA !== indexB) {
          return indexA - indexB;
        }

        return compareDateDesc(a, b);
      });
    case 'date-new':
    default:
      return copy.sort(compareDateDesc);
  }
}
