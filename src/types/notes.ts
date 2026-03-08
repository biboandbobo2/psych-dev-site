export type AgeRange =
  | 'intro'
  | 'prenatal'
  | 'early-childhood'
  | 'infancy'
  | 'toddler'
  | 'preschool'
  | 'primary-school'
  | 'school' // legacy alias для primary-school
  | 'earlyAdolescence'
  | 'adolescence'
  | 'emergingAdult'
  | 'earlyAdult'
  | 'midlife'
  | 'lateAdult'
  | 'oldestOld';

export interface Topic {
  id: string;
  ageRange: AgeRange;
  text: string;
  order: number;
  createdAt: Date;
  createdBy?: string;
}

export interface TopicInput {
  ageRange: AgeRange;
  text: string;
  order: number;
}

export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  ageRange: AgeRange | null;
  periodId?: string | null;
  periodTitle?: string | null;
  courseId?: string | null;
  noteScope?: 'manual' | 'lecture' | 'timeline';
  lectureVideoId?: string | null;
  lectureKey?: string | null;
  topicId: string | null;
  topicTitle?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LectureNoteContext {
  courseId: string;
  periodId: string;
  periodTitle: string;
  lectureTitle: string;
  lectureVideoId: string;
}

export const AGE_RANGE_LABELS: Record<AgeRange, string> = {
  intro: 'Вводное занятие',
  prenatal: 'Пренатальный период',
  'early-childhood': 'Младенчество (0-1 год)',
  infancy: 'Младенчество (0-1 год)',
  toddler: 'Раннее детство (1-3 года)',
  preschool: 'Дошкольный возраст (3-7 лет)',
  'primary-school': 'Младший школьный возраст (7-10 лет)',
  school: 'Младший школьный возраст (7-9 лет)', // legacy, используйте primary-school
  earlyAdolescence: 'Ранняя подростковость (10-13 лет)',
  adolescence: 'Подростковость (14-18 лет)',
  emergingAdult: 'Юность (19-22 года)',
  earlyAdult: 'Ранняя зрелость (22-40 лет)',
  midlife: 'Средняя зрелость (40-65 лет)',
  lateAdult: 'Пожилой возраст (66-80 лет)',
  oldestOld: 'Долголетие (80+ лет)',
};

export const AGE_RANGE_ORDER: AgeRange[] = [
  'intro',
  'prenatal',
  'infancy',
  'toddler',
  'preschool',
  'primary-school',
  'earlyAdolescence',
  'adolescence',
  'emergingAdult',
  'earlyAdult',
  'midlife',
  'lateAdult',
  'oldestOld',
];

const LEGACY_AGE_RANGE_MAP: Record<string, AgeRange> = {
  'early-childhood': 'infancy',
  school: 'primary-school',
};

// Lazy initialization to avoid "Cannot access uninitialized variable" in production
let _VALID_AGE_RANGES: Set<AgeRange> | null = null;
let _AGE_RANGE_OPTIONS: Array<{ value: AgeRange; label: string }> | null = null;

function getValidAgeRanges(): Set<AgeRange> {
  if (!_VALID_AGE_RANGES) {
    _VALID_AGE_RANGES = new Set<AgeRange>(AGE_RANGE_ORDER);
  }
  return _VALID_AGE_RANGES;
}

export function getAgeRangeOptions(): Array<{ value: AgeRange; label: string }> {
  if (!_AGE_RANGE_OPTIONS) {
    _AGE_RANGE_OPTIONS = AGE_RANGE_ORDER.map((value) => ({
      value,
      label: AGE_RANGE_LABELS[value] ?? value,
    }));
  }
  return _AGE_RANGE_OPTIONS;
}

export function normalizeAgeRange(value: unknown): AgeRange | null {
  if (!value || typeof value !== 'string') return null;

  const mapped = LEGACY_AGE_RANGE_MAP[value] ?? value;
  if (getValidAgeRanges().has(mapped as AgeRange)) {
    return mapped as AgeRange;
  }

  return null;
}

export function buildLectureNoteKey({
  courseId,
  periodId,
  lectureVideoId,
}: Pick<LectureNoteContext, 'courseId' | 'periodId' | 'lectureVideoId'>) {
  return `${courseId}::${periodId}::${lectureVideoId}`;
}

export function buildLectureNoteDocumentId(
  userId: string,
  context: Pick<LectureNoteContext, 'courseId' | 'periodId' | 'lectureVideoId'>
) {
  return `lecture__${userId}__${encodeURIComponent(buildLectureNoteKey(context))}`;
}

// Export as lazy Proxy to avoid top-level function call
export const AGE_RANGE_OPTIONS: Array<{ value: AgeRange; label: string }> = new Proxy(
  [] as Array<{ value: AgeRange; label: string }>,
  {
    get(target, prop) {
      const options = getAgeRangeOptions();
      return options[prop as keyof typeof options];
    },
    has(_target, prop) {
      const options = getAgeRangeOptions();
      return prop in options;
    },
  }
);
