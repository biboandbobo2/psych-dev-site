import { AGE_RANGE_LABELS, type AgeRange } from '../types/notes';

type PeriodKey = AgeRange | 'other';

type PeriodConfig = {
  icon: string;
  title: string;
  colorClass: string;
};

export const PERIOD_CONFIG: Record<PeriodKey, PeriodConfig> = {
  intro: { icon: '📖', title: AGE_RANGE_LABELS.intro, colorClass: 'border-l-slate-500' },
  prenatal: { icon: '🤰', title: AGE_RANGE_LABELS.prenatal, colorClass: 'border-l-purple-500' },
  'early-childhood': { icon: '👧', title: AGE_RANGE_LABELS['early-childhood'], colorClass: 'border-l-cyan-500' },
  infancy: { icon: '👶', title: AGE_RANGE_LABELS.infancy, colorClass: 'border-l-blue-500' },
  toddler: { icon: '👦', title: AGE_RANGE_LABELS.toddler, colorClass: 'border-l-cyan-600' },
  preschool: { icon: '🧒', title: AGE_RANGE_LABELS.preschool, colorClass: 'border-l-green-500' },
  'primary-school': { icon: '🎒', title: AGE_RANGE_LABELS['primary-school'], colorClass: 'border-l-amber-500' },
  school: { icon: '📚', title: AGE_RANGE_LABELS.school, colorClass: 'border-l-yellow-500' },
  earlyAdolescence: { icon: '🧑‍🎓', title: AGE_RANGE_LABELS.earlyAdolescence, colorClass: 'border-l-orange-500' },
  adolescence: { icon: '👦', title: AGE_RANGE_LABELS.adolescence, colorClass: 'border-l-rose-500' },
  emergingAdult: { icon: '💼', title: AGE_RANGE_LABELS.emergingAdult, colorClass: 'border-l-pink-500' },
  earlyAdult: { icon: '👔', title: AGE_RANGE_LABELS.earlyAdult, colorClass: 'border-l-indigo-500' },
  midlife: { icon: '🧠', title: AGE_RANGE_LABELS.midlife, colorClass: 'border-l-slate-600' },
  lateAdult: { icon: '🌿', title: AGE_RANGE_LABELS.lateAdult, colorClass: 'border-l-stone-500' },
  oldestOld: { icon: '👴', title: AGE_RANGE_LABELS.oldestOld, colorClass: 'border-l-gray-500' },
  other: { icon: '📝', title: 'Без категории', colorClass: 'border-l-border' },
};

export type PeriodId = keyof typeof PERIOD_CONFIG;

type Group = {
  label: string;
  options: Array<{ value: AgeRange; label: string }>;
};

export const PERIOD_FILTER_GROUPS: Group[] = [
  {
    label: 'До школы (0–7 лет)',
    options: [
      { value: 'prenatal', label: '🤰 Пренатальный период' },
      { value: 'infancy', label: '👶 Младенчество (0-1 год)' },
      { value: 'toddler', label: '👧 Раннее детство (1-3 года)' },
      { value: 'preschool', label: '🧒 Дошкольный возраст (3-7 лет)' },
    ],
  },
  {
    label: 'Школьный возраст',
    options: [
      { value: 'primary-school', label: '🎒 Младший школьный (7-10 лет)' },
      { value: 'school', label: '📚 Младший школьный (7-9 лет)' },
      { value: 'earlyAdolescence', label: '🧑‍🎓 Ранняя подростковость (10-13 лет)' },
      { value: 'adolescence', label: '👦 Подростковость (14-18 лет)' },
    ],
  },
  {
    label: 'Взрослые этапы',
    options: [
      { value: 'emergingAdult', label: '💼 Юность (19-22 года)' },
      { value: 'earlyAdult', label: '👔 Ранняя зрелость (22-40 лет)' },
      { value: 'midlife', label: '🧠 Средняя зрелость (40-65 лет)' },
      { value: 'lateAdult', label: '🌿 Пожилой возраст (66-80 лет)' },
      { value: 'oldestOld', label: '👴 Долголетие (80+ лет)' },
    ],
  },
];
