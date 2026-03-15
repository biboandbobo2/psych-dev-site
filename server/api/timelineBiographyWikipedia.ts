import { MAX_WIKIPEDIA_PROMPT_EXTRACT_CHARS, WIKIPEDIA_HOST_PATTERN, type WikipediaPageExtract } from './timelineBiographyTypes.js';

type ExtractSection = {
  heading: string | null;
  content: string;
};

const NON_BIOGRAPHY_SECTION_PATTERN =
  /^(?:См\. также|Примечания|Комментарии|Литература|Ссылки|Библиография|Переводы произведений|Мировое признание(?:\.\s*Память)?|В культуре|Живопись|Кино|Значение и влияние(?: творчества)?|Писатели, мыслители и религиозные деятели о|Критика(?: .*)?|Экранизации произведений|Поп-культура|Прижизненные и посмертные издания собраний сочинений|Работы толстовцев|Тематические обзоры и мемуары|Отзывы критиков и деятелей культуры|Использованная литература и источники|Книги|Статьи|Академические исследования|Собрания сочинений|Сочинения .*|Последняя статья .*|Кинохроника и аудиозаписи|Творчество)$/iu;

const LIST_LIKE_SECTION_PATTERN =
  /^(?:Дети.*:|Children.*:|Избранные произведения|Selected works|Фильмография|Дискография)$/iu;

function normalizePromptSlice(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function isHeadingLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (trimmed.length > 90) return false;
  if (!/^[A-ZА-ЯЁ«]/u.test(trimmed)) return false;
  if (/[.!?]$/u.test(trimmed)) return false;
  return trimmed.split(/\s+/).length <= 10;
}

function splitExtractSections(extract: string) {
  const lines = extract
    .split(/\r?\n/)
    .map((line) => line.trim());
  const sections: ExtractSection[] = [];
  let currentHeading: string | null = null;
  let buffer: string[] = [];

  const pushSection = () => {
    const content = buffer.join('\n').trim();
    if (!content) {
      buffer = [];
      return;
    }
    sections.push({ heading: currentHeading, content });
    buffer = [];
  };

  for (const line of lines) {
    if (!line) {
      if (buffer.length > 0 && buffer.at(-1) !== '') {
        buffer.push('');
      }
      continue;
    }

    if (isHeadingLine(line)) {
      pushSection();
      currentHeading = line;
      continue;
    }

    buffer.push(line);
  }

  pushSection();
  return sections;
}

function shouldKeepSection(section: ExtractSection) {
  if (!section.heading) return true;
  return !NON_BIOGRAPHY_SECTION_PATTERN.test(section.heading) && !LIST_LIKE_SECTION_PATTERN.test(section.heading);
}

function buildBiographyExtract(extract: string) {
  const normalizedExtract = extract.trim();
  const sections = splitExtractSections(normalizedExtract);
  const headedSections = sections.filter((section) => Boolean(section.heading));

  if (headedSections.length < 3) {
    return normalizedExtract;
  }

  const selectedSections = sections.filter(shouldKeepSection);
  const biographyExtract = selectedSections
    .map((section) => (section.heading ? `${section.heading}\n${section.content}` : section.content))
    .join('\n\n')
    .trim();

  return biographyExtract.length >= normalizedExtract.length * 0.2 ? biographyExtract : normalizedExtract;
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

  const normalizedExtract = page.extract.trim();
  const biographyExtract = buildBiographyExtract(page.extract);

  return {
    title: page.title?.trim() || parseWikipediaSourceUrl(normalizedSourceUrl).pageTitle,
    extract: normalizedExtract,
    biographyExtract,
    promptExtract: buildPromptExtract(biographyExtract),
    canonicalUrl: page.fullurl || normalizedSourceUrl,
  };
}
