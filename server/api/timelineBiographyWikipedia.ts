import { MAX_WIKIPEDIA_PROMPT_EXTRACT_CHARS, WIKIPEDIA_HOST_PATTERN, type WikipediaPageExtract } from './timelineBiographyTypes.js';

function normalizePromptSlice(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function clampWindowStart(centerStart: number, sliceLength: number, sourceLength: number) {
  if (sourceLength <= sliceLength) return 0;
  return Math.max(0, Math.min(centerStart, sourceLength - sliceLength));
}

function trimSliceToSentenceBoundaries(source: string, start: number, end: number) {
  let safeStart = Math.max(0, start);
  let safeEnd = Math.min(source.length, end);

  if (safeStart > 0) {
    const previousBreak = source.lastIndexOf('.', safeStart);
    const previousQuestion = source.lastIndexOf('?', safeStart);
    const previousExclamation = source.lastIndexOf('!', safeStart);
    const previousNewline = source.lastIndexOf('\n', safeStart);
    const boundary = Math.max(previousBreak, previousQuestion, previousExclamation, previousNewline);
    if (boundary >= 0 && safeStart - boundary < 240) {
      safeStart = boundary + 1;
    }
  }

  if (safeEnd < source.length) {
    const nextCandidates = [
      source.indexOf('.', safeEnd),
      source.indexOf('?', safeEnd),
      source.indexOf('!', safeEnd),
      source.indexOf('\n', safeEnd),
    ].filter((value) => value >= 0);
    const boundary = nextCandidates.length > 0 ? Math.min(...nextCandidates) : -1;
    if (boundary >= 0 && boundary - safeEnd < 240) {
      safeEnd = boundary + 1;
    }
  }

  return normalizePromptSlice(source.slice(safeStart, safeEnd));
}

function buildPromptExtract(extract: string) {
  const normalizedExtract = extract.trim();
  if (normalizedExtract.length <= MAX_WIKIPEDIA_PROMPT_EXTRACT_CHARS) {
    return normalizedExtract;
  }

  const separator = '\n\n[...]\n\n';
  const totalBudget = MAX_WIKIPEDIA_PROMPT_EXTRACT_CHARS - separator.length * 2;
  const edgeBudget = Math.floor(totalBudget * 0.42);
  const middleBudget = totalBudget - edgeBudget * 2;
  const middleStart = clampWindowStart(
    Math.floor(normalizedExtract.length / 2) - Math.floor(middleBudget / 2),
    middleBudget,
    normalizedExtract.length
  );

  const head = trimSliceToSentenceBoundaries(normalizedExtract, 0, edgeBudget);
  const middle = trimSliceToSentenceBoundaries(normalizedExtract, middleStart, middleStart + middleBudget);
  const tail = trimSliceToSentenceBoundaries(normalizedExtract, normalizedExtract.length - edgeBudget, normalizedExtract.length);

  return [head, middle, tail]
    .filter(Boolean)
    .join(separator)
    .slice(0, MAX_WIKIPEDIA_PROMPT_EXTRACT_CHARS)
    .trim();
}

export function parseWikipediaSourceUrl(sourceUrl: string) {
  let parsed: URL;

  try {
    parsed = new URL(sourceUrl);
  } catch {
    throw new Error('Укажите корректную ссылку на статью Wikipedia.');
  }

  if (!WIKIPEDIA_HOST_PATTERN.test(parsed.hostname)) {
    throw new Error('Пока поддерживаются только ссылки Wikipedia.');
  }

  if (!parsed.pathname.startsWith('/wiki/')) {
    throw new Error('Нужна прямая ссылка на статью Wikipedia вида /wiki/... .');
  }

  const rawTitle = parsed.pathname.replace(/^\/wiki\//, '').trim();
  if (!rawTitle) {
    throw new Error('Не удалось определить название статьи Wikipedia.');
  }

  const pageTitle = decodeURIComponent(rawTitle).replace(/_/g, ' ');
  return {
    sourceUrl: parsed.toString(),
    apiOrigin: `${parsed.protocol}//${parsed.hostname}`,
    pageTitle,
    encodedTitle: encodeURIComponent(pageTitle),
  };
}

export function buildWikipediaExtractUrl(sourceUrl: string) {
  const parsed = parseWikipediaSourceUrl(sourceUrl);
  return {
    pageTitle: parsed.pageTitle,
    sourceUrl: parsed.sourceUrl,
    url:
      `${parsed.apiOrigin}/w/api.php?action=query&prop=extracts|info&inprop=url` +
      `&titles=${parsed.encodedTitle}&explaintext=1&exsectionformat=plain&redirects=1&format=json&formatversion=2`,
  };
}

export async function fetchWikipediaPlainExtract(sourceUrl: string): Promise<WikipediaPageExtract> {
  const { url, sourceUrl: normalizedSourceUrl } = buildWikipediaExtractUrl(sourceUrl);
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'psych-dev-site timeline biography importer',
    },
  });

  if (!response.ok) {
    throw new Error('Не удалось загрузить статью с Wikipedia.');
  }

  const payload = (await response.json()) as {
    query?: {
      pages?: Array<{
        title?: string;
        extract?: string;
        fullurl?: string;
        missing?: boolean;
      }>;
    };
  };

  const page = payload.query?.pages?.[0];
  if (!page || page.missing || !page.extract?.trim()) {
    throw new Error('Wikipedia не вернула текст статьи. Проверьте ссылку.');
  }

  return {
    title: page.title?.trim() || parseWikipediaSourceUrl(normalizedSourceUrl).pageTitle,
    extract: page.extract.trim(),
    promptExtract: buildPromptExtract(page.extract),
    canonicalUrl: page.fullurl || normalizedSourceUrl,
  };
}
