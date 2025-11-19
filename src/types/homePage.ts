// Типы для контента главной страницы

export interface HeroSection {
  type: 'hero';
  order: number;
  enabled: boolean;
  content: {
    title: string;
    subtitle: string;
    primaryCta: {
      text: string;
      link: string;
    };
    secondaryCta: {
      text: string;
      link: string;
    };
  };
}

export interface EssenceCard {
  icon: string;
  title: string;
  description: string;
}

export interface EssenceSection {
  type: 'essence';
  order: number;
  enabled: boolean;
  content: {
    title: string;
    cards: EssenceCard[];
  };
}

export interface StructureCard {
  icon: string;
  title: string;
  description: string;
  bgColor: string;
}

export interface StructureSection {
  type: 'structure';
  order: number;
  enabled: boolean;
  content: {
    title: string;
    subtitle: string;
    cards: StructureCard[];
  };
}

export interface PeriodItem {
  to: string;
  label: string;
  years?: string;
  icon: string;
}

export interface PeriodsSection {
  type: 'periods';
  order: number;
  enabled: boolean;
  content: {
    title: string;
    periods: PeriodItem[];
  };
}

export interface OrganizationCard {
  title: string;
  description: string;
  borderColor: string;
}

export interface OrganizationSection {
  type: 'organization';
  order: number;
  enabled: boolean;
  content: {
    title: string;
    cards: OrganizationCard[];
  };
}

export interface Instructor {
  name: string;
  role: string;
  icon: string;
  bio: string;
  expertise?: string;
}

export interface InstructorsSection {
  type: 'instructors';
  order: number;
  enabled: boolean;
  content: {
    title: string;
    instructors: Instructor[];
    guestSpeakers: string;
  };
}

export interface FormatDetail {
  icon: string;
  title: string;
  description: string;
}

export interface FormatSection {
  type: 'format';
  order: number;
  enabled: boolean;
  content: {
    title: string;
    details: FormatDetail[];
  };
}

export interface CTASection {
  type: 'cta';
  order: number;
  enabled: boolean;
  content: {
    title: string;
    subtitle: string;
    primaryCta: {
      text: string;
      link: string;
    };
    secondaryCta: {
      text: string;
      link: string;
    };
    contacts: {
      phone: string;
      email: string;
      telegram: string;
    };
  };
}

export interface CTAClinicalSection {
  type: 'cta-clinical';
  order: number;
  enabled: boolean;
  content: {
    title: string;
    subtitle: string;
    primaryCta: {
      text: string;
      link: string;
    };
    secondaryCta: {
      text: string;
      link: string;
    };
  };
}

export interface CTAGeneralSection {
  type: 'cta-general';
  order: number;
  enabled: boolean;
  content: {
    title: string;
    subtitle: string;
    primaryCta: {
      text: string;
      link: string;
    };
    secondaryCta: {
      text: string;
      link: string;
    };
  };
}

// Union type для всех секций
export type HomePageSection =
  | HeroSection
  | EssenceSection
  | StructureSection
  | PeriodsSection
  | OrganizationSection
  | InstructorsSection
  | FormatSection
  | CTASection
  | CTAClinicalSection
  | CTAGeneralSection;

// Основной тип для всей страницы
export interface HomePageContent {
  id: 'home';
  version: number;
  lastModified: string;
  sections: HomePageSection[];
}

// Тип для редактора (без служебных полей)
export type EditableHomePageContent = Omit<HomePageContent, 'id' | 'lastModified'>;
