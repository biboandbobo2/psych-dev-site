import type { VercelRequest } from '@vercel/node';
import { debugError, debugLog } from '../../src/lib/debug.js';
import { getLectureGenAiClient } from './lectureApiRuntime.js';
import {
  buildBiographyFactExtractionPrompt,
  buildBiographyTimelineLinePrompt,
  buildBiographyTimelinePrompt,
  buildBiographyTimelineReviewPrompt,
  buildHeuristicFactCandidates,
  composeBiographyPlanFromFacts,
  buildTimelineDataFromBiographyPlan,
  enrichBiographyPlan,
  fetchWikipediaPlainExtract,
  getBiographyPlanReviewIssues,
  hasFatalBiographyIssues,
  lintBiographyPlan,
  mergeFactCandidates,
  parseLineBasedBiographyFactCandidates,
  repairBiographyPlan,
  summarizeBiographyFacts,
  type BiographyCompositionStats,
  type BiographyFactCandidate,
  type BiographyGenerationStageDiagnostics,
  type BiographyPlanDiagnostics,
  type BiographyImportRequest,
  type BiographyTimelinePlan,
  TIMELINE_BIOGRAPHY_API_MAX_OUTPUT_TOKENS,
  TIMELINE_BIOGRAPHY_MODELS,
} from './timelineBiography.js';

function extractJsonText(rawText: string) {
  const trimmed = rawText.trim();
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  const candidate = codeBlockMatch ? codeBlockMatch[1].trim() : trimmed.replace(/```json\s*\n?|\n?```/g, '').trim();
  return candidate.startsWith('{') ? candidate : (candidate.match(/\{[\s\S]*\}/)?.[0] ?? candidate);
}

function stripJsonTrailingCommas(value: string) {
  return value.replace(/,\s*([}\]])/g, '$1');
}

function collectGeminiResultText(result: unknown) {
  if (result && typeof result === 'object') {
    const directText = 'text' in result && typeof result.text === 'string' ? result.text : '';
    if (directText.trim()) {
      return directText;
    }

    const candidateText = 'candidates' in result && Array.isArray(result.candidates)
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

function parseBiographyPlanResult(result: unknown): BiographyTimelinePlan {
  const rawText = collectGeminiResultText(result);
  const extractedJson = extractJsonText(rawText);
  const candidates = [extractedJson, stripJsonTrailingCommas(extractedJson), rawText, stripJsonTrailingCommas(rawText)]
    .map((value) => value.trim())
    .filter(Boolean);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as BiographyTimelinePlan;
    } catch {
      // try next candidate
    }
  }

  throw new Error('Gemini JSON parse failed');
}

function parseBooleanFlag(value: string | undefined) {
  return String(value || '').trim().toLowerCase() === 'true';
}

function countBranchEvents(branches: BiographyTimelinePlan['branches']) {
  return branches.reduce((total, branch) => total + branch.events.length, 0);
}

function buildPlanDiagnostics(
  source: BiographyPlanDiagnostics['source'],
  plan: BiographyTimelinePlan
): BiographyPlanDiagnostics {
  return {
    source,
    mainEvents: plan.mainEvents.length,
    branches: plan.branches.length,
    branchEvents: countBranchEvents(plan.branches),
    hasBirthDate: Boolean(plan.birthDetails?.date),
    hasBirthPlace: Boolean(plan.birthDetails?.place),
  };
}

function parseLineBasedBiographyPlan(rawText: string): BiographyTimelinePlan {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const mainEvents: BiographyTimelinePlan['mainEvents'] = [];
  const branchesByKey = new Map<string, BiographyTimelinePlan['branches'][number]>();
  let subjectName = '';
  let canvasName = '';
  let currentAge = 25;
  let selectedPeriodization: BiographyTimelinePlan['selectedPeriodization'] = null;
  let birthDetails: BiographyTimelinePlan['birthDetails'] | undefined;

  for (const line of lines) {
    const [kind, ...rest] = line.split('\t').map((part) => part.trim());

    switch (kind) {
      case 'SUBJECT':
        subjectName = rest[0] || subjectName;
        break;
      case 'CANVAS':
        canvasName = rest[0] || canvasName;
        break;
      case 'CURRENT_AGE':
        currentAge = Number(rest[0]) || currentAge;
        break;
      case 'PERIODIZATION':
        selectedPeriodization =
          rest[0] && rest[0] !== 'null' ? (rest[0] as BiographyTimelinePlan['selectedPeriodization']) : null;
        break;
      case 'BIRTH':
        birthDetails = {
          date: rest[0] || undefined,
          place: rest[1] || undefined,
          notes: rest[2] || undefined,
        };
        break;
      case 'MAIN':
        mainEvents.push({
          age: Number(rest[0]) || 0,
          label: rest[1] || '',
          sphere: (rest[2] || undefined) as BiographyTimelinePlan['mainEvents'][number]['sphere'],
          isDecision: parseBooleanFlag(rest[3]),
          iconId: (rest[4] || undefined) as BiographyTimelinePlan['mainEvents'][number]['iconId'],
          notes: rest[5] || undefined,
        });
        break;
      case 'BRANCH': {
        const branchKey = rest[0] || `branch-${branchesByKey.size + 1}`;
        branchesByKey.set(branchKey, {
          label: rest[1] || branchKey,
          sphere: (rest[2] || 'other') as BiographyTimelinePlan['branches'][number]['sphere'],
          sourceMainEventIndex: Math.max(0, Number(rest[3]) || 0),
          events: [],
        });
        break;
      }
      case 'BRANCH_EVENT': {
        const branchKey = rest[0] || '';
        const branch = branchesByKey.get(branchKey);
        if (!branch) break;
        branch.events.push({
          age: Number(rest[1]) || 0,
          label: rest[2] || '',
          sphere: (rest[3] || undefined) as BiographyTimelinePlan['branches'][number]['events'][number]['sphere'],
          isDecision: parseBooleanFlag(rest[4]),
          iconId: (rest[5] || undefined) as BiographyTimelinePlan['branches'][number]['events'][number]['iconId'],
          notes: rest[6] || undefined,
        });
        break;
      }
      default:
        break;
    }
  }

  if (!subjectName || !canvasName || mainEvents.length === 0) {
    throw new Error('Gemini line-plan parse failed');
  }

  return {
    subjectName,
    canvasName,
    currentAge,
    selectedPeriodization,
    birthDetails,
    mainEvents,
    branches: [...branchesByKey.values()],
  };
}

export function validateBiographyImportRequest(body: unknown): BiographyImportRequest {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body is required.');
  }

  const sourceUrl = typeof (body as BiographyImportRequest).sourceUrl === 'string'
    ? (body as BiographyImportRequest).sourceUrl.trim()
    : '';

  if (!sourceUrl) {
    throw new Error('Укажите ссылку на статью Wikipedia.');
  }

  return { sourceUrl };
}

export function resolveRequiredGeminiApiKey(req: VercelRequest) {
  const userKey = req.headers['x-gemini-api-key'];
  if (typeof userKey === 'string' && userKey.trim()) {
    return userKey.trim();
  }

  throw new Error('Для automation endpoint требуется заголовок X-Gemini-Api-Key.');
}

export function normalizeBiographyApiError(error: unknown) {
  const rawMessage = error instanceof Error ? error.message : 'Не удалось собрать таймлайн по биографии.';

  if (/Request body|Wikipedia|статью|ссылк/i.test(rawMessage)) {
    return { statusCode: 400, message: rawMessage };
  }

  if (/UNAUTHORIZED|авториза/i.test(rawMessage)) {
    return { statusCode: 401, message: rawMessage };
  }

  if (/X-Gemini-Api-Key/i.test(rawMessage)) {
    return { statusCode: 400, message: rawMessage };
  }

  if (/GEMINI_API_KEY not configured/i.test(rawMessage)) {
    return {
      statusCode: 503,
      message: 'Gemini API key не настроен на сервере preview. Добавьте свой ключ в профиль или настройте env для Vercel.',
    };
  }

  if (/quota|RESOURCE_EXHAUSTED|429/i.test(rawMessage)) {
    return {
      statusCode: 429,
      message: 'Gemini временно недоступен из-за лимита запросов или квоты. Попробуйте позже или используйте другой API key.',
    };
  }

  if (/PERMISSION_DENIED|API key not valid|invalid api key|forbidden/i.test(rawMessage)) {
    return {
      statusCode: 403,
      message: 'Gemini API key недействителен или не имеет доступа к этой модели.',
    };
  }

  if (/model|unsupported|not found/i.test(rawMessage)) {
    return {
      statusCode: 503,
      message: 'Gemini модель для импорта биографии сейчас недоступна. Попробуйте позже или используйте другой API key.',
    };
  }

  if (/JSON|Unexpected token|schema|parse/i.test(rawMessage)) {
    return {
      statusCode: 502,
      message: 'Gemini вернул некорректный ответ при сборке таймлайна. Попробуйте ещё раз.',
    };
  }

  return {
    statusCode: 500,
    message: 'Не удалось собрать таймлайн по биографии. Попробуйте ещё раз позже.',
  };
}

async function generateBiographyPlan(prompt: string, apiKey: string) {
  const client = getLectureGenAiClient(apiKey);
  let lastError: unknown = null;

  for (const model of TIMELINE_BIOGRAPHY_MODELS) {
    try {
      const result = await client.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          temperature: 0.2,
          maxOutputTokens: TIMELINE_BIOGRAPHY_API_MAX_OUTPUT_TOKENS,
          responseMimeType: 'application/json',
        },
      });

      return { model, plan: parseBiographyPlanResult(result) };
    } catch (error) {
      debugError('[timeline-biography] JSON plan generation failed', {
        model,
        error,
      });
      lastError = error;
    }
  }

  throw lastError ?? new Error('Gemini generation failed');
}

async function generateBiographyFacts(prompt: string, apiKey: string) {
  const client = getLectureGenAiClient(apiKey);
  let lastError: unknown = null;

  for (const model of TIMELINE_BIOGRAPHY_MODELS) {
    try {
      const result = await client.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
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
      debugError('[timeline-biography] facts generation failed', {
        model,
        error,
      });
      lastError = error;
    }
  }

  throw lastError ?? new Error('Gemini facts generation failed');
}

async function generateBiographyLinePlan(prompt: string, apiKey: string) {
  const client = getLectureGenAiClient(apiKey);
  let lastError: unknown = null;

  for (const model of TIMELINE_BIOGRAPHY_MODELS) {
    try {
      const result = await client.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          temperature: 0.1,
          maxOutputTokens: TIMELINE_BIOGRAPHY_API_MAX_OUTPUT_TOKENS,
          responseMimeType: 'text/plain',
        },
      });

      return {
        model,
        plan: parseLineBasedBiographyPlan(collectGeminiResultText(result)),
      };
    } catch (error) {
      debugError('[timeline-biography] line plan generation failed', {
        model,
        error,
      });
      lastError = error;
    }
  }

  throw lastError ?? new Error('Gemini line-plan generation failed');
}

async function reviewBiographyPlan(prompt: string, apiKey: string) {
  const client = getLectureGenAiClient(apiKey);
  let lastError: unknown = null;

  for (const model of TIMELINE_BIOGRAPHY_MODELS) {
    try {
      const result = await client.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          temperature: 0.05,
          maxOutputTokens: TIMELINE_BIOGRAPHY_API_MAX_OUTPUT_TOKENS,
          responseMimeType: 'application/json',
        },
      });

      return {
        model,
        plan: parseBiographyPlanResult(result),
      };
    } catch (error) {
      debugError('[timeline-biography] review generation failed', {
        model,
        error,
      });
      lastError = error;
    }
  }

  throw lastError ?? new Error('Gemini review generation failed');
}

function buildFactsFirstPlan(params: {
  facts: BiographyFactCandidate[];
  articleTitle: string;
  extract: string;
  factsModel: string;
}) {
  const heuristicFacts = buildHeuristicFactCandidates(params.extract, params.articleTitle);
  const mergedFacts = mergeFactCandidates({
    modelFacts: params.facts,
    heuristicFacts,
    extract: params.extract,
  });
  const { plan, stats } = composeBiographyPlanFromFacts({
    facts: mergedFacts,
    articleTitle: params.articleTitle,
    extract: params.extract,
  });
  const repairedPlan = repairBiographyPlan({
    plan,
    facts: mergedFacts,
  });
  const lintIssues = lintBiographyPlan(repairedPlan);

  if (hasFatalBiographyIssues(lintIssues)) {
    throw new Error(`Facts-first lint failed: ${lintIssues.map((issue) => issue.message).join(' | ')}`);
  }

  return {
    model: `${params.factsModel} -> local-facts-first`,
    plan: repairedPlan,
    diagnostics: buildPlanDiagnostics(
      lintIssues.length > 0 ? 'facts-first-repaired' : 'facts-first',
      repairedPlan
    ),
    reviewApplied: false,
    reviewIssues: lintIssues.map((issue) => issue.message),
    mergedFacts,
    compositionStats: stats satisfies BiographyCompositionStats,
  };
}

async function buildLegacyPlan(params: {
  apiKey: string;
  wikiTitle: string;
  sourceUrl: string;
  extract: string;
  factsSummary: string;
}) {
  const prompt = buildBiographyTimelinePrompt({
    articleTitle: params.wikiTitle,
    sourceUrl: params.sourceUrl,
    extract: params.extract,
    factsSummary: params.factsSummary,
  });

  let generationResult: { model: string; plan: BiographyTimelinePlan };
  try {
    generationResult = await generateBiographyPlan(prompt, params.apiKey);
  } catch {
    debugLog('[timeline-biography] JSON plan failed, trying line-based fallback');
    generationResult = await generateBiographyLinePlan(
      buildBiographyTimelineLinePrompt({
        articleTitle: params.wikiTitle,
        sourceUrl: params.sourceUrl,
        extract: params.extract,
        factsSummary: params.factsSummary,
      }),
      params.apiKey
    );
  }

  let { model, plan } = generationResult;
  const reviewIssues = getBiographyPlanReviewIssues(plan, params.extract);
  let reviewApplied = false;

  if (reviewIssues.length > 0) {
    debugLog('[timeline-biography] review issues detected', { model, reviewIssues });
    try {
      const reviewResult = await reviewBiographyPlan(
        buildBiographyTimelineReviewPrompt({
          articleTitle: params.wikiTitle,
          sourceUrl: params.sourceUrl,
          factsSummary: params.factsSummary,
          draftPlanJson: JSON.stringify(plan, null, 2),
          issues: reviewIssues,
        }),
        params.apiKey
      );
      plan = reviewResult.plan;
      model = `${model} -> ${reviewResult.model}`;
      reviewApplied = true;
    } catch {
      debugError('[timeline-biography] review pass failed, keeping draft plan');
    }
  }

  const {
    plan: normalizedPlan,
    diagnostics,
  }: { plan: BiographyTimelinePlan; diagnostics: BiographyPlanDiagnostics } = enrichBiographyPlan({
    plan,
    articleTitle: params.wikiTitle,
    extract: params.extract,
  });

  return {
    model,
    plan: normalizedPlan,
    diagnostics,
    reviewApplied,
    reviewIssues,
  };
}

export type BiographyImportSuccessPayload = {
  ok: true;
  canvasName: string;
  subjectName: string;
  timeline: ReturnType<typeof buildTimelineDataFromBiographyPlan>;
  meta: {
    model: string;
    factsModel: string;
    sourceTitle: string;
    sourceUrl: string;
    extractChars: number;
    planDiagnostics: BiographyPlanDiagnostics;
    stageDiagnostics: BiographyGenerationStageDiagnostics;
    compositionStats: BiographyCompositionStats | null;
    timelineStats: {
      nodes: number;
      edges: number;
      hasBirthDate: boolean;
      hasBirthPlace: boolean;
    };
  };
};

export async function runBiographyImport(params: {
  sourceUrl: string;
  apiKey: string;
}): Promise<BiographyImportSuccessPayload> {
  const wikiPage = await fetchWikipediaPlainExtract(params.sourceUrl);
  let factsModel = 'heuristics';
  let facts: BiographyFactCandidate[];
  try {
    const factsResult = await generateBiographyFacts(
      buildBiographyFactExtractionPrompt({
        articleTitle: wikiPage.title,
        sourceUrl: wikiPage.canonicalUrl,
        extract: wikiPage.extract,
      }),
      params.apiKey
    );
    facts = factsResult.facts;
    factsModel = factsResult.model;
  } catch {
    debugLog('[timeline-biography] facts generation failed, falling back to heuristics');
    facts = buildHeuristicFactCandidates(wikiPage.extract, wikiPage.title);
  }

  const factsSummary = summarizeBiographyFacts(facts, wikiPage.title);
  debugLog('[timeline-biography] facts ready', {
    factsModel,
    factsCount: facts.length,
    sourceTitle: wikiPage.title,
  });

  let model = `${factsModel} -> local-facts-first`;
  let normalizedPlan: BiographyTimelinePlan;
  let diagnostics: BiographyPlanDiagnostics;
  let reviewApplied = false;
  let reviewIssues: string[] = [];
  let compositionStats: BiographyCompositionStats | null = null;

  try {
    const factsFirstResult = buildFactsFirstPlan({
      facts,
      articleTitle: wikiPage.title,
      extract: wikiPage.extract,
      factsModel,
    });
    model = factsFirstResult.model;
    normalizedPlan = factsFirstResult.plan;
    diagnostics = factsFirstResult.diagnostics;
    reviewApplied = factsFirstResult.reviewApplied;
    reviewIssues = factsFirstResult.reviewIssues;
    compositionStats = factsFirstResult.compositionStats;
    facts = factsFirstResult.mergedFacts;
  } catch (factsFirstError) {
    debugError('[timeline-biography] facts-first pipeline failed, falling back to legacy plan path', factsFirstError);
    const legacyResult = await buildLegacyPlan({
      apiKey: params.apiKey,
      wikiTitle: wikiPage.title,
      sourceUrl: wikiPage.canonicalUrl,
      extract: wikiPage.extract,
      factsSummary,
    });
    model = legacyResult.model;
    normalizedPlan = legacyResult.plan;
    diagnostics = legacyResult.diagnostics;
    reviewApplied = legacyResult.reviewApplied;
    reviewIssues = legacyResult.reviewIssues;
  }

  normalizedPlan = repairBiographyPlan({
    plan: normalizedPlan,
    facts,
  });
  diagnostics = buildPlanDiagnostics(diagnostics.source, normalizedPlan);
  reviewIssues = [
    ...new Set([
      ...reviewIssues,
      ...lintBiographyPlan(normalizedPlan).map((issue) => issue.message),
    ]),
  ];

  debugLog('[timeline-biography] plan normalized', {
    source: diagnostics.source,
    mainEvents: diagnostics.mainEvents,
    branches: diagnostics.branches,
    model,
  });
  const timeline = buildTimelineDataFromBiographyPlan(normalizedPlan);

  if (timeline.nodes.length === 0) {
    throw new Error('Biography timeline normalization produced no events');
  }

  const stageDiagnostics: BiographyGenerationStageDiagnostics = {
    facts: facts.length,
    reviewApplied,
    reviewIssues,
  };

  return {
    ok: true,
    canvasName: normalizedPlan.canvasName || normalizedPlan.subjectName || wikiPage.title,
    subjectName: normalizedPlan.subjectName || wikiPage.title,
    timeline,
    meta: {
      model,
      factsModel,
      sourceTitle: wikiPage.title,
      sourceUrl: wikiPage.canonicalUrl,
      extractChars: wikiPage.extract.length,
      planDiagnostics: diagnostics,
      stageDiagnostics,
      compositionStats,
      timelineStats: {
        nodes: timeline.nodes.length,
        edges: timeline.edges.length,
        hasBirthDate: Boolean(timeline.birthDetails?.date),
        hasBirthPlace: Boolean(timeline.birthDetails?.place),
      },
    },
  };
}
