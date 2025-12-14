// Типы для поиска научных работ
export type ResearchSource = 'openalex' | 'semanticscholar';

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
}

export interface PapersApiMeta {
  tookMs: number;
  cached: boolean;
  sourcesUsed: ResearchSource[];
  allowListApplied: boolean;
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
