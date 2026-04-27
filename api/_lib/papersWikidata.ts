// Standalone Wikidata client (без src/ зависимостей) для расширения запроса
// в /api/papers через лейблы / алиасы по нескольким языкам.

export type WikidataSearchResult = {
  id: string;
  label?: string;
  description?: string;
};

export type WikidataEntity = {
  id: string;
  labels: Record<string, { value: string }>;
  aliases?: Record<string, Array<{ value: string }>>;
};

export type QueryVariantSource = {
  variant: string;
  lang: string;
  source: 'wikidata' | 'original';
};

class TtlCache<T> {
  private store = new Map<string, { value: T; expiresAt: number }>();
  constructor(private readonly ttlMs: number) {}
  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }
  set(key: string, value: T) {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }
}

const SEARCH_CACHE = new TtlCache<WikidataSearchResult[]>(6 * 60 * 60 * 1000);
const ENTITY_CACHE = new TtlCache<Record<string, WikidataEntity>>(6 * 60 * 60 * 1000);
const WD_ENDPOINT = 'https://www.wikidata.org/w/api.php';
// TODO: Re-enable Chinese when needed
export const WD_DEFAULT_LANGS = ['ru', 'en', 'de', 'fr', 'es' /* 'zh' */];

async function fetchJson(url: string, timeoutMs: number): Promise<any> {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error(`Wikidata ${response.status}`);
  return response.json();
}

export async function wdSearch(
  q: string,
  lang: string,
  limit = 3,
  timeoutMs = 1200,
): Promise<WikidataSearchResult[]> {
  const cacheKey = `${lang}:${q}`;
  const cached = SEARCH_CACHE.get(cacheKey);
  if (cached) return cached;
  const url = new URL(WD_ENDPOINT);
  url.searchParams.set('action', 'wbsearchentities');
  url.searchParams.set('search', q);
  url.searchParams.set('language', lang || 'en');
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('format', 'json');
  const data = await fetchJson(url.toString(), timeoutMs);
  const results: WikidataSearchResult[] = (data?.search ?? []).map((item: any) => ({
    id: item.id,
    label: item.label,
    description: item.description,
  }));
  SEARCH_CACHE.set(cacheKey, results);
  return results;
}

export async function wdGetEntities(
  ids: string[],
  langs: string[],
  timeoutMs = 1500,
): Promise<Record<string, WikidataEntity>> {
  if (ids.length === 0) return {};
  const cacheKey = `${ids.join(',')}:${langs.join(',')}`;
  const cached = ENTITY_CACHE.get(cacheKey);
  if (cached) return cached;
  const url = new URL(WD_ENDPOINT);
  url.searchParams.set('action', 'wbgetentities');
  url.searchParams.set('ids', ids.join('|'));
  url.searchParams.set('props', 'labels|aliases');
  url.searchParams.set(
    'languages',
    langs.length > 0 ? langs.join('|') : WD_DEFAULT_LANGS.join('|'),
  );
  url.searchParams.set('format', 'json');
  const data = await fetchJson(url.toString(), timeoutMs);
  const entities: Record<string, WikidataEntity> = {};
  for (const [qid, val] of Object.entries(data?.entities ?? {})) {
    const e = val as any;
    if (e.missing) continue;
    entities[qid] = {
      id: qid,
      labels: e.labels ?? {},
      aliases: e.aliases ?? {},
    };
  }
  ENTITY_CACHE.set(cacheKey, entities);
  return entities;
}

export function extractLabelsAndAliases(entity: WikidataEntity): QueryVariantSource[] {
  const variants: QueryVariantSource[] = [];
  for (const [langCode, labelObj] of Object.entries(entity.labels ?? {})) {
    const val = (labelObj as any).value?.trim();
    if (val) variants.push({ variant: val, lang: langCode, source: 'wikidata' });
  }
  for (const [langCode, aliasArr] of Object.entries(entity.aliases ?? {})) {
    for (const aliasObj of aliasArr as any[]) {
      const val = aliasObj.value?.trim();
      if (val) variants.push({ variant: val, lang: langCode, source: 'wikidata' });
    }
  }
  return variants;
}
