import type { Firestore } from 'firebase-admin/firestore';

export type PeriodDoc = {
  period: string;
  title?: string;
  subtitle?: string;
  accent?: string;
  accent100?: string;
  published?: boolean;
  order?: number;
  concepts?: string[];
  authors?: { name: string; url?: string }[];
  core_literature?: { title: string; url?: string }[];
  extra_literature?: { title: string; url?: string }[];
  extra_videos?: { title: string; url?: string }[];
  video_playlist?: { title?: string; url?: string; deckUrl?: string; deck_url?: string; audioUrl?: string; audio_url?: string }[];
  leisure?: { title?: string; url?: string; type?: string; year?: string | number }[];
  video_url?: string;
  deck_url?: string;
  audio_url?: string;
  self_questions_url?: string;
  background?: string;
};

export type ExpectedBundle = {
  periods: PeriodDoc[];
  intro?: PeriodDoc;
};

export type PeriodDiffSummary = {
  scalarsMismatched: string[];
  missingInFirestore: Record<string, number>;
  extraInFirestore: Record<string, number>;
  missingDocument?: boolean;
};

export type VerifyResult = {
  reportMd: string;
  diffJson: {
    perPeriod: Record<string, {
      missingDocument?: boolean;
      scalars: Record<string, { expected: any; actual: any }>;
      arrays: Record<string, { missing: any[]; extra: any[] }>;
    }>;
    extraDocuments: string[];
  };
  summaryPerPeriod: Record<string, PeriodDiffSummary>;
};

const SCALAR_FIELDS = [
  'title',
  'subtitle',
  'accent',
  'accent100',
  'published',
  'order',
  'placeholder_enabled',
  'video_url',
  'deck_url',
  'audio_url',
  'self_questions_url',
  'background',
] as const;

const ARRAY_FIELDS = {
  concepts: 'string',
  authors: 'author',
  core_literature: 'link',
  extra_literature: 'link',
  extra_videos: 'link',
  video_playlist: 'video',
  leisure: 'leisure',
} as const;

type ArrayField = keyof typeof ARRAY_FIELDS;

type Author = { name: string; url?: string };
type Link = { title: string; url?: string };
type LeisureItem = { title: string; url?: string; type?: string; year?: string };
type VideoItem = { title: string; url: string; deckUrl?: string; audioUrl?: string };

type NormalizedArrays = {
  concepts: string[];
  authors: Author[];
  core_literature: Link[];
  extra_literature: Link[];
  extra_videos: Link[];
  video_playlist: VideoItem[];
  leisure: LeisureItem[];
};

const ARRAY_FIELD_LIST = Object.keys(ARRAY_FIELDS) as Array<ArrayField>;

type NormalizeFn = (value: unknown) => any[];
type KeyFn = (value: any) => string;

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeUrl(url?: string): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    const params = new URLSearchParams();
    parsed.searchParams.forEach((val, key) => {
      if (!key.toLowerCase().startsWith('utm')) params.append(key, val);
    });
    const base = `${parsed.protocol}//${parsed.host.toLowerCase()}${parsed.pathname}`;
    const search = params.toString();
    const hash = parsed.hash ? parsed.hash.toLowerCase() : '';
    return `${base}${search ? `?${search}` : ''}${hash}`;
  } catch {
    return trimmed.toLowerCase();
  }
}

function normalizeScalar(expected: unknown, actual: unknown): boolean {
  const a = expected;
  const b = actual;
  if (a === undefined || a === null) {
    return b === undefined || b === null;
  }
  if (typeof a === 'number') {
    return Number(a) === Number(b);
  }
  if (typeof a === 'boolean') {
    return Boolean(a) === Boolean(b);
  }
  return normalizeSpaces(String(a)).toLowerCase() === normalizeSpaces(String(b ?? '')).toLowerCase();
}

function normalizeConcepts(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalizeSpaces(String(item ?? '')))
    .filter((item) => item.length > 0);
}

function normalizeAuthor(value: any): Author | undefined {
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

function normalizeAuthors(value: unknown): Author[] {
  if (!Array.isArray(value)) return [];
  const authors: Author[] = [];
  value.forEach((item) => {
    const normalized = normalizeAuthor(item);
    if (normalized) authors.push(normalized);
  });
  return authors;
}

function normalizeLink(value: any): Link | undefined {
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

function normalizeLinks(value: unknown): Link[] {
  if (!Array.isArray(value)) return [];
  const links: Link[] = [];
  value.forEach((item) => {
    const normalized = normalizeLink(item);
    if (normalized) links.push(normalized);
  });
  return links;
}

function normalizeLeisure(value: unknown): LeisureItem[] {
  if (!Array.isArray(value)) return [];
  const items: LeisureItem[] = [];
  value.forEach((item) => {
    if (!item) return;
    if (typeof item === 'string') {
      const title = normalizeSpaces(item);
      if (title) items.push({ title });
      return;
    }
    if (typeof item === 'object') {
      const title = normalizeSpaces(String((item as any).title ?? (item as any).name ?? ''));
      if (!title) return;
      const urlRaw = (item as any).url ?? (item as any).link;
      const typeRaw = (item as any).type ?? (item as any).category;
      const yearRaw = (item as any).year;
      items.push({
        title,
        ...(urlRaw ? { url: String(urlRaw).trim() } : {}),
        ...(typeRaw ? { type: normalizeSpaces(String(typeRaw)) } : {}),
        ...(yearRaw !== undefined && yearRaw !== null
          ? { year: normalizeSpaces(String(yearRaw)) }
          : {}),
      });
    }
  });
  return items;
}

const ARRAY_NORMALIZERS: Record<ArrayField, NormalizeFn> = {
  concepts: normalizeConcepts,
  authors: normalizeAuthors,
  core_literature: normalizeLinks,
  extra_literature: normalizeLinks,
  extra_videos: normalizeLinks,
  video_playlist: normalizeVideoPlaylist,
  leisure: normalizeLeisure,
};

function conceptKey(value: string): string {
  return normalizeSpaces(value).toLowerCase();
}

function authorKey(value: Author): string {
  const name = normalizeSpaces(value.name).toLowerCase();
  const url = normalizeUrl(value.url) ?? '';
  return `${name}|${url}`;
}

function linkKey(value: Link): string {
  const title = normalizeSpaces(value.title).toLowerCase();
  const url = normalizeUrl(value.url) ?? '';
  return `${title}|${url}`;
}

function videoKey(value: VideoItem): string {
  const title = normalizeSpaces(value.title).toLowerCase();
  const url = normalizeUrl(value.url) ?? '';
  const deck = value.deckUrl ? normalizeSpaces(value.deckUrl).toLowerCase() : '';
  const audio = value.audioUrl ? normalizeSpaces(value.audioUrl).toLowerCase() : '';
  return `${title}|${url}|${deck}|${audio}`;
}

function leisureKey(value: LeisureItem): string {
  const title = normalizeSpaces(value.title).toLowerCase();
  const url = normalizeUrl(value.url) ?? '';
  const type = value.type ? normalizeSpaces(value.type).toLowerCase() : '';
  const year = value.year ? normalizeSpaces(String(value.year)).toLowerCase() : '';
  return `${title}|${url}|${type}|${year}`;
}

function normalizeVideoPlaylist(value: unknown): VideoItem[] {
  if (!Array.isArray(value)) return [];
  const items: VideoItem[] = [];
  value.forEach((item) => {
    if (!item) return;
    if (typeof item === 'string') {
      const url = normalizeSpaces(item);
      if (!url) return;
      items.push({ title: '', url });
      return;
    }
    if (typeof item === 'object') {
      const rawUrl = (item as any).url ?? (item as any).videoUrl ?? (item as any).src;
      const url = rawUrl ? normalizeSpaces(String(rawUrl)) : '';
      if (!url) return;
      const title = normalizeSpaces(String((item as any).title ?? (item as any).label ?? ''));
      const deck = (item as any).deckUrl ?? (item as any).deck_url;
      const audio = (item as any).audioUrl ?? (item as any).audio_url;
      items.push({
        title,
        url,
        ...(deck ? { deckUrl: normalizeSpaces(String(deck)) } : {}),
        ...(audio ? { audioUrl: normalizeSpaces(String(audio)) } : {}),
      });
    }
  });
  return items;
}

const ARRAY_KEY_FACTORIES: Record<ArrayField, KeyFn> = {
  concepts: conceptKey,
  authors: authorKey,
  core_literature: linkKey,
  extra_literature: linkKey,
  extra_videos: linkKey,
  video_playlist: videoKey,
  leisure: leisureKey,
};

function diffArray(field: ArrayField, expected: unknown, actual: unknown) {
  const normalize = ARRAY_NORMALIZERS[field];
  const keyFn = ARRAY_KEY_FACTORIES[field];
  const expectedArr = normalize(expected);
  const actualArr = normalize(actual);

  const expectedMap = new Map<string, any>();
  expectedArr.forEach((item) => expectedMap.set(keyFn(item), item));

  const actualMap = new Map<string, any>();
  actualArr.forEach((item) => actualMap.set(keyFn(item), item));

  const missing: any[] = [];
  const extra: any[] = [];

  expectedMap.forEach((value, key) => {
    if (!actualMap.has(key)) missing.push(value);
  });

  actualMap.forEach((value, key) => {
    if (!expectedMap.has(key)) extra.push(value);
  });

  return { missing, extra };
}

function normalizeExpected(expected: ExpectedBundle) {
  const intro = expected.intro?.period === 'intro' ? expected.intro : expected.periods.find((p) => p.period === 'intro');
  const periods = expected.periods.filter((p) => p.period !== 'intro');
  return { intro, periods };
}

function toSummary(diff: { scalars: Record<string, any>; arrays: Record<string, { missing: any[]; extra: any[] }>; missingDocument?: boolean }): PeriodDiffSummary {
  const scalarsMismatched = diff.missingDocument ? ['document'] : Object.keys(diff.scalars);
  const missingInFirestore: Record<string, number> = {};
  const extraInFirestore: Record<string, number> = {};
  Object.entries(diff.arrays).forEach(([field, arr]) => {
    if (arr.missing.length) missingInFirestore[field] = arr.missing.length;
    if (arr.extra.length) extraInFirestore[field] = arr.extra.length;
  });
  return { scalarsMismatched, missingInFirestore, extraInFirestore, missingDocument: diff.missingDocument };
}

export function buildVerifyResult(expectedBundle: ExpectedBundle, actual: { periods: Record<string, PeriodDoc>; intro?: PeriodDoc }): VerifyResult {
  const expected = normalizeExpected(expectedBundle);
  const reportLines: string[] = [];
  const diffJson: VerifyResult['diffJson'] = { perPeriod: {}, extraDocuments: [] };
  const summaryPerPeriod: Record<string, PeriodDiffSummary> = {};

  const actualMap = new Map(Object.entries(actual.periods || {}));

  reportLines.push('# Content Verification Report');
  reportLines.push('');

  function comparePeriod(expectedPeriod: PeriodDoc, actualPeriod: PeriodDoc | undefined) {
    const diff = {
      missingDocument: false,
      scalars: {} as Record<string, { expected: any; actual: any }>,
      arrays: {} as Record<string, { missing: any[]; extra: any[] }>,
    };

    if (!actualPeriod) {
      diff.missingDocument = true;
      SCALAR_FIELDS.forEach((field) => {
        const expectedValue = (expectedPeriod as any)[field];
        if (expectedValue !== undefined && expectedValue !== null) {
          diff.scalars[field] = { expected: expectedValue, actual: null };
        }
      });
      ARRAY_FIELD_LIST.forEach((field) => {
        const expectedArr = (expectedPeriod as any)[field];
        if (Array.isArray(expectedArr) && expectedArr.length) {
          diff.arrays[field] = { missing: expectedArr, extra: [] };
        }
      });
    } else {
      SCALAR_FIELDS.forEach((field) => {
        const expectedValue = (expectedPeriod as any)[field];
        if (expectedValue === undefined || expectedValue === null) return;
        const actualValue = (actualPeriod as any)[field];
        if (!normalizeScalar(expectedValue, actualValue)) {
          diff.scalars[field] = { expected: expectedValue, actual: actualValue ?? null };
        }
      });

      ARRAY_FIELD_LIST.forEach((field) => {
        const expectedValue = (expectedPeriod as any)[field];
        const actualValue = (actualPeriod as any)[field];
        const expectedLength = Array.isArray(expectedValue) ? expectedValue.length : 0;
        const { missing, extra } = diffArray(field, expectedValue, actualValue);
        if (missing.length || extra.length) {
          if (expectedLength === 0 && missing.length === 0 && extra.length === 0) return;
          diff.arrays[field] = { missing, extra };
        }
      });
    }

    diffJson.perPeriod[expectedPeriod.period] = diff;
    summaryPerPeriod[expectedPeriod.period] = toSummary(diff);

    reportLines.push(`## ${expectedPeriod.period} — ${expectedPeriod.title ?? ''}`.trim());
    if (diff.missingDocument) {
      reportLines.push('- Document: ❌ missing');
    }
    reportLines.push('- Scalars:');
    SCALAR_FIELDS.forEach((field) => {
      const entry = diff.scalars[field];
      if (!entry) {
        reportLines.push(`  - ${field}: ✅`);
      } else {
        reportLines.push(`  - ${field}: ❌ expected ${JSON.stringify(entry.expected)}, actual ${JSON.stringify(entry.actual)}`);
      }
    });

    reportLines.push('- Arrays:');
    ARRAY_FIELD_LIST.forEach((field) => {
      const entry = diff.arrays[field];
      if (!entry) {
        reportLines.push(`  - ${field}: ✅`);
      } else {
        const missing = entry.missing.length ? `+${entry.missing.length} missing` : '0 missing';
        const extra = entry.extra.length ? `+${entry.extra.length} extra` : '0 extra';
        reportLines.push(`  - ${field}: ${missing}, ${extra}`);
      }
    });

    const hasMissing = Object.values(diff.arrays).some((a) => a.missing.length);
    if (hasMissing) {
      reportLines.push('');
      reportLines.push('### Missing (to add)');
      ARRAY_FIELD_LIST.forEach((field) => {
        const entry = diff.arrays[field];
        if (entry?.missing.length) {
          reportLines.push(`- ${field}:`);
          entry.missing.forEach((item) => reportLines.push(`  - ${JSON.stringify(item)}`));
        }
      });
    }

    const hasExtra = Object.values(diff.arrays).some((a) => a.extra.length);
    if (hasExtra) {
      reportLines.push('');
      reportLines.push('### Extra (only in Firestore)');
      ARRAY_FIELD_LIST.forEach((field) => {
        const entry = diff.arrays[field];
        if (entry?.extra.length) {
          reportLines.push(`- ${field}:`);
          entry.extra.forEach((item) => reportLines.push(`  - ${JSON.stringify(item)}`));
        }
      });
    }

    reportLines.push('');
  }

  expected.periods.forEach((expectedPeriod) => {
    const actualPeriod = actualMap.get(expectedPeriod.period);
    comparePeriod(expectedPeriod, actualPeriod);
    actualMap.delete(expectedPeriod.period);
  });

  if (expected.intro) {
    const actualIntro = actual.intro;
    comparePeriod(expected.intro, actualIntro);
  }

  const extraDocs = Array.from(actualMap.keys());
  if (extraDocs.length) {
    diffJson.extraDocuments = extraDocs;
    reportLines.push('## Extra documents in Firestore');
    extraDocs.forEach((docId) => {
      reportLines.push(`- periods/${docId}`);
    });
    reportLines.push('');
  }

  reportLines.unshift(`- Extra Firestore documents: ${extraDocs.length}`);
  reportLines.unshift(`- Periods with differences: ${Object.values(summaryPerPeriod).filter((s) => s.scalarsMismatched.length || Object.keys(s.missingInFirestore).length || Object.keys(s.extraInFirestore).length || s.missingDocument).length}`);
  reportLines.unshift(`- Expected periods: ${expected.periods.length + (expected.intro ? 1 : 0)}`);
  reportLines.unshift('## Summary');
  reportLines.unshift('');

  reportLines.unshift(`# Content Verification Report`);

  return {
    reportMd: reportLines.join('\n'),
    diffJson,
    summaryPerPeriod,
  };
}

export async function loadActualBundle(db: Firestore) {
  const periodsSnap = await db.collection('periods').get();
  const periods: Record<string, PeriodDoc> = {};
  periodsSnap.forEach((doc) => {
    periods[doc.id] = { period: doc.id, ...(doc.data() as Omit<PeriodDoc, 'period'>) };
  });

  const introSnap = await db.collection('intro').doc('singleton').get();
  const intro = introSnap.exists
    ? ({ period: 'intro', ...(introSnap.data() as Omit<PeriodDoc, 'period'>) })
    : undefined;

  return { periods, intro };
}

export function expectedFromTransformedJson(raw: PeriodDoc[]): ExpectedBundle {
  const intro = raw.find((p) => p.period === 'intro');
  const periods = raw.filter((p) => p.period !== 'intro');
  return { intro, periods };
}
