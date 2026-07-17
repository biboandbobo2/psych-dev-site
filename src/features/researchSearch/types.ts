// Типы для поиска научных работ
export type ResearchSource = 'openalex' | 'openaire' | 'semanticscholar';

export interface ResearchWork {
  id: string;
  title: string;
  year: number | null;
  authors: string[];
  venue: string | null;
  language: string | 'unknown';
  doi?: string | null;
  primaryUrl?: string | null;
  oaPdfUrl?: string | null;
  paragraph?: string | null;
  source: ResearchSource;
  score?: number;
  host?: string | null;
  citedByCount?: number | null;
}

export interface PapersApiMeta {
  tookMs: number;
  cached: boolean;
  sourcesUsed: ResearchSource[];
  allowListApplied: boolean;
  psychologyFilterApplied?: boolean;
  /** true, если фильтр психологии дал 0 и выдача показана без него */
  psychologyFilterRelaxed?: boolean;
  queryVariantsUsed?: string[];
}

export interface PapersApiResponse {
  query: string;
  results: ResearchWork[];
  meta: PapersApiMeta;
}

export interface PapersApiError {
  status: number;
  message: string;
  code?: 'INVALID_QUERY' | 'RATE_LIMITED' | 'UPSTREAM_UNAVAILABLE' | 'INTERNAL_ERROR';
}
