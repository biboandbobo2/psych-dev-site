// I/O fetchers для трёх источников статей: OpenAlex, OpenAIRE, Semantic Scholar.
// Возвращают нормализованные ResearchWork массивы.

import {
  normalizeOpenAIREWork,
  normalizeOpenAlexWork,
  normalizeSemanticScholarWork,
  type OpenAIREResult,
  type SemanticScholarPaper,
} from './papersNormalization.js';
import { PSYCHOLOGY_CONCEPT_IDS } from './papersScoring.js';
import type { OpenAlexWork, ResearchWork } from './papersTypes.js';

export async function fetchOpenAlex(
  q: string,
  langs: string[],
  candidateLimit: number,
  usePsychologyConceptFilter: boolean = true,
  requireOa: boolean = false, // OpenAlex incorrectly marks many open sources as non-OA
): Promise<ResearchWork[]> {
  const searchUrl = new URL('https://api.openalex.org/works');
  searchUrl.searchParams.set('search', q);

  // language + optionally OA + optionally psychology concepts
  const filters = [`language:${langs.join('|')}`];
  if (requireOa) {
    filters.push('is_oa:true');
  }
  if (usePsychologyConceptFilter) {
    // OpenAlex's ML-based concept classification for psychology — даёт сильно
    // более релевантные результаты (53 vs 5 для "агрессия").
    filters.push(`concepts.id:${PSYCHOLOGY_CONCEPT_IDS.join('|')}`);
  }
  searchUrl.searchParams.set('filter', filters.join(','));
  searchUrl.searchParams.set('per-page', String(candidateLimit));

  const response = await fetch(searchUrl.toString(), {
    headers: { 'User-Agent': 'psych-dev-site/oss-research-search' },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    const statusText = response.statusText || 'OpenAlex error';
    throw new Error(`OpenAlex ${response.status}: ${statusText}`);
  }

  const payload = await response.json();
  const items: OpenAlexWork[] = payload?.results ?? [];
  return items
    .map(normalizeOpenAlexWork)
    .filter((entry): entry is ResearchWork => Boolean(entry));
}

export async function fetchOpenAIRE(q: string, limit: number = 30): Promise<ResearchWork[]> {
  const url = new URL('https://api.openaire.eu/search/publications');
  url.searchParams.set('keywords', q);
  url.searchParams.set('format', 'json');
  url.searchParams.set('size', String(limit));

  const response = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`OpenAIRE ${response.status}`);

  const payload = await response.json();
  const results: OpenAIREResult[] = payload?.response?.results?.result ?? [];

  return results
    .map(normalizeOpenAIREWork)
    .filter((w): w is ResearchWork => w !== null);
}

export async function fetchSemanticScholar(
  q: string,
  limit: number = 30,
): Promise<ResearchWork[]> {
  const url = new URL('https://api.semanticscholar.org/graph/v1/paper/search');
  url.searchParams.set('query', q);
  url.searchParams.set('limit', String(Math.min(limit, 100))); // SS max is 100
  url.searchParams.set('fields', 'paperId,title,year,authors,abstract,externalIds,openAccessPdf,venue');

  const response = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Semantic Scholar ${response.status}`);

  const payload = await response.json();
  const papers: SemanticScholarPaper[] = payload?.data ?? [];

  return papers
    .map(normalizeSemanticScholarWork)
    .filter((w): w is ResearchWork => w !== null);
}

/**
 * Best-effort попытка догрузить отсутствующие abstracts по DOI через
 * Semantic Scholar single-paper endpoint. Никогда не бросает.
 */
export async function fetchSemanticScholarAbstracts(
  dois: string[],
  maxRequests = 5,
): Promise<Map<string, string>> {
  const limited = Array.from(new Set(dois.filter(Boolean))).slice(0, maxRequests);
  const result = new Map<string, string>();

  for (const doi of limited) {
    try {
      const url = new URL(
        `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(doi)}`,
      );
      url.searchParams.set('fields', 'abstract');
      const response = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });
      if (!response.ok) continue;
      const payload = await response.json();
      const abstract = payload?.abstract;
      if (abstract && typeof abstract === 'string' && abstract.trim().length > 0) {
        result.set(doi, abstract.trim());
      }
    } catch {
      // swallow; fallback best-effort
    }
  }

  return result;
}
