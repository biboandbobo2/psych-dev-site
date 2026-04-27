// Нормализация ответов трёх источников (OpenAlex, OpenAIRE, Semantic Scholar)
// в общий ResearchWork + reconstruction abstract из inverted index +
// сборка отображаемого абзаца + enrichment fallback abstracts.

import { cleanHost } from './papersAllowList.js';
import type { OpenAlexWork, ResearchSource, ResearchWork } from './papersTypes.js';

export type OpenAIREResult = {
  header?: { 'dri:objIdentifier'?: { $?: string } };
  metadata?: {
    'oaf:entity'?: {
      'oaf:result'?: {
        title?: { $?: string } | Array<{ $?: string }>;
        creator?: { $?: string } | Array<{ $?: string; '@rank'?: string }>;
        dateofacceptance?: { $?: string };
        description?: { $?: string };
        language?: { '@classname'?: string };
        pid?: Array<{ '@classid'?: string; '$'?: string }> | { '@classid'?: string; '$'?: string };
        children?: {
          instance?: Array<{
            webresource?: { url?: { $?: string } };
            accessright?: { '@classid'?: string };
          }>;
        };
      };
    };
  };
};

export type SemanticScholarPaper = {
  paperId?: string;
  title?: string;
  year?: number;
  authors?: Array<{ name?: string }>;
  abstract?: string;
  externalIds?: { DOI?: string };
  openAccessPdf?: { url?: string };
  venue?: string;
};

/**
 * Восстанавливает связный текст абстракта из inverted index OpenAlex
 * (мап слово → массив позиций). Возвращает null если индекс пуст.
 */
export function reconstructAbstractFromIndex(
  index?: Record<string, number[]> | null,
): string | null {
  if (!index) return null;
  const positions: Array<{ word: string; pos: number }> = [];

  for (const [word, posList] of Object.entries(index)) {
    posList.forEach((pos) => {
      positions.push({ word, pos });
    });
  }

  if (positions.length === 0) return null;

  positions.sort((a, b) => a.pos - b.pos);
  const maxPos = positions[positions.length - 1]?.pos ?? 0;
  const words = new Array(maxPos + 1).fill('');

  positions.forEach(({ word, pos }) => {
    words[pos] = word;
  });

  const result = words.join(' ').replace(/\s+/g, ' ').trim();
  return result || null;
}

/**
 * Собирает отображаемый параграф для карточки результата.
 * Если есть raw paragraph (abstract) — обрезает до 650 символов;
 * иначе fallback на venue + год + язык + 3 первых автора.
 */
export function buildParagraph(work: ResearchWork): string | null {
  const raw = work.paragraph;
  if (raw) {
    const cleaned = raw.replace(/\s+/g, ' ').trim();
    if (cleaned.length === 0) return null;
    const maxLen = 650;
    return cleaned.length > maxLen ? `${cleaned.slice(0, maxLen).trim()}…` : cleaned;
  }

  const parts: string[] = [];
  if (work.venue) parts.push(work.venue);
  if (work.year) parts.push(String(work.year));
  if (work.language && work.language !== 'unknown') parts.push(work.language.toUpperCase());
  if (work.authors.length) parts.push(work.authors.slice(0, 3).join(', '));

  if (!parts.length) return null;
  return `Описание по метаданным: ${parts.join(' • ')}`;
}

export function normalizeOpenAlexWork(item: OpenAlexWork): ResearchWork | null {
  const id = item.id ?? '';
  if (!id) return null;

  const authors: string[] =
    item.authorships
      ?.map((auth) => auth.author?.display_name)
      .filter((name): name is string => Boolean(name)) ?? [];

  const primaryUrl =
    item.primary_location?.landing_page_url ?? item.open_access?.oa_url ?? null;
  const oaPdfUrl = item.primary_location?.pdf_url ?? item.open_access?.oa_url ?? null;

  const paragraph = reconstructAbstractFromIndex(item.abstract_inverted_index) ?? null;
  const host = cleanHost(oaPdfUrl || primaryUrl);

  return {
    id,
    title: item.display_name ?? 'Untitled',
    year: item.publication_year ?? null,
    authors,
    venue:
      item.primary_location?.source?.display_name ?? item.host_venue?.display_name ?? null,
    language: item.language ?? 'unknown',
    doi: item.doi ?? null,
    primaryUrl,
    oaPdfUrl,
    paragraph,
    source: 'openalex',
    host,
    isOa: item.open_access?.is_oa ?? false,
  };
}

export function normalizeOpenAIREWork(result: OpenAIREResult): ResearchWork | null {
  const meta = result?.metadata?.['oaf:entity']?.['oaf:result'];
  if (!meta) return null;

  let title = '';
  if (meta.title) {
    if (Array.isArray(meta.title)) {
      title = meta.title[0]?.['$'] ?? '';
    } else {
      title = meta.title['$'] ?? '';
    }
  }
  if (!title) return null;

  let doi: string | null = null;
  const pids = meta.pid;
  if (pids) {
    const pidArray = Array.isArray(pids) ? pids : [pids];
    for (const pid of pidArray) {
      if (pid['@classid'] === 'doi' && pid['$']) {
        doi = pid['$'].toLowerCase();
        break;
      }
    }
  }

  const authors: string[] = [];
  if (meta.creator) {
    const creators = Array.isArray(meta.creator) ? meta.creator : [meta.creator];
    for (const c of creators) {
      const name = typeof c === 'string' ? c : c['$'];
      if (name) authors.push(name);
    }
  }

  let year: number | null = null;
  if (meta.dateofacceptance?.['$']) {
    const match = meta.dateofacceptance['$'].match(/^(\d{4})/);
    if (match) year = parseInt(match[1], 10);
  }

  let primaryUrl: string | null = null;
  let oaPdfUrl: string | null = null;
  const instances = meta.children?.instance;
  if (instances && Array.isArray(instances)) {
    for (const inst of instances) {
      const url = inst.webresource?.url?.['$'];
      if (url) {
        if (!primaryUrl) primaryUrl = url;
        if (inst.accessright?.['@classid'] === 'OPEN' && !oaPdfUrl) {
          oaPdfUrl = url;
        }
      }
    }
  }

  const langClass = meta.language?.['@classname'] ?? 'unknown';
  const language =
    langClass === 'English'
      ? 'en'
      : langClass === 'Russian'
        ? 'ru'
        : langClass.toLowerCase().slice(0, 2);

  const paragraph = meta.description?.['$'] ?? null;

  const id = result.header?.['dri:objIdentifier']?.['$'] ?? `openaire-${doi ?? title.slice(0, 30)}`;

  return {
    id,
    title,
    year,
    authors: authors.slice(0, 5),
    venue: null,
    language: language || 'unknown',
    doi: doi ? `https://doi.org/${doi}` : null,
    primaryUrl,
    oaPdfUrl,
    paragraph,
    source: 'openaire' as ResearchSource,
    host: cleanHost(oaPdfUrl || primaryUrl),
    isOa: Boolean(oaPdfUrl),
  };
}

export function normalizeSemanticScholarWork(paper: SemanticScholarPaper): ResearchWork | null {
  if (!paper.title) return null;

  const doi = paper.externalIds?.DOI?.toLowerCase();
  const oaPdfUrl = paper.openAccessPdf?.url ?? null;

  return {
    id: paper.paperId ?? `ss-${doi ?? paper.title.slice(0, 30)}`,
    title: paper.title,
    year: paper.year ?? null,
    authors: (paper.authors ?? []).map((a) => a.name ?? '').filter(Boolean).slice(0, 5),
    venue: paper.venue ?? null,
    language: 'unknown', // Semantic Scholar не возвращает язык надёжно
    doi: doi ? `https://doi.org/${doi}` : null,
    primaryUrl: doi ? `https://doi.org/${doi}` : null,
    oaPdfUrl,
    paragraph: paper.abstract ?? null,
    source: 'semanticscholar' as ResearchSource,
    host: cleanHost(oaPdfUrl || (doi ? `https://doi.org/${doi}` : null)),
    isOa: Boolean(oaPdfUrl),
  };
}

export function enrichWithAbstractFallback(
  items: ResearchWork[],
  abstractMap: Map<string, string>,
): ResearchWork[] {
  return items.map((item) => {
    if (item.paragraph || !item.doi) return item;
    const extra = abstractMap.get(item.doi);
    if (!extra) return item;
    return {
      ...item,
      paragraph: extra,
      source: item.source, // keep original source marker
    };
  });
}
