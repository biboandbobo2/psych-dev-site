import type { BiographyEventTheme, BiographyFactCandidate, TimelineSphere } from './timelineBiographyTypes.js';

export const BIOGRAPHY_THEME_META: Record<
  BiographyEventTheme,
  { branchLabel: string; sphere: TimelineSphere; preserveForBranch: boolean }
> = {
  upbringing_mentors: { branchLabel: 'Ранние влияния', sphere: 'education', preserveForBranch: true },
  education: { branchLabel: 'Образование', sphere: 'education', preserveForBranch: false },
  friends_network: { branchLabel: 'Друзья и круг', sphere: 'friends', preserveForBranch: true },
  romance: { branchLabel: 'Любовь и отношения', sphere: 'family', preserveForBranch: true },
  family_household: { branchLabel: 'Семья', sphere: 'family', preserveForBranch: true },
  children: { branchLabel: 'Семья и дети', sphere: 'family', preserveForBranch: true },
  travel_moves_exile: { branchLabel: 'Переезды и ссылки', sphere: 'place', preserveForBranch: true },
  service_career: { branchLabel: 'Карьера и служба', sphere: 'career', preserveForBranch: true },
  creative_work: { branchLabel: 'Творчество', sphere: 'creativity', preserveForBranch: true },
  conflict_duels: { branchLabel: 'Дуэли и конфликты', sphere: 'health', preserveForBranch: true },
  losses: { branchLabel: 'Потери', sphere: 'family', preserveForBranch: true },
  politics_public_pressure: { branchLabel: 'Давление и политика', sphere: 'career', preserveForBranch: true },
  health: { branchLabel: 'Здоровье', sphere: 'health', preserveForBranch: false },
  legacy: { branchLabel: 'Наследие', sphere: 'creativity', preserveForBranch: false },
};

const THEME_PRIORITY: BiographyEventTheme[] = [
  'creative_work',
  'friends_network',
  'romance',
  'family_household',
  'children',
  'travel_moves_exile',
  'conflict_duels',
  'losses',
  'politics_public_pressure',
  'service_career',
  'upbringing_mentors',
  'education',
  'health',
  'legacy',
];

export function getFactThemes(fact: Pick<BiographyFactCandidate, 'themes' | 'sphere'>) {
  if (fact.themes?.length) {
    return fact.themes;
  }

  switch (fact.sphere) {
    case 'creativity':
      return ['creative_work'] satisfies BiographyEventTheme[];
    case 'friends':
      return ['friends_network'] satisfies BiographyEventTheme[];
    case 'family':
      return ['family_household'] satisfies BiographyEventTheme[];
    case 'place':
      return ['travel_moves_exile'] satisfies BiographyEventTheme[];
    case 'career':
      return ['service_career'] satisfies BiographyEventTheme[];
    case 'education':
      return ['education'] satisfies BiographyEventTheme[];
    case 'health':
      return ['health'] satisfies BiographyEventTheme[];
    default:
      return [];
  }
}

export function pickPrimaryTheme(fact: Pick<BiographyFactCandidate, 'themes' | 'sphere'>) {
  const themes = getFactThemes(fact);
  return THEME_PRIORITY.find((theme) => themes.includes(theme)) ?? themes[0] ?? null;
}
