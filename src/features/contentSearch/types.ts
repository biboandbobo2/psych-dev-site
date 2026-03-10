import type { CourseType } from '../../types/tests';
export type { CourseType } from '../../types/tests';

// Результат поиска по контенту (периоды/темы)
export interface ContentSearchResult {
  type: 'content';
  id: string;
  period: string;
  title: string;
  subtitle: string;
  course: CourseType;
  matchedIn: ContentMatchField[];
  relevanceScore: number;
}

// Результат поиска по тестам
export interface TestSearchResult {
  type: 'test';
  id: string;
  testId: string;
  title: string;
  course: CourseType;
  matchedIn: TestMatchField[];
  relevanceScore: number;
  // Иконка теста из appearance
  icon?: string;
}

export interface TranscriptSearchResult {
  type: 'transcript';
  id: string;
  youtubeVideoId: string;
  title: string;
  period: string;
  periodTitle: string;
  lectureTitle: string;
  course: CourseType;
  matchedIn: ['transcript'];
  relevanceScore: number;
  startMs: number;
  timestampLabel: string;
  snippet: string;
  path: string;
}

export type SearchResult = ContentSearchResult | TestSearchResult | TranscriptSearchResult;

export type ContentMatchField =
  | 'title'
  | 'subtitle'
  | 'concepts'
  | 'authors'
  | 'literature'
  | 'videos'
  | 'leisure';

export type TestMatchField =
  | 'testTitle'
  | 'question'
  | 'answer'
  | 'explanation';

export type MatchField = ContentMatchField | TestMatchField;

export interface ContentSearchState {
  status: 'idle' | 'searching' | 'success';
  results: SearchResult[];
  query: string;
}
