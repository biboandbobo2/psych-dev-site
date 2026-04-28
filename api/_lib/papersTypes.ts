export type ResearchSource = 'openalex' | 'openaire' | 'semanticscholar';

export type AllowedSource = {
  key: string;
  enabled: boolean;
  hosts: string[];
  pathPrefixes?: string[];
};

export type OpenAlexWork = {
  id?: string;
  display_name?: string;
  publication_year?: number;
  authorships?: Array<{ author?: { display_name?: string } }>;
  host_venue?: { display_name?: string };
  primary_location?: {
    landing_page_url?: string | null;
    pdf_url?: string | null;
    source?: { display_name?: string } | null;
  } | null;
  open_access?: {
    is_oa?: boolean;
    oa_url?: string | null;
  } | null;
  doi?: string | null;
  abstract_inverted_index?: Record<string, number[]> | null;
  language?: string | null;
};

export type ResearchWork = {
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
  isOa?: boolean; // OpenAlex open_access.is_oa flag
};

export type PapersApiResponse = {
  query: string;
  results: ResearchWork[];
  meta: {
    tookMs: number;
    cached: boolean;
    sourcesUsed: ResearchSource[];
    allowListApplied: boolean;
    psychologyFilterApplied?: boolean;
    queryVariantsUsed?: string[];
  };
};
