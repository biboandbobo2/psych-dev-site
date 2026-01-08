/**
 * Утилиты для нормализации и слияния данных при reconcile
 */

export type ReconcileArrayField =
  | 'concepts'
  | 'authors'
  | 'core_literature'
  | 'extra_literature'
  | 'extra_videos'
  | 'video_playlist'
  | 'leisure';

export const ARRAY_FIELDS: ReconcileArrayField[] = [
  'concepts',
  'authors',
  'core_literature',
  'extra_literature',
  'extra_videos',
  'video_playlist',
  'leisure',
];

export type Author = { name: string; url?: string };
export type Link = { title: string; url?: string };
export type Leisure = { title: string; url?: string; type?: string; year?: string };
export type VideoEntry = { title: string; url: string; deckUrl?: string; audioUrl?: string };

export function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function normalizeAuthor(value: any): Author | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') {
    const name = normalizeSpaces(value);
    if (!name) return undefined;
    return { name };
  }
  if (typeof value === 'object') {
    const name = normalizeSpaces(String(value.name ?? value.title ?? ''));
    if (!name) return undefined;
    const url = value.url ?? value.link ?? value.href;
    return url ? { name, url: String(url).trim() } : { name };
  }
  return undefined;
}

export function normalizeAuthors(value: unknown): Author[] {
  if (!Array.isArray(value)) return [];
  const result: Author[] = [];
  value.forEach((item) => {
    const normalized = normalizeAuthor(item);
    if (normalized) result.push(normalized);
  });
  return result;
}

export function normalizeLink(value: any): Link | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') {
    const title = normalizeSpaces(value);
    if (!title) return undefined;
    return { title };
  }
  if (typeof value === 'object') {
    const title = normalizeSpaces(String(value.title ?? value.name ?? ''));
    if (!title) return undefined;
    const url = value.url ?? value.link ?? value.href;
    return url ? { title, url: String(url).trim() } : { title };
  }
  return undefined;
}

export function normalizeLinks(value: unknown): Link[] {
  if (!Array.isArray(value)) return [];
  const result: Link[] = [];
  value.forEach((item) => {
    const normalized = normalizeLink(item);
    if (normalized) result.push(normalized);
  });
  return result;
}

export function normalizeVideoPlaylist(value: unknown): VideoEntry[] {
  if (!Array.isArray(value)) return [];
  const result: VideoEntry[] = [];
  value.forEach((item) => {
    if (!item) return;
    if (typeof item === 'string') {
      const url = normalizeSpaces(item);
      if (url) result.push({ title: '', url });
      return;
    }
    if (typeof item === 'object') {
      const rawUrl = (item as any).url ?? (item as any).videoUrl ?? (item as any).src;
      const url = rawUrl ? normalizeSpaces(String(rawUrl)) : '';
      if (!url) return;
      const title = normalizeSpaces(String((item as any).title ?? (item as any).label ?? ''));
      const deck = (item as any).deckUrl ?? (item as any).deck_url;
      const audio = (item as any).audioUrl ?? (item as any).audio_url;
      result.push({
        title,
        url,
        ...(deck ? { deckUrl: normalizeSpaces(String(deck)) } : {}),
        ...(audio ? { audioUrl: normalizeSpaces(String(audio)) } : {}),
      });
    }
  });
  return result;
}

export function normalizeLeisure(value: unknown): Leisure[] {
  if (!Array.isArray(value)) return [];
  const result: Leisure[] = [];
  value.forEach((item) => {
    if (!item) return;
    if (typeof item === 'string') {
      const title = normalizeSpaces(item);
      if (title) result.push({ title });
      return;
    }
    if (typeof item === 'object') {
      const title = normalizeSpaces(String((item as any).title ?? (item as any).name ?? ''));
      if (!title) return;
      const urlRaw = (item as any).url ?? (item as any).link;
      const typeRaw = (item as any).type ?? (item as any).category;
      const yearRaw = (item as any).year;
      result.push({
        title,
        ...(urlRaw ? { url: String(urlRaw).trim() } : {}),
        ...(typeRaw ? { type: normalizeSpaces(String(typeRaw)) } : {}),
        ...(yearRaw !== undefined && yearRaw !== null
          ? { year: normalizeSpaces(String(yearRaw)) }
          : {}),
      });
    }
  });
  return result;
}

export function normalizeConcepts(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalizeSpaces(String(item ?? '')))
    .filter((item) => item.length > 0);
}

function conceptKey(value: string): string {
  return normalizeSpaces(value).toLowerCase();
}

function authorKey(value: Author): string {
  const name = normalizeSpaces(value.name).toLowerCase();
  const url = value.url ? value.url.trim().toLowerCase() : '';
  return `${name}|${url}`;
}

function linkKey(value: Link): string {
  const title = normalizeSpaces(value.title).toLowerCase();
  const url = value.url ? value.url.trim().toLowerCase() : '';
  return `${title}|${url}`;
}

function videoKey(value: VideoEntry): string {
  const title = normalizeSpaces(value.title).toLowerCase();
  const url = value.url.trim().toLowerCase();
  const deck = value.deckUrl ? normalizeSpaces(value.deckUrl).toLowerCase() : '';
  const audio = value.audioUrl ? normalizeSpaces(value.audioUrl).toLowerCase() : '';
  return `${title}|${url}|${deck}|${audio}`;
}

function leisureKey(value: Leisure): string {
  const title = normalizeSpaces(value.title).toLowerCase();
  const url = value.url ? value.url.trim().toLowerCase() : '';
  const type = value.type ? normalizeSpaces(value.type).toLowerCase() : '';
  const year = value.year ? normalizeSpaces(value.year).toLowerCase() : '';
  return `${title}|${url}|${type}|${year}`;
}

export function mergeUniqueStrings(current: string[], additions: string[]): string[] {
  const set = new Set(current.map(conceptKey));
  const result = [...current];
  additions.forEach((item) => {
    const key = conceptKey(item);
    if (!set.has(key)) {
      set.add(key);
      result.push(item);
    }
  });
  return result;
}

export function mergeUniqueAuthors(current: Author[], additions: Author[]): Author[] {
  const set = new Set(current.map(authorKey));
  const result = [...current];
  additions.forEach((item) => {
    const key = authorKey(item);
    if (!set.has(key)) {
      set.add(key);
      result.push(item);
    }
  });
  return result;
}

export function mergeUniqueLinks(current: Link[], additions: Link[]): Link[] {
  const set = new Set(current.map(linkKey));
  const result = [...current];
  additions.forEach((item) => {
    const key = linkKey(item);
    if (!set.has(key)) {
      set.add(key);
      result.push(item);
    }
  });
  return result;
}

export function mergeUniqueVideos(current: VideoEntry[], additions: VideoEntry[]): VideoEntry[] {
  const set = new Set(current.map(videoKey));
  const result = [...current];
  additions.forEach((item) => {
    const key = videoKey(item);
    if (!set.has(key)) {
      set.add(key);
      result.push(item);
    }
  });
  return result;
}

export function mergeUniqueLeisure(current: Leisure[], additions: Leisure[]): Leisure[] {
  const set = new Set(current.map(leisureKey));
  const result = [...current];
  additions.forEach((item) => {
    const key = leisureKey(item);
    if (!set.has(key)) {
      set.add(key);
      result.push(item);
    }
  });
  return result;
}
