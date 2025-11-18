import { Timestamp } from "firebase/firestore";

export interface ContentLink {
  title: string;
  url: string;
}

export interface Author {
  name: string;
  url?: string;
}

export interface Period {
  period: string;
  title: string;
  subtitle: string;
  video_url?: string;
  video_playlist?: Array<{ title?: string; url?: string; deckUrl?: string; deck_url?: string; audioUrl?: string; audio_url?: string }>;
  concepts: string[];
  authors: Author[];
  core_literature: ContentLink[];
  extra_literature: ContentLink[];
  extra_videos: ContentLink[];
  leisure?: Array<{ title: string; url?: string; type?: string; year?: string }>;
  self_questions_url?: string;
  deck_url?: string;
  placeholder_enabled?: boolean;
  /**
   * Клиентские поля (формируются в hooks/usePeriods.ts)
   */
  label?: string;
  sections?: Record<
    string,
    {
      title: string;
      content: any[];
    }
  >;
  deckUrl?: string;
  selfQuestionsUrl?: string;
  placeholderEnabled?: boolean;
  placeholderText?: string;
  accent: string;
  accent100: string;
  background?: string;
  published: boolean;
  order?: number;
  updatedAt?: Timestamp;
  createdAt?: Timestamp;
}

export interface IntroContent extends Omit<Period, "period"> {
  period: "intro";
}

/**
 * ClinicalTopic - тема клинической психологии
 * Структура идентична Period, но используется для курса клинической психологии
 */
export type ClinicalTopic = Period;

export interface ClinicalIntroContent extends Omit<Period, "period"> {
  period: "clinical-intro";
}

export type PeriodFormData = Omit<Period, "updatedAt" | "createdAt">;
export type IntroFormData = Omit<IntroContent, "updatedAt" | "createdAt">;
export type ClinicalTopicFormData = Omit<ClinicalTopic, "updatedAt" | "createdAt">;
export type ClinicalIntroFormData = Omit<ClinicalIntroContent, "updatedAt" | "createdAt">;
