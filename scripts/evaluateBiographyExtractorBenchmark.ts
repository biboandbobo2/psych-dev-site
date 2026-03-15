import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { fetchWikipediaPlainExtract } from '../server/api/timelineBiography.js';
import {
  biographyExtractorBenchmarks,
  type BiographyExtractorBenchmarkFact,
  type BiographyExtractorBenchmarkMatcher,
} from './lib/biographyExtractorBenchmarks.js';

type CliOptions = {
  benchmarkId: string;
  outputPath: string | null;
  responseJsonPath: string | null;
  sourceUrl: string | null;
};

type ExtractorResponseLike = {
  facts?: Array<{
    age?: number;
    ageLabel?: string;
    details?: string;
    evidence?: string;
    labelHint?: string;
    people?: string[];
    relationRoles?: string[];
    section?: string;
    themes?: string[];
    year?: number;
  }>;
  meta?: Record<string, unknown>;
  sourceUrl?: string;
  subjectName?: string | null;
};

function parseArgs(argv: string[]): CliOptions {
  let benchmarkId = 'gandhi';
  let sourceUrl: string | null = null;
  let responseJsonPath: string | null = null;
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

    if (arg.startsWith('--out=')) {
      outputPath = path.resolve(process.cwd(), arg.slice('--out='.length).trim());
    }
  });

  return {
    benchmarkId,
    outputPath,
    responseJsonPath,
    sourceUrl,
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

function matchesText(text: string, matcher: BiographyExtractorBenchmarkMatcher | undefined) {
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

function buildExtractorFactTexts(payload: ExtractorResponseLike | null) {
  if (!payload?.facts?.length) return [];

  return payload.facts.map((fact) => {
    const parts = [
      typeof fact.labelHint === 'string' ? fact.labelHint : '',
      typeof fact.evidence === 'string' ? fact.evidence : '',
      typeof fact.details === 'string' ? fact.details : '',
      typeof fact.section === 'string' ? fact.section : '',
      Array.isArray(fact.people) ? fact.people.join(' ') : '',
      Array.isArray(fact.relationRoles) ? fact.relationRoles.join(' ') : '',
      Array.isArray(fact.themes) ? fact.themes.join(' ') : '',
      typeof fact.ageLabel === 'string' ? fact.ageLabel : '',
    ]
      .filter(Boolean)
      .join(' ');

    return {
      age: typeof fact.age === 'number' ? fact.age : null,
      text: parts,
      year: typeof fact.year === 'number' ? fact.year : null,
    };
  });
}

function evaluateFactAgainstExtractor(fact: BiographyExtractorBenchmarkFact, payload: ExtractorResponseLike | null) {
  const extractedFacts = buildExtractorFactTexts(payload);
  const matchedFact = extractedFacts.find((entry) => matchesText(entry.text, fact.extractor));

  return {
    matched: Boolean(matchedFact),
    matchedAge: matchedFact?.age ?? null,
    matchedYear: matchedFact?.year ?? null,
    matchedText: matchedFact?.text || '',
  };
}

async function loadExtractorResponse(options: CliOptions) {
  if (!options.responseJsonPath) return null;
  return readJsonFile<ExtractorResponseLike>(options.responseJsonPath);
}

async function maybeWriteOutput(pathValue: string | null, payload: unknown) {
  if (!pathValue) return;
  await writeFile(pathValue, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const benchmark = biographyExtractorBenchmarks[options.benchmarkId];
  if (!benchmark) {
    throw new Error(`Неизвестный extractor benchmark "${options.benchmarkId}".`);
  }

  const sourceUrl = options.sourceUrl || benchmark.sourceUrl;
  const wikiPage = await fetchWikipediaPlainExtract(sourceUrl);
  const payload = await loadExtractorResponse(options);
  const articleText = wikiPage.extract;

  const evaluatedFacts = benchmark.facts.map((fact) => {
    const articleMatched = matchesText(articleText, fact.article);
    const extractorResult = evaluateFactAgainstExtractor(fact, payload);

    return {
      ...fact,
      articleMatched,
      extractorMatched: extractorResult.matched,
      matchedAge: extractorResult.matchedAge,
      matchedYear: extractorResult.matchedYear,
      matchedText: extractorResult.matchedText,
    };
  });

  const articleCovered = evaluatedFacts.filter((fact) => fact.articleMatched);
  const extractorCovered = evaluatedFacts.filter((fact) => fact.extractorMatched);
  const criticalFacts = evaluatedFacts.filter((fact) => fact.critical);
  const criticalArticleCovered = criticalFacts.filter((fact) => fact.articleMatched);
  const criticalExtractorCovered = criticalFacts.filter((fact) => fact.extractorMatched);

  const summary = {
    benchmarkId: benchmark.id,
    subject: benchmark.subject,
    sourceUrl,
    totals: {
      facts: benchmark.facts.length,
      criticalFacts: criticalFacts.length,
      articleCovered: articleCovered.length,
      articleCoverageRate: Number((articleCovered.length / benchmark.facts.length).toFixed(3)),
      extractorCovered: extractorCovered.length,
      extractorCoverageRate: Number((extractorCovered.length / benchmark.facts.length).toFixed(3)),
      criticalArticleCovered: criticalArticleCovered.length,
      criticalExtractorCovered: criticalExtractorCovered.length,
    },
    missingFromArticle: evaluatedFacts
      .filter((fact) => !fact.articleMatched)
      .map(({ article, extractor, matchedAge, matchedText, matchedYear, ...rest }) => rest),
    missingFromExtractor: evaluatedFacts
      .filter((fact) => !fact.extractorMatched)
      .map(({ article, extractor, matchedAge, matchedText, matchedYear, ...rest }) => rest),
    coveredByExtractor: evaluatedFacts
      .filter((fact) => fact.extractorMatched)
      .map(({ article, extractor, matchedText, ...rest }) => ({
        ...rest,
        matchedText,
      })),
  };

  printSection(`Extractor Benchmark: ${benchmark.subject}`);
  printLine(`Фактов в benchmark: ${summary.totals.facts}`);
  printLine(`Критических фактов: ${summary.totals.criticalFacts}`);
  printLine(`Покрытие статьи: ${summary.totals.articleCovered}/${summary.totals.facts}`);
  printLine(`Покрытие extractor: ${summary.totals.extractorCovered}/${summary.totals.facts}`);
  printLine(`Критическое покрытие extractor: ${summary.totals.criticalExtractorCovered}/${summary.totals.criticalFacts}`);

  const topMissing = summary.missingFromExtractor.slice(0, 15);
  if (topMissing.length > 0) {
    printSection('Не извлечено');
    topMissing.forEach((fact) => {
      printLine(`- ${fact.year ?? 'unknown'}: ${fact.label}`);
    });
  }

  await maybeWriteOutput(options.outputPath, {
    summary,
    facts: evaluatedFacts,
  });
}

run().catch((error) => {
  printLine('Biography extractor benchmark failed');
  printLine(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
