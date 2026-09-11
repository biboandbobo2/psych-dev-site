export type Topic = 'subject' | 'people' | 'type' | 'mary' | 'attribute' | 'feast' | 'tradition' | 'period' | 'attribution' | 'museum' | 'iconostasis';
export type Difficulty = 'beginner' | 'explorer' | 'expert';
export interface Source { label: string; url: string }
export interface IconSummary {
  id: string;
  title: string;
  tradition: string;
  region: string;
  period: string;
  centuries: number[];
  subject: string;
  people: string;
  type: string;
  museum: string;
  tags: string[];
  image: { width: number; height: number; widths: number[] };
  recognitionGroup?: string;
  schoolId?: string;
}
export interface IconRecord extends IconSummary {
  attribution: string;
  material: string;
  inventory: string;
  description: string;
  clues: { title: string; text: string }[];
  caution: string;
  sources: Source[];
  rights: { label: string; url: string; credit: string; original: string; checked: string };
  originalMetadata: { title: string; date: string; culture: string; attribution: string; material: string };
  questions: Question[];
  reading?: Source[];
  story?: { title: string; text: string }[];
  recognition?: Record<Difficulty, Question> & { detail?: ImageDetail };
}
export interface ImageDetail { x: number; y: number; width: number; height: number; label: string }
export interface Question {
  id: string;
  iconId?: string;
  topic: Topic;
  prompt: string;
  answer: string;
  distractors: string[];
  hint: string;
  explanation: string;
  source?: Source;
}
export interface Progress { difficult: string[]; answered: number; correct: number }

export interface IconSchool { id: string; title: string; intro: string; sections: { title: string; text: string }[]; sources: Source[] }
