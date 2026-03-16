import type { VercelRequest } from '@vercel/node';
import { debugError, debugLog } from '../../src/lib/debug.js';
import { getLectureGenAiClient } from './lectureApiRuntime.js';
import {
  buildBiographyFactExtractionPrompt,
  buildBiographyUrlContextEditorialFactExtractionPrompt,
  buildBiographyUrlContextFactExtractionPrompt,
  buildBiographyTimelineLinePrompt,
  buildBiographyTimelinePrompt,
  buildBiographyTimelineReviewPrompt,
  buildBiographyFactRankingPrompt,
  buildBiographyGapFillingPrompt,
  buildSimpleBiographyFactExtractionPrompt,
  buildBiographyEvaluationMetrics,
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
  type BiographyExtractionMode,
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

    const outputsText = 'outputs' in result && Array.isArray(result.outputs)
      ? result.outputs
          .map((output) => {
            if (!output || typeof output !== 'object') return '';
            const type = 'type' in output && typeof output.type === 'string' ? output.type : '';
            if (type !== 'text') return '';
            return 'text' in output && typeof output.text === 'string' ? output.text : '';
          })
          .filter(Boolean)
          .join('\n')
      : '';

    if (outputsText.trim()) {
      return outputsText;
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

  const extractionMode =
    typeof (body as BiographyImportRequest).extractionMode === 'string'
      ? (body as BiographyImportRequest).extractionMode.trim()
      : '';

  if (extractionMode && extractionMode !== 'general' && extractionMode !== 'editorial' && extractionMode !== 'two-pass') {
    throw new Error('extractionMode должен быть general, editorial или two-pass.');
  }

  return {
    sourceUrl,
    extractionMode: (extractionMode as BiographyExtractionMode) || 'general',
  };
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

  if (rawMessage.startsWith('two-pass-flash-failed:')) {
    return { statusCode: 500, message: rawMessage };
  }

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
    message: `Не удалось собрать таймлайн по биографии: ${rawMessage}`,
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

function collectUrlContextMetadata(result: unknown) {
  if (!result || typeof result !== 'object') return [];
  if ('outputs' in result && Array.isArray(result.outputs)) {
    return result.outputs
      .flatMap((output) => {
        if (!output || typeof output !== 'object') return [];
        const type = 'type' in output && typeof output.type === 'string' ? output.type : '';
        if (type !== 'url_context_result') return [];
        const toolResults = 'result' in output && Array.isArray(output.result) ? output.result : [];
        return toolResults
          .map((entry) => {
            if (!entry || typeof entry !== 'object') return null;
            const retrievedUrl = 'url' in entry && typeof entry.url === 'string' ? entry.url : '';
            const urlRetrievalStatus = 'status' in entry && typeof entry.status === 'string' ? entry.status : '';
            if (!retrievedUrl && !urlRetrievalStatus) return null;
            return {
              retrievedUrl: retrievedUrl || undefined,
              urlRetrievalStatus: urlRetrievalStatus || undefined,
            };
          })
          .filter((entry): entry is { retrievedUrl?: string; urlRetrievalStatus?: string } => Boolean(entry));
      });
  }
  if (!('candidates' in result) || !Array.isArray(result.candidates)) return [];

  return result.candidates.flatMap((candidate) => {
    if (!candidate || typeof candidate !== 'object') return [];
    const metadata = 'urlContextMetadata' in candidate ? candidate.urlContextMetadata : null;
    if (!metadata || typeof metadata !== 'object') return [];
    const urlMetadata = 'urlMetadata' in metadata && Array.isArray(metadata.urlMetadata) ? metadata.urlMetadata : [];
    return urlMetadata
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const retrievedUrl = 'retrievedUrl' in entry && typeof entry.retrievedUrl === 'string' ? entry.retrievedUrl : '';
        const urlRetrievalStatus =
          'urlRetrievalStatus' in entry && typeof entry.urlRetrievalStatus === 'string' ? entry.urlRetrievalStatus : '';
        if (!retrievedUrl && !urlRetrievalStatus) return null;
        return {
          retrievedUrl: retrievedUrl || undefined,
          urlRetrievalStatus: urlRetrievalStatus || undefined,
        };
      })
      .filter((entry): entry is { retrievedUrl?: string; urlRetrievalStatus?: string } => Boolean(entry));
  });
}

function collectGroundingSources(result: unknown) {
  if (!result || typeof result !== 'object') return [];
  if ('outputs' in result && Array.isArray(result.outputs)) {
    return result.outputs
      .flatMap((output) => {
        if (!output || typeof output !== 'object') return [];
        const type = 'type' in output && typeof output.type === 'string' ? output.type : '';
        if (type !== 'google_search_result') return [];
        const searchResults = 'result' in output && Array.isArray(output.result) ? output.result : [];
        return searchResults
          .map((entry) => {
            if (!entry || typeof entry !== 'object') return null;
            const title = 'title' in entry && typeof entry.title === 'string' ? entry.title : '';
            const uri = 'url' in entry && typeof entry.url === 'string' ? entry.url : '';
            if (!title && !uri) return null;
            return {
              title: title || undefined,
              uri: uri || undefined,
            };
          })
          .filter((entry): entry is { title?: string; uri?: string } => Boolean(entry));
      });
  }
  if (!('candidates' in result) || !Array.isArray(result.candidates)) return [];

  return result.candidates.flatMap((candidate) => {
    if (!candidate || typeof candidate !== 'object') return [];
    const metadata = 'groundingMetadata' in candidate ? candidate.groundingMetadata : null;
    if (!metadata || typeof metadata !== 'object') return [];
    const chunks = 'groundingChunks' in metadata && Array.isArray(metadata.groundingChunks) ? metadata.groundingChunks : [];
    return chunks
      .map((chunk) => {
        if (!chunk || typeof chunk !== 'object') return null;
        const web = 'web' in chunk && chunk.web && typeof chunk.web === 'object' ? chunk.web : null;
        if (!web) return null;
        const uri = 'uri' in web && typeof web.uri === 'string' ? web.uri : '';
        const title = 'title' in web && typeof web.title === 'string' ? web.title : '';
        if (!uri && !title) return null;
        return {
          title: title || undefined,
          uri: uri || undefined,
        };
      })
      .filter((entry): entry is { title?: string; uri?: string } => Boolean(entry));
  });
}

async function generateBiographyFactsFromUrlContext(
  prompt: string,
  apiKey: string,
  extractionMode: BiographyExtractionMode = 'general'
) {
  const client = getLectureGenAiClient(apiKey);
  let lastError: unknown = null;
  const extractorModels =
    extractionMode === 'editorial'
      ? ['gemini-2.5-pro', 'gemini-3-flash-preview', ...TIMELINE_BIOGRAPHY_MODELS.filter((model) => model !== 'gemini-2.5-pro')]
      : ['gemini-3-flash-preview', 'gemini-2.5-pro', ...TIMELINE_BIOGRAPHY_MODELS.filter((model) => model !== 'gemini-2.5-pro')];

  for (const model of extractorModels) {
    try {
      const result = await client.interactions.create({
        model,
        input: prompt,
        tools: [{ type: 'url_context' }],
        generation_config: {
          temperature: 0.05,
          max_output_tokens: TIMELINE_BIOGRAPHY_API_MAX_OUTPUT_TOKENS,
          thinking_level: 'high',
        },
      });

      const rawText = collectGeminiResultText(result);
      return {
        facts: parseLineBasedBiographyFactCandidates(rawText),
        model,
        rawText,
        urlContextMetadata: collectUrlContextMetadata(result),
        groundingSources: [],
        strategy: 'url-context' as const,
      };
    } catch (error) {
      debugError('[timeline-biography] url-context facts generation failed', {
        model,
        error,
      });
      lastError = error;
    }
  }

  const searchModels = ['gemini-2.5-pro', ...TIMELINE_BIOGRAPHY_MODELS.filter((model) => model !== 'gemini-2.5-pro')];

  for (const model of searchModels) {
    try {
      const result = await client.interactions.create({
        model,
        input: prompt,
        tools: [{ type: 'google_search' }],
        generation_config: {
          temperature: 0.05,
          max_output_tokens: TIMELINE_BIOGRAPHY_API_MAX_OUTPUT_TOKENS,
          thinking_level: 'high',
        },
      });

      const rawText = collectGeminiResultText(result);
      return {
        facts: parseLineBasedBiographyFactCandidates(rawText),
        model,
        rawText,
        urlContextMetadata: [],
        groundingSources: collectGroundingSources(result),
        strategy: 'google-search-grounding' as const,
      };
    } catch (error) {
      debugError('[timeline-biography] google-search grounded facts generation failed', {
        model,
        error,
      });
      lastError = error;
    }
  }

  throw lastError ?? new Error('Gemini URL-context facts generation failed');
}

async function generateBiographyFactsAcrossSlices(params: {
  apiKey: string;
  articleTitle: string;
  sourceUrl: string;
  factExtractSlices: string[];
}) {
  const settled = await Promise.allSettled(
    params.factExtractSlices.map(async (extractSlice, index) => {
      const result = await generateBiographyFacts(
        buildBiographyFactExtractionPrompt({
          articleTitle: params.articleTitle,
          sourceUrl: params.sourceUrl,
          extract: extractSlice,
          focusHint:
            params.factExtractSlices.length > 1
              ? `Фрагмент ${index + 1} из ${params.factExtractSlices.length}. Вытаскивай факты именно из этого периода/секции; локальный код потом уберёт дубли между проходами.`
              : undefined,
        }),
        params.apiKey
      );
      return { ...result, sliceIndex: index };
    })
  );

  const allFacts: BiographyFactCandidate[] = [];
  const models: string[] = [];
  let lastError: unknown = null;

  settled.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      allFacts.push(...result.value.facts);
      models.push(result.value.model);
      return;
    }

    const error = result.reason;
    debugError('[timeline-biography] facts slice generation failed', {
      sliceIndex: index,
      slicesTotal: params.factExtractSlices.length,
      error,
    });
    lastError = error;
  });

  if (allFacts.length === 0) {
    throw lastError ?? new Error('Gemini facts generation failed');
  }

  const uniqueModels = [...new Set(models)];
  return {
    model: uniqueModels.join(' + '),
    facts: allFacts,
    factPasses: models.length,
  };
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

async function buildFactsFirstPlan(params: {
  apiKey: string;
  facts: BiographyFactCandidate[];
  articleTitle: string;
  sourceUrl: string;
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
  let repairedPlan = repairBiographyPlan({
    plan,
    facts: mergedFacts,
  });

  let lintIssues = lintBiographyPlan(repairedPlan);
  let evaluationMetrics = buildBiographyEvaluationMetrics({
    facts: mergedFacts,
    plan: repairedPlan,
  });
  let reviewApplied = false;
  let model = `${params.factsModel} -> local-facts-first`;

  const collectRichnessFallbackReasons = () => {
    const allEvents = [...repairedPlan.mainEvents, ...repairedPlan.branches.flatMap((branch) => branch.events)];
    const sphereCounts = allEvents.reduce<Record<string, number>>((acc, event) => {
      const sphere = event.sphere ?? 'other';
      acc[sphere] = (acc[sphere] ?? 0) + 1;
      return acc;
    }, {});
    const dominantSphereCount = Object.values(sphereCounts).reduce((max, count) => Math.max(max, count), 0);
    const dominantSphereRatio = allEvents.length > 0 ? dominantSphereCount / allEvents.length : 0;
    const reasons: string[] = [];

    if (evaluationMetrics.facts.total >= 24 && evaluationMetrics.plan.visibleEvents < 18) {
      reasons.push('Facts-first plan остался слишком редким для богатой биографии.');
    }
    if (evaluationMetrics.facts.total >= 24 && evaluationMetrics.plan.branches < 2) {
      reasons.push('Facts-first plan не выделил достаточное количество веток для насыщенной биографии.');
    }
    if (evaluationMetrics.facts.total >= 24 && dominantSphereRatio >= 0.55 && dominantSphereCount >= 6) {
      reasons.push('Facts-first plan слишком перекошен в одну сферу и теряет тематическое разнообразие.');
    }
    if (evaluationMetrics.facts.earlyLifeFacts >= 4 && evaluationMetrics.plan.earlyLifeEvents < 3) {
      reasons.push('Facts-first plan потерял слишком много ранних событий при наличии опоры в facts pool.');
    }

    return reasons;
  };

  let richnessFallbackReasons = collectRichnessFallbackReasons();
  const factsFirstReviewIssues = [
    ...new Set([
      ...lintIssues.map((issue) => issue.message),
      ...getBiographyPlanReviewIssues(repairedPlan, params.extract),
      ...richnessFallbackReasons,
    ]),
  ];

  if (mergedFacts.length >= 24 && factsFirstReviewIssues.length > 0) {
    try {
      const reviewResult = await reviewBiographyPlan(
        buildBiographyTimelineReviewPrompt({
          articleTitle: params.articleTitle,
          sourceUrl: params.sourceUrl,
          factsSummary: summarizeBiographyFacts(mergedFacts, params.articleTitle),
          draftPlanJson: JSON.stringify(repairedPlan),
          issues: factsFirstReviewIssues,
        }),
        params.apiKey
      );

      repairedPlan = repairBiographyPlan({
        plan: reviewResult.plan,
        facts: mergedFacts,
      });
      lintIssues = lintBiographyPlan(repairedPlan);
      evaluationMetrics = buildBiographyEvaluationMetrics({
        facts: mergedFacts,
        plan: repairedPlan,
      });
      richnessFallbackReasons = collectRichnessFallbackReasons();
      reviewApplied = true;
      model = `${model} -> ${reviewResult.model}`;
    } catch (error) {
      debugError('[timeline-biography] facts-first review pass failed, keeping local plan', error);
    }
  }

  if (hasFatalBiographyIssues(lintIssues) || richnessFallbackReasons.length > 0) {
    throw new Error(
      `Facts-first lint failed: ${[...lintIssues.map((issue) => issue.message), ...richnessFallbackReasons].join(' | ')}`
    );
  }

  return {
    model,
    plan: repairedPlan,
    diagnostics: buildPlanDiagnostics(
      lintIssues.length > 0 ? 'facts-first-repaired' : 'facts-first',
      repairedPlan
    ),
    reviewApplied,
    reviewIssues: [
      ...new Set([
        ...lintIssues.map((issue) => issue.message),
        ...getBiographyPlanReviewIssues(repairedPlan, params.extract),
      ]),
    ],
    mergedFacts,
    compositionStats: stats satisfies BiographyCompositionStats,
  };
}

async function buildLegacyPlan(params: {
  apiKey: string;
  wikiTitle: string;
  sourceUrl: string;
  promptExtract: string;
  extract: string;
  factsSummary: string;
}) {
  const prompt = buildBiographyTimelinePrompt({
    articleTitle: params.wikiTitle,
    sourceUrl: params.sourceUrl,
    extract: params.promptExtract,
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
        extract: params.promptExtract,
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

export type BiographyExtractorSuccessPayload = {
  ok: true;
  sourceUrl: string;
  facts: BiographyFactCandidate[];
  meta: {
    factCount: number;
    extractionMode: BiographyExtractionMode;
    model: string;
    promptVersion: string;
    rawTextChars: number;
    strategy: 'url-context' | 'google-search-grounding';
    groundingSources: Array<{
      title?: string;
      uri?: string;
    }>;
    urlContextMetadata: Array<{
      retrievedUrl?: string;
      urlRetrievalStatus?: string;
    }>;
  };
  subjectName: string | null;
};

export async function runBiographyImport(params: {
  sourceUrl: string;
  apiKey: string;
}): Promise<BiographyImportSuccessPayload> {
  const wikiPage = await fetchWikipediaPlainExtract(params.sourceUrl);
  const biographyExtract = wikiPage.biographyExtract || wikiPage.extract;
  const promptExtract = wikiPage.promptExtract || biographyExtract;
  const heuristicFacts = buildHeuristicFactCandidates(biographyExtract, wikiPage.title);
  let factsModel = 'heuristics';
  let factPasses = 0;
  let facts: BiographyFactCandidate[];
  try {
    const factsResult = await generateBiographyFactsAcrossSlices({
      apiKey: params.apiKey,
      articleTitle: wikiPage.title,
      sourceUrl: wikiPage.canonicalUrl,
      factExtractSlices: wikiPage.factExtractSlices?.length ? wikiPage.factExtractSlices : [promptExtract],
    });
    facts = factsResult.facts;
    factsModel = factsResult.model;
    factPasses = factsResult.factPasses;
  } catch {
    debugLog('[timeline-biography] facts generation failed, falling back to heuristics');
    facts = heuristicFacts;
  }

  facts = mergeFactCandidates({
    modelFacts: facts,
    heuristicFacts,
    extract: biographyExtract,
  });
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
  let factsFirstFailure: string | undefined;

  try {
    const factsFirstResult = await buildFactsFirstPlan({
      apiKey: params.apiKey,
      facts,
      articleTitle: wikiPage.title,
      sourceUrl: wikiPage.canonicalUrl,
      extract: biographyExtract,
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
    factsFirstFailure = factsFirstError instanceof Error ? factsFirstError.message : 'Facts-first pipeline failed';
    debugError('[timeline-biography] facts-first pipeline failed, falling back to legacy plan path', factsFirstError);
    const legacyResult = await buildLegacyPlan({
      apiKey: params.apiKey,
      wikiTitle: wikiPage.title,
      sourceUrl: wikiPage.canonicalUrl,
      promptExtract,
      extract: biographyExtract,
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
    factPasses: factPasses || undefined,
    factsFirstFailure,
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

async function rankBiographyFacts(params: {
  apiKey: string;
  subjectName: string;
  facts: BiographyFactCandidate[];
}): Promise<{ rankedFacts: BiographyFactCandidate[]; rankingModel: string }> {
  const indexedFacts = params.facts.map((fact, index) => ({
    index,
    year: fact.year ?? 0,
    labelHint: fact.labelHint ?? '',
    details: fact.details ?? fact.evidence ?? '',
    sphere: fact.sphere ?? 'other',
  }));

  const prompt = buildBiographyFactRankingPrompt({
    subjectName: params.subjectName,
    facts: indexedFacts,
  });

  const client = getLectureGenAiClient(params.apiKey);
  let rankingModel = 'gemini-2.5-flash';
  let rawText = '';

  const rankModels = ['gemini-2.5-flash'] as const;
  for (const model of rankModels) {
    try {
      const result = await client.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          temperature: 0.05,
          maxOutputTokens: 8192,
          responseMimeType: 'text/plain',
        },
      });
      rawText = collectGeminiResultText(result);
      rankingModel = model;
      break;
    } catch (error) {
      debugError('[timeline-biography] ranking failed', { model, error });
    }
  }

  const scores = new Map<number, number>();
  for (const line of rawText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/\t/);
    if (parts.length >= 2) {
      const index = parseInt(parts[0], 10);
      const score = parseInt(parts[1], 10);
      if (!isNaN(index) && !isNaN(score) && score >= 1 && score <= 5) {
        scores.set(index, score);
      }
    }
  }

  debugLog('[timeline-biography] ranking parsed', {
    total: params.facts.length,
    parsed: scores.size,
    missing: params.facts.length - scores.size,
  });

  const rankedFacts = params.facts.map((fact, index) => ({
    ...fact,
    rankScore: scores.get(index) ?? 2,
  }));

  rankedFacts.sort((a, b) => (b.rankScore ?? 0) - (a.rankScore ?? 0));

  return { rankedFacts, rankingModel };
}

function parseSimpleJsonFacts(rawText: string): BiographyFactCandidate[] {
  const cleaned = rawText.replace(/^```(?:json)?\s*\n?/gm, '').replace(/\n?```\s*$/gm, '').trim();
  let jsonText = cleaned.match(/\[[\s\S]*\]/)?.[0] ?? '';

  if (!jsonText) {
    const arrayStart = cleaned.indexOf('[');
    if (arrayStart >= 0) {
      let truncated = cleaned.slice(arrayStart).replace(/,\s*$/, '');
      const lastComplete = truncated.lastIndexOf('}');
      if (lastComplete > 0) {
        truncated = truncated.slice(0, lastComplete + 1) + ']';
        jsonText = truncated;
      }
    }
  }

  if (!jsonText) return [];

  try {
    const parsed = JSON.parse(jsonText) as Array<{
      year?: number | null;
      text?: string;
      category?: string;
      sphere?: string;
    }>;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => item && typeof item.text === 'string' && item.text.trim().length > 3)
      .map((item) => ({
        year: typeof item.year === 'number' ? item.year : undefined,
        age: undefined,
        sphere: (item.sphere ?? 'other') as BiographyFactCandidate['sphere'],
        category: item.category ?? 'other',
        eventType: (item.category ?? 'other') as BiographyFactCandidate['eventType'],
        labelHint: item.text?.trim() ?? '',
        details: item.text?.trim() ?? '',
        evidence: item.text?.trim() ?? '',
        importance: 'medium' as const,
        confidence: 'medium' as const,
        source: 'model' as const,
      }));
  } catch {
    return [];
  }
}

async function generateSimpleBiographyFacts(params: {
  apiKey: string;
  articleTitle: string;
  extract: string;
  focusHint?: string;
  factLimit?: number;
}): Promise<{ facts: BiographyFactCandidate[]; model: string }> {
  const prompt = buildSimpleBiographyFactExtractionPrompt({
    articleTitle: params.articleTitle,
    extract: params.extract,
    focusHint: params.focusHint,
    factLimit: params.factLimit,
  });

  const client = getLectureGenAiClient(params.apiKey);
  const flashOnlyModels = ['gemini-2.5-flash'] as const;
  let lastError: unknown = null;

  for (const model of flashOnlyModels) {
    try {
      const result = await client.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          temperature: 0.1,
          maxOutputTokens: 16384,
          responseMimeType: 'text/plain',
        },
      });

      const rawText = collectGeminiResultText(result);
      const facts = parseSimpleJsonFacts(rawText);
      if (facts.length > 0) {
        return { facts, model };
      }
      lastError = new Error(`Flash returned text (${rawText.length} chars) but 0 facts. Preview: ${rawText.slice(0, 300)}`);
    } catch (error) {
      lastError = error;
    }
  }

  const errorMessage = lastError instanceof Error ? lastError.message : 'Flash call failed';
  throw new Error(`two-pass-flash-failed: ${errorMessage}`);
}

/**
 * Split text into N roughly equal slices, breaking at paragraph boundaries.
 */
function splitTextIntoSlices(text: string, count: number): string[] {
  if (count <= 1) return [text];
  const targetSize = Math.ceil(text.length / count);
  const slices: string[] = [];
  let start = 0;

  for (let i = 0; i < count - 1; i++) {
    let end = start + targetSize;
    // Try to break at a paragraph boundary (double newline) within ±20% of target
    const searchStart = Math.max(start, end - Math.floor(targetSize * 0.2));
    const searchEnd = Math.min(text.length, end + Math.floor(targetSize * 0.2));
    const region = text.slice(searchStart, searchEnd);
    const breakIdx = region.indexOf('\n\n');
    if (breakIdx !== -1) {
      end = searchStart + breakIdx + 2;
    }
    slices.push(text.slice(start, end));
    start = end;
  }
  slices.push(text.slice(start));
  return slices;
}

/**
 * Deduplicate facts: if two facts share the same year and ≥3 overlapping keywords, keep the longer one.
 */
function deduplicateFacts(facts: BiographyFactCandidate[]): BiographyFactCandidate[] {
  const stopWords = new Set(['в', 'и', 'на', 'с', 'по', 'из', 'за', 'от', 'к', 'до', 'для', 'не', 'о', 'об', 'его', 'её', 'был', 'была', 'были', 'году', 'год', 'года', 'лет']);

  function extractKeywords(text: string): Set<string> {
    return new Set(
      text.toLowerCase().replace(/[«»"".,;:!?()—–\-]/g, ' ').split(/\s+/)
        .filter(w => w.length > 2 && !stopWords.has(w))
    );
  }

  const removed = new Set<number>();

  for (let i = 0; i < facts.length; i++) {
    if (removed.has(i)) continue;
    for (let j = i + 1; j < facts.length; j++) {
      if (removed.has(j)) continue;
      const a = facts[i];
      const b = facts[j];
      // Same year (or both undefined)
      if (a.year !== b.year) continue;
      const kwA = extractKeywords(a.details);
      const kwB = extractKeywords(b.details);
      let shared = 0;
      for (const w of kwA) {
        if (kwB.has(w)) shared++;
      }
      if (shared >= 3) {
        // Keep the longer/more detailed one
        if (a.details.length >= b.details.length) {
          removed.add(j);
        } else {
          removed.add(i);
          break;
        }
      }
    }
  }

  return facts.filter((_, idx) => !removed.has(idx));
}

async function runBiographyTwoPassExtraction(params: {
  sourceUrl: string;
  apiKey: string;
}): Promise<BiographyExtractorSuccessPayload> {
  const wikiPage = await fetchWikipediaPlainExtract(params.sourceUrl);
  const fullExtract = wikiPage.biographyExtract || wikiPage.extract;
  const len = fullExtract.length;

  // Adaptive slice count: target ≤45K chars per slice
  const sliceCount = len <= 30000 ? 1 : len <= 70000 ? 2 : len <= 130000 ? 3 : 4;
  const slices = splitTextIntoSlices(fullExtract, sliceCount);

  const subjectName = wikiPage.title;

  const settled = await Promise.allSettled(
    slices.map((slice, index) => {
      // Adaptive fact limit: longer articles use softer density to avoid oversaturation
      const charsPerFact = len > 100000 ? 1200 : 1000;
      const factLimit = Math.max(25, Math.min(60, Math.round(slice.length / charsPerFact)));

      const focusHint = slices.length > 1
        ? `Персона: ${subjectName}. Это часть ${index + 1} из ${slices.length}. Извлекай ВСЕ факты из этого фрагмента — включая мелкие семейные детали, конкретные произведения, второстепенные эпизоды, аресты, организации.`
        : `Персона: ${subjectName}. Извлекай максимум фактов — включая мелкие семейные детали, конкретные произведения, второстепенные эпизоды, аресты, организации.`;

      return generateSimpleBiographyFacts({
        apiKey: params.apiKey,
        articleTitle: subjectName,
        extract: slice,
        focusHint,
        factLimit,
      });
    })
  );

  let allFacts: BiographyFactCandidate[] = [];
  let factsModel = 'gemini-2.5-flash';

  for (const result of settled) {
    if (result.status === 'fulfilled') {
      allFacts.push(...result.value.facts);
      factsModel = result.value.model;
    }
  }

  if (allFacts.length === 0) {
    throw new Error('two-pass-flash-failed: all slices returned 0 facts');
  }

  // Deduplicate overlapping facts from different slices
  allFacts = deduplicateFacts(allFacts);

  // Gap-filling pass: ask Flash to find facts it missed
  // For long articles (>100K), run gap-filling per slice to avoid overwhelming Flash
  try {
    const existingFactTexts = allFacts.map(f => {
      const yearPrefix = f.year ? `[${f.year}] ` : '';
      return `${yearPrefix}${f.details}`;
    });

    const gapClient = getLectureGenAiClient(params.apiKey);
    const gapSlices = len > 100000 ? slices : [fullExtract];

    const gapSettled = await Promise.allSettled(
      gapSlices.map(sliceText => {
        const gapPrompt = buildBiographyGapFillingPrompt({
          articleTitle: subjectName,
          extract: sliceText,
          existingFacts: existingFactTexts,
        });
        return gapClient.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [{ text: gapPrompt }] }],
          config: {
            temperature: 0.1,
            maxOutputTokens: 16384,
            responseMimeType: 'text/plain',
          },
        });
      })
    );

    for (const gapResult of gapSettled) {
      if (gapResult.status === 'fulfilled') {
        const gapRawText = collectGeminiResultText(gapResult.value);
        const gapFacts = parseSimpleJsonFacts(gapRawText);
        if (gapFacts.length > 0) {
          allFacts.push(...gapFacts);
        }
      }
    }
    allFacts = deduplicateFacts(allFacts);
  } catch {
    // Gap-filling is best-effort; continue with what we have
  }

  const factsResult = { facts: allFacts, model: factsModel };

  const { rankedFacts, rankingModel } = await rankBiographyFacts({
    apiKey: params.apiKey,
    subjectName,
    facts: factsResult.facts,
  });

  return {
    ok: true,
    sourceUrl: params.sourceUrl,
    subjectName,
    facts: rankedFacts,
    meta: {
      factCount: rankedFacts.length,
      extractionMode: 'two-pass' as BiographyExtractionMode,
      model: `${factsResult.model} -> ${rankingModel}`,
      promptVersion: 'two-pass-v4.1',
      rawTextChars: fullExtract.length,
      strategy: 'two-pass-plaintext' as 'url-context',
      groundingSources: [],
      urlContextMetadata: [],
    },
  };
}

export async function runBiographyFactExtraction(params: {
  sourceUrl: string;
  apiKey: string;
  extractionMode?: BiographyExtractionMode;
}): Promise<BiographyExtractorSuccessPayload> {
  if (params.extractionMode === 'two-pass') {
    return runBiographyTwoPassExtraction(params);
  }

  const extractionMode = params.extractionMode === 'editorial' ? 'editorial' : 'general';
  const prompt =
    extractionMode === 'editorial'
      ? buildBiographyUrlContextEditorialFactExtractionPrompt({
          sourceUrl: params.sourceUrl,
        })
      : buildBiographyUrlContextFactExtractionPrompt({
          sourceUrl: params.sourceUrl,
        });
  const extractionResult = await generateBiographyFactsFromUrlContext(prompt, params.apiKey, extractionMode);
  const subjectLine = extractionResult.rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.startsWith('SUBJECT\t'));
  const subjectName = subjectLine?.split('\t').slice(1).join('\t').trim() || null;

  return {
    ok: true,
    sourceUrl: params.sourceUrl,
    subjectName,
    facts: extractionResult.facts,
    meta: {
      factCount: extractionResult.facts.length,
      extractionMode,
      model: extractionResult.model,
      promptVersion:
        extractionMode === 'editorial' ? 'url-context-editorial-extractor-v1' : 'url-context-extractor-v1',
      rawTextChars: extractionResult.rawText.length,
      strategy: extractionResult.strategy ?? 'url-context',
      groundingSources: extractionResult.groundingSources ?? [],
      urlContextMetadata: extractionResult.urlContextMetadata,
    },
  };
}
