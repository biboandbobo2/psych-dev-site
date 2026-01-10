import type { Period } from '../../types/content';

export type CourseType = 'development' | 'clinical' | 'general';

export interface SearchResult {
  id: string;
  period: string;
  title: string;
  subtitle: string;
  course: CourseType;
  matchedIn: MatchField[];
  relevanceScore: number;
}

export type MatchField =
  | 'title'
  | 'subtitle'
  | 'concepts'
  | 'authors'
  | 'literature';

export interface ContentSearchState {
  status: 'idle' | 'searching' | 'success';
  results: SearchResult[];
  query: string;
}
