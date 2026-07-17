/* Serverless endpoint: GET /api/papers
 * Fetches open-access works from OpenAlex / OpenAIRE / Semantic Scholar,
 * applies allow-list + psychology relevance filtering, and per-IP rate
 * limiting. Helpers вынесены в api/_lib/papers*.
 */
import type { IncomingMessage } from 'node:http';
import { filterByOpenAccess } from './_lib/papersAllowList.js';
import { buildParagraph } from './_lib/papersNormalization.js';
import {
  fetchOpenAIRE,
  fetchOpenAlex,
  fetchSemanticScholar,
} from './_lib/papersSources.js';
import {
  PSYCHOLOGY_SCORE_THRESHOLD,
  getPsychologyScore,
} from './_lib/papersScoring.js';
import { detectLang, translateRuToEn } from './_lib/papersTranslation.js';
import { wdGetEntities, wdSearch } from './_lib/papersWikidata.js';
import type { PapersApiResponse, ResearchSource, ResearchWork } from './_lib/papersTypes.js';

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

const CYRILLIC_RE = /[а-яё]/i;

/**
 * Строит чистый английский вариант русского запроса: сначала словарь,
 * при неполном переводе — Wikidata (английский лейбл найденного концепта).
 * Гибридные RU/EN строки не возвращает: источники выдают на них мусор.
 */
async function buildEnglishQuery(qRaw: string): Promise<string | null> {
  const dict = translateRuToEn(qRaw);
  if (dict && !CYRILLIC_RE.test(dict)) return dict;

  try {
    const found = await wdSearch(qRaw, 'ru', 3, 1200);
    if (found.length === 0) return null;
    const entities = await wdGetEntities(
      found.map((f) => f.id),
      ['en'],
      1200,
    );
    for (const f of found) {
      const label = entities[f.id]?.labels?.en?.value?.trim();
      if (label && !CYRILLIC_RE.test(label)) return label.toLowerCase();
    }
  } catch {
    // Wikidata недоступна — ищем только по русскому оригиналу
  }
  return null;
}

function dedupeWorks(works: ResearchWork[]): ResearchWork[] {
  const dedupedMap = new Map<string, ResearchWork>();

  works.forEach((work) => {
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

  return Array.from(dedupedMap.values()).sort((a, b) => (a.score ?? 0) - (b.score ?? 0));
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

    // Для русских запросов строим чистый английский вариант (словарь → Wikidata)
    // и ищем параллельно по нему и по оригиналу. Гибриды не отправляем.
    const enQuery = baseLang === 'ru' ? await buildEnglishQuery(qRaw) : null;
    const queries = enQuery ? [enQuery, qRaw] : [qRaw];
    const queryVariantsUsed: string[] = queries;

    // =========================================================================
    // PARALLEL SEARCH: OpenAlex (по каждому варианту) + OpenAIRE + Semantic Scholar
    // Score offset: ниже = приоритетнее (EN-вариант OpenAlex → RU-оригинал → OpenAIRE → SS)
    // =========================================================================
    const tasks: Array<{ source: ResearchSource; offset: number; run: () => Promise<ResearchWork[]> }> = [
      ...queries.map((q, idx) => ({
        source: 'openalex' as const,
        offset: idx * 500,
        run: () =>
          fetchOpenAlex(q, langs, candidateLimit, psychologyOnly, false).then(filterByOpenAccess),
      })),
      {
        source: 'openaire' as const,
        offset: 1000,
        run: () => fetchOpenAIRE(enQuery ?? qRaw, candidateLimit),
      },
      {
        source: 'semanticscholar' as const,
        offset: 2000,
        run: () => fetchSemanticScholar(enQuery ?? qRaw, candidateLimit),
      },
    ];

    const settled = await Promise.allSettled(tasks.map((task) => task.run()));
    const sourcesUsed: ResearchSource[] = [];
    const allWorks: ResearchWork[] = [];

    settled.forEach((result, i) => {
      if (result.status !== 'fulfilled') return;
      sourcesUsed.push(tasks[i].source);
      result.value.forEach((work, idx) => {
        allWorks.push({ ...work, score: tasks[i].offset + idx });
      });
    });

    // Дедупликация по DOI (case-insensitive), сохраняем приоритетный источник
    const deduped = dedupeWorks(allWorks);

    // =========================================================================
    // PSYCHOLOGY FILTER (if enabled) + авто-ослабление при пустой выдаче
    // =========================================================================
    let psychologyFilterRelaxed = false;
    let psychologyFiltered = psychologyOnly
      ? deduped.filter((work) => {
          // OpenAlex уже отфильтрован ML-концептами психологии — лексический
          // словарь применяем только к источникам без классификации
          if (work.source === 'openalex') return true;
          const score = getPsychologyScore(work.title, work.paragraph, work.language, work.venue);
          return score >= PSYCHOLOGY_SCORE_THRESHOLD;
        })
      : deduped;

    if (psychologyOnly && psychologyFiltered.length === 0) {
      if (deduped.length > 0) {
        // Лексический фильтр срезал всё — показываем результаты без него
        psychologyFiltered = deduped;
        psychologyFilterRelaxed = true;
      } else {
        // Источники с концепт-фильтром не дали ничего — повтор OpenAlex без него
        const retrySettled = await Promise.allSettled(
          queries.map((q) =>
            fetchOpenAlex(q, langs, candidateLimit, false, false).then(filterByOpenAccess),
          ),
        );
        const retryWorks: ResearchWork[] = [];
        retrySettled.forEach((result, i) => {
          if (result.status !== 'fulfilled') return;
          result.value.forEach((work, idx) => {
            retryWorks.push({ ...work, score: i * 500 + idx });
          });
        });
        const retryDeduped = dedupeWorks(retryWorks);
        if (retryDeduped.length > 0) {
          psychologyFiltered = retryDeduped;
          psychologyFilterRelaxed = true;
        }
      }
    }

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
        psychologyFilterRelaxed: psychologyFilterRelaxed || undefined,
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
