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

export type PeriodFormData = Omit<Period, "updatedAt" | "createdAt">;
export type IntroFormData = Omit<IntroContent, "updatedAt" | "createdAt">;
