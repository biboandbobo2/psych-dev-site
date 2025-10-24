export type AgeRange =
  | 'intro'
  | 'prenatal'
  | 'early-childhood'
  | 'infancy'
  | 'toddler'
  | 'preschool'
  | 'primary-school'
  | 'school'
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
  topicId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const AGE_RANGE_LABELS: Record<AgeRange, string> = {
  intro: 'Вводное занятие',
  prenatal: 'Пренатальный период',
  'early-childhood': 'Младенчество (0-1 год)',
  infancy: 'Младенчество (0-1 год)',
  toddler: 'Раннее детство (1-3 года)',
  preschool: 'Дошкольный возраст (3-7 лет)',
  'primary-school': 'Младший школьный возраст (7-10 лет)',
  school: 'Младший школьный возраст (7-9 лет)',
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
  'school',
  'earlyAdolescence',
  'adolescence',
  'emergingAdult',
  'earlyAdult',
  'midlife',
  'lateAdult',
  'oldestOld',
];

export const AGE_RANGE_OPTIONS = AGE_RANGE_ORDER.map((value) => ({
  value,
  label: AGE_RANGE_LABELS[value] ?? value,
}));
