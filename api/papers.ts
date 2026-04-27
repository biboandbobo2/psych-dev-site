/* Serverless endpoint: GET /api/papers
 * Fetches open-access works from OpenAlex / OpenAIRE / Semantic Scholar,
 * applies allow-list + psychology relevance filtering, and per-IP rate
 * limiting. Helpers вынесены в api/lib/papers*.
 */
import type { IncomingMessage } from 'node:http';
import { filterByOpenAccess } from './lib/papersAllowList.js';
import { buildParagraph } from './lib/papersNormalization.js';
import {
  fetchOpenAIRE,
  fetchOpenAlex,
  fetchSemanticScholar,
} from './lib/papersSources.js';
import {
  PSYCHOLOGY_SCORE_THRESHOLD,
  getPsychologyScore,
} from './lib/papersScoring.js';
import { detectLang, translateRuToEn } from './lib/papersTranslation.js';
import type { PapersApiResponse, ResearchSource, ResearchWork } from './lib/papersTypes.js';

const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_MAX = 30; // 30 requests per window
const rateLimitStore = new Map<string, number[]>();

// TODO: Re-enable Chinese when needed
const DEFAULT_LANGS = ['ru', 'de', 'fr', 'es', 'en' /* 'zh' */];
const MAX_LIMIT = 50; // OpenAlex Concepts даёт больше релевантных результатов
const DEFAULT_LIMIT = 30;

function enforceRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const entries = rateLimitStore.get(ip)?.filter((ts) => ts >= windowStart) ?? [];

  if (entries.length >= RATE_LIMIT_MAX) {
    rateLimitStore.set(ip, entries);
    return false;
  }

  entries.push(now);
  rateLimitStore.set(ip, entries);
  return true;
}

function parseQueryParams(req: any): {
  qRaw: string;
  limit: number;
  langs: string[];
  mode: 'drawer' | 'page';
  psychologyOnly: boolean;
} {
  const qRaw = (req.query?.q ?? '').toString().trim();
  const limitRaw = Number.parseInt((req.query?.limit ?? '').toString(), 10);
  const langsRaw = (req.query?.langs ?? '').toString().trim();
  const modeRaw = (req.query?.mode ?? '').toString().trim();
  const psychologyOnlyRaw = (req.query?.psychologyOnly ?? '').toString().trim();

  const limit =
    Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, MAX_LIMIT) : DEFAULT_LIMIT;
  const langs: string[] =
    langsRaw.length > 0
      ? Array.from(
          new Set(
            langsRaw
              .split(',')
              .map((lang: string) => lang.trim().toLowerCase())
              .filter(Boolean),
          ),
        )
      : DEFAULT_LANGS;
  const mode: 'drawer' | 'page' = modeRaw === 'page' ? 'page' : 'drawer';
  // psychologyOnly defaults to true для psychology-focused search
  const psychologyOnly = psychologyOnlyRaw === 'false' ? false : true;

  return { qRaw, limit, langs, mode, psychologyOnly };
}

function getClientIp(req: IncomingMessage): string {
  const forwarded = (req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '') as string;
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return (req.socket && (req.socket as any).remoteAddress) || 'unknown';
}

export default async function handler(req: any, res: any) {
  const started = Date.now();

  if (req.method !== 'GET') {
    res.status(405).json({ status: 405, message: 'Method not allowed' });
    return;
  }

  const { qRaw, limit, langs, mode, psychologyOnly } = parseQueryParams(req);
  if (!qRaw || qRaw.length < 3) {
    res
      .status(400)
      .json({ status: 400, message: 'Query parameter q is required (min 3 chars)', code: 'INVALID_QUERY' });
    return;
  }

  const clientIp = getClientIp(req as IncomingMessage);
  if (!enforceRateLimit(clientIp)) {
    res.status(429).json({ status: 429, message: 'Rate limit exceeded', code: 'RATE_LIMITED' });
    return;
  }

  try {
    const candidateLimit = mode === 'page' ? 50 : 30;
    const baseLang = detectLang(qRaw);

    // Для русских запросов — перевод в английский для лучших результатов
    const translatedQuery = baseLang === 'ru' ? translateRuToEn(qRaw) : null;

    // Используем переведённый запрос для всех источников
    const openAlexQuery = translatedQuery || qRaw;
    const queryVariantsUsed: string[] = translatedQuery ? [translatedQuery, qRaw] : [qRaw];

    // =========================================================================
    // PARALLEL SEARCH: OpenAlex + OpenAIRE + Semantic Scholar
    // =========================================================================
    const sourcesUsed: ResearchSource[] = [];

    const [openAlexResult, openAIREResult, semanticScholarResult] = await Promise.allSettled([
      fetchOpenAlex(openAlexQuery, langs, candidateLimit, psychologyOnly, false).then((works) => {
        sourcesUsed.push('openalex');
        return filterByOpenAccess(works);
      }),
      fetchOpenAIRE(openAlexQuery, candidateLimit)
        .then((works) => {
          sourcesUsed.push('openaire');
          return works;
        })
        .catch(() => [] as ResearchWork[]),
      fetchSemanticScholar(openAlexQuery, candidateLimit)
        .then((works) => {
          sourcesUsed.push('semanticscholar');
          return works;
        })
        .catch(() => [] as ResearchWork[]),
    ]);

    // Source-based scoring: lower score = higher priority
    // (OpenAlex first, then OpenAIRE, then SS)
    const allWorks: ResearchWork[] = [];

    if (openAlexResult.status === 'fulfilled') {
      openAlexResult.value.forEach((work, idx) => {
        allWorks.push({ ...work, score: idx });
      });
    }
    if (openAIREResult.status === 'fulfilled') {
      openAIREResult.value.forEach((work, idx) => {
        allWorks.push({ ...work, score: 1000 + idx });
      });
    }
    if (semanticScholarResult.status === 'fulfilled') {
      semanticScholarResult.value.forEach((work, idx) => {
        allWorks.push({ ...work, score: 2000 + idx });
      });
    }

    // =========================================================================
    // DEDUPLICATION by DOI (case-insensitive), сохраняем приоритетный источник
    // =========================================================================
    const dedupedMap = new Map<string, ResearchWork>();

    allWorks.forEach((work) => {
      const doiKey = work.doi?.toLowerCase().replace('https://doi.org/', '');
      const titleKey = work.title.toLowerCase().replace(/[^a-zа-яё0-9]/g, '').slice(0, 50);
      const key = doiKey || titleKey;

      const existing = dedupedMap.get(key);
      const incomingScore = work.score ?? Number.MAX_SAFE_INTEGER;
      const existingScore = existing?.score ?? Number.MAX_SAFE_INTEGER;

      if (!existing || incomingScore < existingScore) {
        dedupedMap.set(key, work);
      }
    });

    const deduped = Array.from(dedupedMap.values()).sort(
      (a, b) => (a.score ?? 0) - (b.score ?? 0),
    );

    // =========================================================================
    // PSYCHOLOGY FILTER (if enabled)
    // =========================================================================
    const psychologyFiltered = psychologyOnly
      ? deduped.filter((work) => {
          const score = getPsychologyScore(work.title, work.paragraph, work.language, work.venue);
          return score >= PSYCHOLOGY_SCORE_THRESHOLD;
        })
      : deduped;

    // =========================================================================
    // FINAL PROCESSING
    // =========================================================================
    const sliced = psychologyFiltered.slice(0, limit).map((work) => ({
      ...work,
      paragraph: buildParagraph(work),
    }));

    const response: PapersApiResponse = {
      query: qRaw,
      results: sliced,
      meta: {
        tookMs: Date.now() - started,
        cached: false,
        sourcesUsed: Array.from(new Set(sourcesUsed)),
        allowListApplied: true,
        psychologyFilterApplied: psychologyOnly,
        queryVariantsUsed,
      },
    };

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json(response);
  } catch (error: any) {
    const message = error?.message || 'Upstream unavailable';
    res.status(502).json({
      status: 502,
      message: 'Search service temporarily unavailable',
      code: 'UPSTREAM_UNAVAILABLE',
      detail: message,
    });
  }
}
