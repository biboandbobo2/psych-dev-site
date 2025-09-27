export type PeriodThemeKey =
  | 'intro'
  | 'prenatal'
  | 'infancy'
  | 'toddler'
  | 'preschool'
  | 'school1'
  | 'earlyTeen'
  | 'teen'
  | 'emergingAdult'
  | 'earlyAdult'
  | 'midAdult1'
  | 'midAdult2'
  | 'older'
  | 'oldest';

export interface PeriodTheme {
  accent: string;
  accent100: string;
}

export const PERIOD_THEME: Record<PeriodThemeKey, PeriodTheme> = {
  intro: { accent: '#C58F12', accent100: '#FFF4DA' },
  prenatal: { accent: '#2F9683', accent100: '#E6F2F0' },
  infancy: { accent: '#2E7D32', accent100: '#E5EFE6' },
  toddler: { accent: '#5C6BC0', accent100: '#EBEDF7' },
  preschool: { accent: '#FB8C00', accent100: '#FEF0DD' },
  school1: { accent: '#26A69A', accent100: '#E4F4F2' },
  earlyTeen: { accent: '#5E35B1', accent100: '#EBE6F5' },
  teen: { accent: '#D81B60', accent100: '#FAE3EB' },
  emergingAdult: { accent: '#1E88E5', accent100: '#E4F0FB' },
  earlyAdult: { accent: '#43A047', accent100: '#E8F3E8' },
  midAdult1: { accent: '#F9A825', accent100: '#FEF4E4' },
  midAdult2: { accent: '#6D4C41', accent100: '#EDE9E8' },
  older: { accent: '#607D8B', accent100: '#EBEFF1' },
  oldest: { accent: '#8D6E63', accent100: '#F1EDEC' },
};

export const DEFAULT_THEME: PeriodTheme = PERIOD_THEME.infancy;
