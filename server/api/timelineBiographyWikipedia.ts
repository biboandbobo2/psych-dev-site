import { MAX_WIKIPEDIA_EXTRACT_CHARS, WIKIPEDIA_HOST_PATTERN, type WikipediaPageExtract } from './timelineBiographyTypes';

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
    extract: page.extract.trim().slice(0, MAX_WIKIPEDIA_EXTRACT_CHARS),
    canonicalUrl: page.fullurl || normalizedSourceUrl,
  };
}
