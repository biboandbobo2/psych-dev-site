import { TtlCache } from './cache';
import { debugWarn } from '../../../lib/debug';

type WikidataSearchResult = {
  id: string;
  label?: string;
  description?: string;
};

type WikidataEntity = {
  id: string;
  labels: Record<string, { value: string }>;
  aliases?: Record<string, Array<{ value: string }>>;
};

const SEARCH_CACHE = new TtlCache<WikidataSearchResult[]>(6 * 60 * 60 * 1000); // 6h
const ENTITY_CACHE = new TtlCache<Record<string, WikidataEntity>>(6 * 60 * 60 * 1000); // 6h

const WD_ENDPOINT = 'https://www.wikidata.org/w/api.php';
// TODO: Re-enable Chinese when needed
const DEFAULT_LANGS = ['ru', 'en', 'de', 'fr', 'es'];

async function fetchJson(url: string, timeoutMs: number): Promise<any> {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) {
    throw new Error(`Wikidata ${response.status}`);
  }
  return response.json();
}

export async function searchEntities(q: string, lang: string, limit = 3, timeoutMs = 1200): Promise<WikidataSearchResult[]> {
  const cacheKey = `${lang}:${q}`;
  const cached = SEARCH_CACHE.get(cacheKey);
  if (cached) return cached;

  const url = new URL(WD_ENDPOINT);
  url.searchParams.set('action', 'wbsearchentities');
  url.searchParams.set('search', q);
  url.searchParams.set('language', lang || 'en');
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');

  try {
    const payload = await fetchJson(url.toString(), timeoutMs);
    const results: WikidataSearchResult[] = (payload?.search ?? [])
      .slice(0, limit)
      .map((item: any) => ({
        id: item.id,
        label: item.label,
        description: item.description,
      }));
    SEARCH_CACHE.set(cacheKey, results);
    return results;
  } catch (error) {
    debugWarn('[wikidata.searchEntities] fallback to empty', error);
    return [];
  }
}

export async function getEntities(qids: string[], languages: string[] = DEFAULT_LANGS, timeoutMs = 1500): Promise<Record<string, WikidataEntity>> {
  const uniqueQids = Array.from(new Set(qids)).filter(Boolean);
  if (!uniqueQids.length) return {};

  const cacheKey = `${uniqueQids.sort().join('|')}:${languages.sort().join('|')}`;
  const cached = ENTITY_CACHE.get(cacheKey);
  if (cached) return cached;

  const url = new URL(WD_ENDPOINT);
  url.searchParams.set('action', 'wbgetentities');
  url.searchParams.set('ids', uniqueQids.join('|'));
  url.searchParams.set('props', 'labels|aliases');
  url.searchParams.set('languages', languages.join('|'));
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');

  try {
    const payload = await fetchJson(url.toString(), timeoutMs);
    const entities: Record<string, WikidataEntity> = payload?.entities ?? {};
    ENTITY_CACHE.set(cacheKey, entities);
    return entities;
  } catch (error) {
    debugWarn('[wikidata.getEntities] fallback to empty', error);
    return {};
  }
}

export type QueryVariantSource = {
  qid: string;
  lang: string;
  value: string;
  kind: 'label' | 'alias';
};

export function extractLabelsAndAliases(
  entities: Record<string, WikidataEntity>,
  languages: string[] = DEFAULT_LANGS,
  maxAliasesPerLang = 2
): QueryVariantSource[] {
  const variants: QueryVariantSource[] = [];
  const langs = Array.from(new Set(languages));

  Object.values(entities ?? {}).forEach((entity) => {
    langs.forEach((lang) => {
      const label = entity.labels?.[lang]?.value;
      if (label) {
        variants.push({ qid: entity.id, lang, value: label, kind: 'label' });
      }
      const aliases = entity.aliases?.[lang] ?? [];
      aliases.slice(0, maxAliasesPerLang).forEach((alias) => {
        if (alias?.value) {
          variants.push({ qid: entity.id, lang, value: alias.value, kind: 'alias' });
        }
      });
    });
  });

  return variants;
}
