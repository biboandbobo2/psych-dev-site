import { writeFile } from 'node:fs/promises';

import { GoogleGenAI } from '@google/genai';

import {
  TIMELINE_BIOGRAPHY_API_MAX_OUTPUT_TOKENS,
  TIMELINE_BIOGRAPHY_MODELS,
  buildBiographyEvaluationMetrics,
  buildBiographyFactExtractionPrompt,
  buildHeuristicFactCandidates,
  buildTimelineDataFromBiographyPlan,
  composeBiographyPlanFromFacts,
  fetchWikipediaPlainExtract,
  hasFatalBiographyIssues,
  lintBiographyPlan,
  mergeFactCandidates,
  parseLineBasedBiographyFactCandidates,
  repairBiographyPlan,
  type BiographyFactCandidate,
  type BiographyLintIssue,
} from '../server/api/timelineBiography.js';

type CliOptions = {
  apiKey: string | null;
  heuristicsOnly: boolean;
  outputPath: string | null;
  sourceUrl: string | null;
};

function parseArgs(argv: string[]): CliOptions {
  let sourceUrl: string | null = null;
  let apiKey =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.MY_GEMINI_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    process.env.VITE_GEMINI_KEY?.trim() ||
    null;
  let outputPath: string | null = null;
  let heuristicsOnly = false;

  argv.forEach((arg) => {
    if (arg.startsWith('--source-url=')) {
      sourceUrl = arg.slice('--source-url='.length).trim() || null;
      return;
    }

    if (arg.startsWith('--api-key=')) {
      apiKey = arg.slice('--api-key='.length).trim() || null;
      return;
    }

    if (arg.startsWith('--out=')) {
      outputPath = arg.slice('--out='.length).trim() || null;
      return;
    }

    if (arg === '--heuristics-only') {
      heuristicsOnly = true;
    }
  });

  return {
    apiKey,
    heuristicsOnly,
    outputPath,
    sourceUrl,
  };
}

function printLine(value = '') {
  process.stdout.write(`${value}\n`);
}

function printSection(title: string) {
  printLine('');
  printLine(title);
}

function collectGeminiResultText(result: unknown) {
  if (result && typeof result === 'object') {
    const directText = 'text' in result && typeof result.text === 'string' ? result.text : '';
    if (directText.trim()) {
      return directText;
    }

    const candidateText =
      'candidates' in result && Array.isArray(result.candidates)
        ? result.candidates
            .flatMap((candidate) => {
              if (!candidate || typeof candidate !== 'object') return [];
              const content = 'content' in candidate ? candidate.content : null;
              if (!content || typeof content !== 'object') return [];
              const parts = 'parts' in content && Array.isArray(content.parts) ? content.parts : [];
              return parts
                .map((part) => {
                  if (!part || typeof part !== 'object') return '';
                  return 'text' in part && typeof part.text === 'string' ? part.text : '';
                })
                .filter(Boolean);
            })
            .join('\n')
        : '';

    if (candidateText.trim()) {
      return candidateText;
    }
  }

  return '';
}

async function generateModelFacts(params: {
  apiKey: string;
  articleTitle: string;
  sourceUrl: string;
  extract: string;
}) {
  const client = new GoogleGenAI({ apiKey: params.apiKey });
  let lastError: unknown = null;

  for (const model of TIMELINE_BIOGRAPHY_MODELS) {
    try {
      const result = await client.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: buildBiographyFactExtractionPrompt(params) }] }],
        config: {
          temperature: 0.1,
          maxOutputTokens: TIMELINE_BIOGRAPHY_API_MAX_OUTPUT_TOKENS,
          responseMimeType: 'text/plain',
        },
      });

      return {
        model,
        facts: parseLineBasedBiographyFactCandidates(collectGeminiResultText(result)),
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error('Gemini facts generation failed');
}

function formatThemeCoverage(facts: BiographyFactCandidate[]) {
  const counts = facts.reduce<Map<string, number>>((acc, fact) => {
    fact.themes?.forEach((theme) => {
      acc.set(theme, (acc.get(theme) || 0) + 1);
    });
    return acc;
  }, new Map());

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'))
    .map(([theme, count]) => `${theme}:${count}`)
    .join(', ');
}

function formatIssues(issues: BiographyLintIssue[]) {
  if (issues.length === 0) {
    return 'none';
  }

  return issues
    .slice(0, 10)
    .map((issue) => `${issue.severity}:${issue.code}:${issue.message}`)
    .join('\n');
}

async function maybeWriteOutput(path: string | null, payload: unknown) {
  if (!path) return;
  await writeFile(path, JSON.stringify(payload, null, 2), 'utf8');
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.sourceUrl) {
    throw new Error('Передай --source-url=https://ru.wikipedia.org/wiki/... для оценки biography import.');
  }

  const wikiPage = await fetchWikipediaPlainExtract(options.sourceUrl);
  const heuristicFacts = buildHeuristicFactCandidates(wikiPage.extract, wikiPage.title);
  let modelFacts: BiographyFactCandidate[] = [];
  let factsSource = 'heuristics-only';

  if (!options.heuristicsOnly && options.apiKey) {
    const result = await generateModelFacts({
      apiKey: options.apiKey,
      articleTitle: wikiPage.title,
      sourceUrl: wikiPage.canonicalUrl,
      extract: wikiPage.extract,
    });
    modelFacts = result.facts;
    factsSource = result.model;
  }

  const mergedFacts = mergeFactCandidates({
    modelFacts,
    heuristicFacts,
    extract: wikiPage.extract,
  });
  const composed = composeBiographyPlanFromFacts({
    facts: mergedFacts,
    articleTitle: wikiPage.title,
    extract: wikiPage.extract,
  });
  const repairedPlan = repairBiographyPlan({
    plan: composed.plan,
    facts: mergedFacts,
  });
  const lintIssues = lintBiographyPlan(repairedPlan);
  const timeline = buildTimelineDataFromBiographyPlan(repairedPlan);
  const metrics = buildBiographyEvaluationMetrics({
    facts: mergedFacts,
    plan: repairedPlan,
    timeline,
  });

  printSection('ARTICLE');
  printLine(`title: ${wikiPage.title}`);
  printLine(`url: ${wikiPage.canonicalUrl}`);
  printLine(`extractChars: ${wikiPage.extract.length}`);

  printSection('FACTS');
  printLine(`source: ${factsSource}`);
  printLine(`modelFacts: ${modelFacts.length}`);
  printLine(`heuristicFacts: ${heuristicFacts.length}`);
  printLine(`mergedFacts: ${mergedFacts.length}`);
  printLine(`approximateFacts: ${metrics.facts.approximate}`);
  printLine(`factsWithPeople: ${metrics.facts.withPeople}`);
  printLine(`factsWithThemes: ${metrics.facts.withThemes}`);
  printLine(`earlyLifeFacts: ${metrics.facts.earlyLifeFacts}`);
  printLine(`themeCoverage: ${formatThemeCoverage(mergedFacts) || 'none'}`);

  printSection('PLAN');
  printLine(`mainEvents: ${metrics.plan.mainEvents}`);
  printLine(`branches: ${metrics.plan.branches}`);
  printLine(`branchEvents: ${metrics.plan.branchEvents}`);
  printLine(`visibleEvents: ${metrics.plan.visibleEvents}`);
  printLine(`genericLabels: ${metrics.plan.genericLabels}`);
  printLine(`emptyNotes: ${metrics.plan.emptyNotes}`);
  printLine(`approximateEvents: ${metrics.plan.approximateEvents}`);
  printLine(`earlyLifeEvents: ${metrics.plan.earlyLifeEvents}`);
  printLine(`birthAnchoredBranches: ${metrics.plan.birthAnchoredBranches}`);
  printLine(`compositionFacts: ${composed.stats.facts}`);
  printLine(`compositionDiscardedFacts: ${composed.stats.discardedFacts}`);

  printSection('LINT');
  printLine(`fatal: ${hasFatalBiographyIssues(lintIssues)}`);
  printLine(formatIssues(lintIssues));

  printSection('TIMELINE');
  printLine(`nodes: ${metrics.timeline?.nodes ?? 0}`);
  printLine(`edges: ${metrics.timeline?.edges ?? 0}`);

  await maybeWriteOutput(options.outputPath, {
    article: {
      title: wikiPage.title,
      url: wikiPage.canonicalUrl,
    },
    factsSource,
    modelFacts,
    heuristicFacts,
    mergedFacts,
    plan: repairedPlan,
    compositionStats: composed.stats,
    lintIssues,
    metrics,
    timeline,
  });

  if (options.outputPath) {
    printLine(`output: ${options.outputPath}`);
  }
}

run().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
