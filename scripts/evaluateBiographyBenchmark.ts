import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { fetchWikipediaPlainExtract } from '../server/api/timelineBiography.js';
import { biographyBenchmarks, type BiographyBenchmarkFact, type BiographyBenchmarkMatcher } from './lib/biographyBenchmarks';

type CliOptions = {
  benchmarkId: string;
  outputPath: string | null;
  responseJsonPath: string | null;
  sourceUrl: string | null;
  timelineJsonPath: string | null;
};

type TimelineLike = {
  birthDetails?: {
    date?: string;
    notes?: string;
    place?: string;
  };
  edges?: Array<Record<string, unknown>>;
  nodes?: Array<{
    age?: number;
    label?: string;
    notes?: string;
    sphere?: string;
  }>;
};

function parseArgs(argv: string[]): CliOptions {
  let benchmarkId = 'elizabeth-ii';
  let sourceUrl: string | null = null;
  let responseJsonPath: string | null = null;
  let timelineJsonPath: string | null = null;
  let outputPath: string | null = null;

  argv.forEach((arg) => {
    if (arg.startsWith('--benchmark=')) {
      benchmarkId = arg.slice('--benchmark='.length).trim() || benchmarkId;
      return;
    }

    if (arg.startsWith('--source-url=')) {
      sourceUrl = arg.slice('--source-url='.length).trim() || null;
      return;
    }

    if (arg.startsWith('--response-json=')) {
      responseJsonPath = path.resolve(process.cwd(), arg.slice('--response-json='.length).trim());
      return;
    }

    if (arg.startsWith('--timeline-json=')) {
      timelineJsonPath = path.resolve(process.cwd(), arg.slice('--timeline-json='.length).trim());
      return;
    }

    if (arg.startsWith('--out=')) {
      outputPath = path.resolve(process.cwd(), arg.slice('--out='.length).trim());
    }
  });

  return {
    benchmarkId,
    outputPath,
    responseJsonPath,
    sourceUrl,
    timelineJsonPath,
  };
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[«»"“”„‟'`]/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function includesNormalized(haystack: string, needle: string) {
  return haystack.includes(normalizeText(needle));
}

function matchesText(text: string, matcher: BiographyBenchmarkMatcher | undefined) {
  if (!matcher) return false;
  const normalizedText = normalizeText(text);

  if (matcher.any?.some((needle) => includesNormalized(normalizedText, needle))) {
    return true;
  }

  if (matcher.all?.some((group) => group.every((needle) => includesNormalized(normalizedText, needle)))) {
    return true;
  }

  return false;
}

function printLine(value = '') {
  process.stdout.write(`${value}\n`);
}

function printSection(title: string) {
  printLine('');
  printLine(title);
}

async function readJsonFile<T>(filePath: string) {
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw) as T;
}

function buildTimelineTexts(timeline: TimelineLike) {
  const nodeTexts = (timeline.nodes || []).map((node) => {
    const parts = [
      typeof node.label === 'string' ? node.label : '',
      typeof node.notes === 'string' ? node.notes : '',
      typeof node.sphere === 'string' ? node.sphere : '',
    ]
      .filter(Boolean)
      .join(' ');

    return {
      age: typeof node.age === 'number' ? node.age : null,
      text: parts,
    };
  });

  const birthText = [
    timeline.birthDetails?.date || '',
    timeline.birthDetails?.place || '',
    timeline.birthDetails?.notes || '',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    birthText,
    nodeTexts,
  };
}

function evaluateFactAgainstTimeline(fact: BiographyBenchmarkFact, timeline: TimelineLike | null) {
  if (!timeline) {
    return {
      matched: false,
      matchedNodeAge: null as number | null,
      matchedText: '' as string,
    };
  }

  const { birthText, nodeTexts } = buildTimelineTexts(timeline);

  if (birthText && matchesText(birthText, fact.timeline)) {
    return {
      matched: true,
      matchedNodeAge: 0,
      matchedText: birthText,
    };
  }

  const matchedNode = nodeTexts.find((node) => matchesText(node.text, fact.timeline));
  return {
    matched: Boolean(matchedNode),
    matchedNodeAge: matchedNode?.age ?? null,
    matchedText: matchedNode?.text || '',
  };
}

async function loadTimeline(options: CliOptions) {
  if (options.responseJsonPath) {
    const payload = await readJsonFile<{ timeline?: TimelineLike }>(options.responseJsonPath);
    return payload.timeline || null;
  }

  if (options.timelineJsonPath) {
    return readJsonFile<TimelineLike>(options.timelineJsonPath);
  }

  return null;
}

async function maybeWriteOutput(pathValue: string | null, payload: unknown) {
  if (!pathValue) return;
  await writeFile(pathValue, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const benchmark = biographyBenchmarks[options.benchmarkId];
  if (!benchmark) {
    throw new Error(`Неизвестный benchmark "${options.benchmarkId}".`);
  }

  const sourceUrl = options.sourceUrl || benchmark.sourceUrl;
  const wikiPage = await fetchWikipediaPlainExtract(sourceUrl);
  const timeline = await loadTimeline(options);
  const articleText = wikiPage.extract;

  const evaluatedFacts = benchmark.facts.map((fact) => {
    const articleMatched = matchesText(articleText, fact.article);
    const timelineResult = evaluateFactAgainstTimeline(fact, timeline);

    return {
      ...fact,
      articleMatched,
      timelineMatched: timelineResult.matched,
      matchedNodeAge: timelineResult.matchedNodeAge,
      matchedText: timelineResult.matchedText,
    };
  });

  const articleCovered = evaluatedFacts.filter((fact) => fact.articleMatched);
  const timelineCovered = evaluatedFacts.filter((fact) => fact.timelineMatched);
  const criticalFacts = evaluatedFacts.filter((fact) => fact.critical);
  const criticalArticleCovered = criticalFacts.filter((fact) => fact.articleMatched);
  const criticalTimelineCovered = criticalFacts.filter((fact) => fact.timelineMatched);

  const summary = {
    benchmarkId: benchmark.id,
    subject: benchmark.subject,
    sourceUrl: wikiPage.canonicalUrl,
    totals: {
      facts: benchmark.facts.length,
      criticalFacts: criticalFacts.length,
      articleCovered: articleCovered.length,
      articleCoverageRate: Number((articleCovered.length / benchmark.facts.length).toFixed(3)),
      timelineCovered: timelineCovered.length,
      timelineCoverageRate: Number((timelineCovered.length / benchmark.facts.length).toFixed(3)),
      criticalArticleCovered: criticalArticleCovered.length,
      criticalTimelineCovered: criticalTimelineCovered.length,
    },
    missingFromArticle: evaluatedFacts
      .filter((fact) => !fact.articleMatched)
      .map((fact) => ({ id: fact.id, label: fact.label, year: fact.year })),
    missingFromTimeline: evaluatedFacts
      .filter((fact) => !fact.timelineMatched)
      .map((fact) => ({ id: fact.id, label: fact.label, year: fact.year, critical: fact.critical || false })),
    coveredByTimeline: evaluatedFacts
      .filter((fact) => fact.timelineMatched)
      .map((fact) => ({ id: fact.id, label: fact.label, year: fact.year, matchedNodeAge: fact.matchedNodeAge })),
    timelineShape: timeline
      ? {
          nodes: timeline.nodes?.length || 0,
          edges: timeline.edges?.length || 0,
        }
      : null,
  };

  printSection('BENCHMARK');
  printLine(`id: ${benchmark.id}`);
  printLine(`subject: ${benchmark.subject}`);
  printLine(`facts: ${benchmark.facts.length}`);
  printLine(`criticalFacts: ${criticalFacts.length}`);

  printSection('ARTICLE');
  printLine(`title: ${wikiPage.title}`);
  printLine(`url: ${wikiPage.canonicalUrl}`);
  printLine(`extractChars: ${wikiPage.extract.length}`);
  printLine(`covered: ${articleCovered.length}/${benchmark.facts.length}`);
  printLine(`criticalCovered: ${criticalArticleCovered.length}/${criticalFacts.length}`);

  if (timeline) {
    printSection('TIMELINE');
    printLine(`nodes: ${timeline.nodes?.length || 0}`);
    printLine(`edges: ${timeline.edges?.length || 0}`);
    printLine(`covered: ${timelineCovered.length}/${benchmark.facts.length}`);
    printLine(`criticalCovered: ${criticalTimelineCovered.length}/${criticalFacts.length}`);
  }

  printSection('MISSING FROM ARTICLE');
  printLine(
    summary.missingFromArticle.length > 0
      ? summary.missingFromArticle.map((fact) => `${fact.year || '????'} ${fact.label}`).join('\n')
      : 'none'
  );

  if (timeline) {
    printSection('MISSING FROM TIMELINE');
    printLine(
      summary.missingFromTimeline.length > 0
        ? summary.missingFromTimeline
            .map((fact) => `${fact.critical ? '!' : '-'} ${fact.year || '????'} ${fact.label}`)
            .join('\n')
        : 'none'
    );
  }

  await maybeWriteOutput(options.outputPath, {
    summary,
    facts: evaluatedFacts,
  });
}

run().catch((error) => {
  process.stderr.write('Biography benchmark evaluation failed\n');
  process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exit(1);
});
