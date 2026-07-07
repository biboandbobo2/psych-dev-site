/**
 * Cloud Function: biographyImport
 * Full biography pipeline in a single call with parallel slice extraction.
 * Replaces the multi-step Vercel endpoint that couldn't fit within 60s timeout.
 *
 * Steps:
 * 1. Fetch Wikipedia article
 * 2. Extract facts (slices in parallel via Promise.allSettled)
 * 3. Gap-filling
 * 4. Annotation + redaktura
 * 5. Composition + render → final timeline
 */

import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps } from 'firebase-admin/app';

import { logger } from 'firebase-functions/v2';

// Import biography submodules (included via tsconfig)
import {
  WIKIPEDIA_HOST_PATTERN,
  type BiographyFactCandidate,
  type BiographyExtractionMode,
  type BiographyTimelineData,
  type BiographyCompositionResult,
  type BiographyEventTheme,
} from '../../server/api/timelineBiographyTypes.js';
import { fetchWikipediaPlainExtract } from '../../server/api/timelineBiographyWikipedia.js';
import {
  buildSimpleBiographyFactExtractionPrompt,
  buildBiographyGapFillingPrompt,
  buildBiographyAnnotationPrompt,
  buildBiographyRedakturaPrompt,
  buildBiographyCompositionPrompt,
} from '../../server/api/timelineBiographyPrompts.js';
import {
  buildPlanFromCompositionResult,
  findDeathFact,
  resolveCompositionLifespan,
} from '../../server/api/timelineBiographyComposer.js';
import { buildTimelineDataFromBiographyPlan } from '../../server/api/timelineBiographyQuality.js';
import { buildBiographyEvaluationMetrics } from '../../server/api/timelineBiographyMetrics.js';
import { cleanGenericEventLabels } from '../../server/api/timelineBiographyLint.js';
import {
  callGeminiWithRetry,
  collectGeminiResultText,
  extractGeminiTokens,
  getGenAiClient,
  recordBiographyByokUsage,
} from './biography/helpers.js';
import {
  deduplicateFacts,
  parseAnnotationResponse,
  parseRedakturaResponse,
  parseSimpleJsonFacts,
  type AnnotationEntry,
} from './biography/parsers.js';

// ============================================================================
// INIT
// ============================================================================

if (getApps().length === 0) {
  initializeApp();
}

// Facts contain optional fields (age, month, etc.) that may be undefined.
// Firestore rejects undefined values by default.
getFirestore().settings({ ignoreUndefinedProperties: true });

const JOBS_COLLECTION = 'biographyJobs';

// ============================================================================
// Validation
// ============================================================================

function validateSourceUrl(body: Record<string, unknown>): string {
  const sourceUrl = typeof body.sourceUrl === 'string' ? body.sourceUrl.trim() : '';
  if (!sourceUrl) {
    throw Object.assign(new Error('Укажите ссылку на статью Wikipedia.'), { statusCode: 400 });
  }
  try {
    const hostname = new URL(sourceUrl).hostname;
    if (!WIKIPEDIA_HOST_PATTERN.test(hostname)) {
      throw Object.assign(new Error('Ссылка должна вести на Wikipedia.'), { statusCode: 400 });
    }
  } catch (e) {
    if ((e as { statusCode?: number }).statusCode) throw e;
    throw Object.assign(new Error('Некорректный URL.'), { statusCode: 400 });
  }
  return sourceUrl;
}

function normalizeError(error: unknown) {
  const rawMessage = error instanceof Error ? error.message : String(error);
  const statusCode = (error as { statusCode?: number }).statusCode;
  if (statusCode) return { statusCode, message: rawMessage };

  if (/quota|RESOURCE_EXHAUSTED|429/i.test(rawMessage)) return { statusCode: 429, message: 'Gemini временно недоступен из-за лимита запросов. Попробуйте позже.' };
  if (/PERMISSION_DENIED|API key not valid|invalid api key|forbidden/i.test(rawMessage)) return { statusCode: 403, message: 'Gemini API key недействителен.' };
  if (/JSON|Unexpected token|parse/i.test(rawMessage)) return { statusCode: 502, message: 'Gemini вернул некорректный ответ. Попробуйте ещё раз.' };
  return { statusCode: 500, message: `Не удалось собрать таймлайн: ${rawMessage}` };
}

// ============================================================================
// Auth (verify Firebase Auth token from Authorization header)
// ============================================================================

async function verifyAuth(req: { headers: Record<string, string | string[] | undefined> }): Promise<{ uid: string; email: string }> {
  const authHeader = req.headers['authorization'] ?? req.headers['Authorization'] ?? '';
  const token = typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '') : '';
  if (!token) {
    throw Object.assign(new Error('Authorization header required'), { statusCode: 401 });
  }
  const decoded = await getAuth().verifyIdToken(token);
  let email = decoded.email ?? '';
  if (!email) {
    try {
      const userRecord = await getAuth().getUser(decoded.uid);
      email = userRecord.email ?? '';
    } catch { /* optional */ }
  }
  return { uid: decoded.uid, email };
}

// ============================================================================
// MAIN PIPELINE
// ============================================================================

async function runFullBiographyPipeline(params: {
  sourceUrl: string;
  apiKey: string;
  uid: string;
  userEmail: string;
  canvasId: string;
  jobId?: string;
  /** True если использован user's BYOK ключ (а не server fallback) — учитывать токены в /profile. */
  isBYOK: boolean;
}): Promise<{
  jobId: string;
  subjectName: string;
  canvasName: string;
  timeline?: BiographyTimelineData;
  composition?: BiographyCompositionResult;
  meta: {
    factCount: number;
    model: string;
    rawTextChars: number;
    planDiagnostics?: {
      source: string;
      mainEvents: number;
      branches: number;
      branchEvents: number;
      hasBirthDate: boolean;
      hasBirthPlace: boolean;
    };
    timelineStats?: {
      nodes: number;
      edges: number;
      hasBirthDate: boolean;
      hasBirthPlace: boolean;
    };
    /** Lightweight quality summary for fast UI/log diagnostics without running timeline:eval CLI. */
    qualityMetrics?: {
      factsTotal: number;
      factsWithThemes: number;
      themesCovered: number;
      mainEvents: number;
      branches: number;
      branchEvents: number;
      genericLabels: number;
      emptyNotes: number;
    };
  };
}> {
  const db = getFirestore();
  const client = getGenAiClient(params.apiKey);

  // Накопление total Gemini tokens для BYOK usage tracking (отображается в /profile).
  // Все Gemini calls ниже инкрементируют этот счётчик через extractGeminiTokens(result).
  let totalTokens = 0;

  // Create job document (use client-provided jobId for onSnapshot tracking)
  const jobRef = params.jobId
    ? db.collection(JOBS_COLLECTION).doc(params.jobId)
    : db.collection(JOBS_COLLECTION).doc();
  await jobRef.set({
    userId: params.uid,
    userEmail: params.userEmail,
    canvasId: params.canvasId,
    sourceUrl: params.sourceUrl,
    subjectName: '',
    status: 'running',
    progress: { step: 1, total: 6, label: 'Загрузка статьи из Wikipedia' },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const updateJob = async (data: Record<string, unknown>) => {
    await jobRef.update({ ...data, updatedAt: FieldValue.serverTimestamp() });
  };

  try {
    // --- Step 1: Wikipedia fetch ---
    logger.info('[biographyImport] fetching Wikipedia', { sourceUrl: params.sourceUrl });
    const wikiPage = await fetchWikipediaPlainExtract(params.sourceUrl);
    const fullExtract = wikiPage.biographyExtract || wikiPage.extract;
    const subjectName = wikiPage.title;
    const len = fullExtract.length;

    // --- Step 2: Slice extraction (pre-built by Wikipedia module with overlap + context) ---
    const slices = wikiPage.factExtractSlices;

    await updateJob({
      subjectName,
      status: 'step1_extracting',
      progress: { step: 2, total: 6, label: 'Извлечение фактов', detail: `${slices.length} ${slices.length === 1 ? 'часть' : 'части'}` },
    });
    logger.info('[biographyImport] extraction start', { subjectName, chars: len, slices: slices.length });

    // Extract slices sequentially to avoid Gemini rate limits (429)
    let allFacts: BiographyFactCandidate[] = [];
    const factsModel = 'gemini-2.5-flash';
    for (let i = 0; i < slices.length; i++) {
      const focusHint = slices.length > 1
        ? `Персона: ${subjectName}. Это часть ${i + 1} из ${slices.length}. Извлекай ВСЕ факты из этого фрагмента — включая мелкие семейные детали, конкретные произведения, второстепенные эпизоды, аресты, организации.`
        : `Персона: ${subjectName}. Извлекай максимум фактов — включая мелкие семейные детали, конкретные произведения, второстепенные эпизоды, аресты, организации.`;

      const prompt = buildSimpleBiographyFactExtractionPrompt({
        articleTitle: subjectName,
        extract: slices[i],
        focusHint,
      });

      const result = await callGeminiWithRetry(client, {
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { temperature: 0.1, maxOutputTokens: 65536, responseMimeType: 'text/plain' },
      }, `extraction slice ${i + 1}/${slices.length}`);
      totalTokens += extractGeminiTokens(result);

      const rawText = collectGeminiResultText(result);
      const facts = parseSimpleJsonFacts(rawText);
      allFacts.push(...facts);
      logger.info(`[biographyImport] slice ${i + 1}/${slices.length} done`, { facts: facts.length });
    }
    if (allFacts.length === 0) {
      throw new Error('two-pass-flash-failed: all slices returned 0 facts');
    }
    allFacts = deduplicateFacts(allFacts);

    // --- Post-extraction: filter facts beyond death + grace period ---
    // Используем findDeathFact из composer'а: он фильтрует кандидатов по age 15-120
    // и предпочитает high-importance, чтобы не спутать смерть родственника со смертью subject'а.
    // Без этого первый встреченный death-fact (часто это смерть отца/матери) обрезает
    // всю взрослую жизнь subject'а.
    const extractedBirthFact = allFacts.find(f => f.category === 'birth' || f.eventType === 'birth');
    const extractedBirthYear = extractedBirthFact?.year ?? null;
    const extractedDeathFact = findDeathFact(allFacts, extractedBirthYear ?? undefined);
    const extractedDeathYear = extractedDeathFact?.year;
    if (extractedDeathYear != null) {
      const cutoffYear = extractedDeathYear + 10;
      const beforeFilter = allFacts.length;
      allFacts = allFacts.filter(f => f.year == null || f.year <= cutoffYear);
      const filtered = beforeFilter - allFacts.length;
      if (filtered > 0) {
        logger.info(`[biographyImport] post-death filter: removed ${filtered} facts after ${cutoffYear}`);
      }
    }

    // --- Density calculation for gap-filling control ---
    const datedForDensity = allFacts.filter(f => f.year != null);
    const factYears = datedForDensity.map(f => f.year!);
    // Use birth/death years for lifespan, not min/max of all facts (ancestors skew min)
    const lifespanStart = extractedBirthYear ?? (factYears.length > 0 ? Math.min(...factYears) : 0);
    const lifespanEnd = extractedDeathYear ?? (factYears.length > 0 ? Math.max(...factYears) : 0);
    const lifespanYears = Math.max(1, lifespanEnd - lifespanStart);
    const factDensity = datedForDensity.length / lifespanYears;
    // density < 3: full gap-filling (short articles, few facts)
    // density >= 3: dating only (enough facts, skip searching for missed ones)
    const gapFillingMode: 'full' | 'dating-only' = factDensity < 3 ? 'full' : 'dating-only';
    logger.info('[biographyImport] density analysis', {
      facts: allFacts.length, lifespanYears, density: factDensity.toFixed(2), gapFillingMode,
    });

    await updateJob({
      status: 'step1_done',
      progress: { step: 3, total: 6, label: 'Gap-filling', detail: `${allFacts.length} фактов извлечено` },
      'step1.facts': allFacts,
      'step1.model': factsModel,
      'step1.rawTextChars': len,
      'step1.extract': fullExtract,
    });
    logger.info('[biographyImport] extraction done', { facts: allFacts.length });

    // --- Step 3: Gap-filling ---
    try {
      const datedFacts = allFacts.filter(f => f.year != null);
      const undatedFacts = allFacts.filter(f => f.year == null);
      const existingFactTexts = datedFacts.map(f => `[${f.year}] ${f.details}`);
      const undatedFactTexts = undatedFacts.map(f => f.details);

      // Skip gap-filling entirely if density is high and no undated facts
      if (gapFillingMode === 'dating-only' && undatedFactTexts.length === 0) {
        logger.info('[biographyImport] skipping gap-filling: density high, no undated facts');
      } else {
        allFacts = [...datedFacts];
        try {
          const gapPrompt = buildBiographyGapFillingPrompt({
            articleTitle: subjectName,
            extract: fullExtract,
            existingFacts: existingFactTexts,
            undatedFacts: undatedFactTexts.length > 0 ? undatedFactTexts : undefined,
            mode: gapFillingMode,
            deathYear: extractedDeathYear,
          });
          const gapResult = await callGeminiWithRetry(client, {
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: gapPrompt }] }],
            config: { temperature: 0.1, maxOutputTokens: 65536, responseMimeType: 'text/plain' },
          }, 'gap-filling');
          totalTokens += extractGeminiTokens(gapResult);
          const gapFacts = parseSimpleJsonFacts(collectGeminiResultText(gapResult));
          if (gapFacts.length > 0) allFacts.push(...gapFacts);
        } catch {
          // Gap-fill failure is ok
        }
        allFacts = deduplicateFacts(allFacts);
      }
    } catch {
      // Gap-filling is best-effort
    }

    // --- Post-gap-filling: re-apply death year filter (gap-filling may add posthumous junk) ---
    if (extractedDeathYear != null) {
      const cutoffYear = extractedDeathYear + 10;
      const beforeGapFilter = allFacts.length;
      allFacts = allFacts.filter(f => f.year == null || f.year <= cutoffYear);
      const gapFiltered = beforeGapFilter - allFacts.length;
      if (gapFiltered > 0) {
        logger.info(`[biographyImport] post-gap-filling death filter: removed ${gapFiltered} facts after ${cutoffYear}`);
      }
    }

    await updateJob({
      status: 'step2_done',
      progress: { step: 4, total: 6, label: 'Аннотация и ранжирование', detail: `${allFacts.length} фактов после добивки` },
      'step2.facts': allFacts,
    });
    logger.info('[biographyImport] gap-filling done', { facts: allFacts.length });

    // --- Step 4: Annotation ---
    const indexedForAnnotation = allFacts.map((fact, index) => ({
      index,
      year: fact.year ?? null,
      details: fact.details ?? fact.evidence ?? '',
    }));
    const annotationPrompt = buildBiographyAnnotationPrompt({
      subjectName,
      facts: indexedForAnnotation,
    });

    let annotations = new Map<number, AnnotationEntry>();
    try {
      const annotResult = await callGeminiWithRetry(client, {
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: annotationPrompt }] }],
        config: { temperature: 0.05, maxOutputTokens: 65536, responseMimeType: 'text/plain' },
      }, 'annotation');
      totalTokens += extractGeminiTokens(annotResult);
      annotations = parseAnnotationResponse(collectGeminiResultText(annotResult));
    } catch (error) {
      logger.error('[biographyImport] annotation failed', { error });
    }

    const annotatedFacts = allFacts.map((fact, index) => {
      const ann = annotations.get(index);
      return { ...fact, themes: ann?.themes ?? fact.themes, people: ann?.people?.length ? ann.people : fact.people, month: ann?.month ?? fact.month };
    });

    // --- Step 5: Redaktura ---
    const indexedForRedaktura = annotatedFacts.map((fact, index) => ({
      index,
      year: fact.year ?? null,
      details: fact.details ?? fact.evidence ?? '',
      themes: annotations.get(index)?.themes ?? fact.themes ?? [],
    }));
    const redakturaPrompt = buildBiographyRedakturaPrompt({
      subjectName,
      facts: indexedForRedaktura,
    });

    let finalFacts = annotatedFacts;
    try {
      const redResult = await callGeminiWithRetry(client, {
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: redakturaPrompt }] }],
        config: { temperature: 0.05, maxOutputTokens: 16384, responseMimeType: 'text/plain' },
      }, 'redaktura');
      totalTokens += extractGeminiTokens(redResult);
      const redaktura = parseRedakturaResponse(collectGeminiResultText(redResult));
      finalFacts = annotatedFacts.map((fact, index) => {
        const red = redaktura.get(index);
        const rankScore = red?.importance ?? 2;
        const importance: 'high' | 'medium' | 'low' = rankScore >= 4 ? 'high' : rankScore === 3 ? 'medium' : 'low';
        return { ...fact, shortLabel: red?.shortLabel ?? fact.shortLabel, importance };
      });
    } catch (error) {
      logger.error('[biographyImport] redaktura failed', { error });
    }

    await updateJob({
      status: 'step3_done',
      progress: { step: 5, total: 6, label: 'Композиция таймлайна', detail: `${finalFacts.length} фактов обработано` },
      'step3.facts': finalFacts,
    });
    logger.info('[biographyImport] annotation+redaktura done', { facts: finalFacts.length });

    // --- Step 6: Composition + render ---
    // Д-B2: та же логика lifespan, что и в buildPlanFromCompositionResult —
    // наивный find(category === 'death') брал первым смерть родственника.
    const { birthYear, deathYear } = resolveCompositionLifespan(finalFacts);

    const importanceToScore = (imp: string | undefined): number => {
      if (imp === 'high') return 4;
      if (imp === 'medium') return 3;
      return 2;
    };

    const compositionPrompt = buildBiographyCompositionPrompt({
      subjectName,
      birthYear,
      deathYear,
      facts: finalFacts.map((fact, index) => ({
        index,
        year: fact.year ?? 0,
        shortLabel: fact.shortLabel ?? (fact.details ?? fact.evidence ?? '').slice(0, 40),
        themes: (fact.themes ?? []).join(','),
        people: (fact.people ?? []).join(','),
        importance: importanceToScore(fact.importance),
      })),
    });

    let composition: BiographyCompositionResult;
    try {
      const compResult = await callGeminiWithRetry(client, {
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: compositionPrompt }] }],
        config: { temperature: 0.1, maxOutputTokens: 65536, responseMimeType: 'application/json' },
      }, 'composition');
      totalTokens += extractGeminiTokens(compResult);
      composition = JSON.parse(collectGeminiResultText(compResult)) as BiographyCompositionResult;
    } catch (error) {
      logger.error('[biographyImport] composition failed, using fallback single-branch layout', { error });
      // Fallback: all facts on mainLine, no branches
      composition = {
        mainLine: finalFacts.map((_, i) => i),
        branches: [],
      };
    }

    // Fill in missing facts
    const assigned = new Set<number>();
    for (const idx of composition.mainLine) assigned.add(idx);
    for (const branch of composition.branches) {
      for (const idx of branch.facts) assigned.add(idx);
    }
    const missing = finalFacts.map((_, i) => i).filter(i => !assigned.has(i));
    if (missing.length > 0 && composition.branches.length > 0) {
      composition.branches[composition.branches.length - 1].facts.push(...missing);
    }

    // Convert composition → plan → timeline
    let timeline: BiographyTimelineData | undefined;
    let planDiagnostics: {
      source: string; mainEvents: number; branches: number; branchEvents: number;
      hasBirthDate: boolean; hasBirthPlace: boolean;
    } | undefined;
    let timelineStats: {
      nodes: number; edges: number; hasBirthDate: boolean; hasBirthPlace: boolean;
    } | undefined;

    let qualityMetrics: {
      factsTotal: number;
      factsWithThemes: number;
      themesCovered: number;
      mainEvents: number;
      branches: number;
      branchEvents: number;
      genericLabels: number;
      emptyNotes: number;
    } | undefined;

    try {
      const rawPlan = buildPlanFromCompositionResult({ subjectName, facts: finalFacts, composition });
      const plan = cleanGenericEventLabels({ plan: rawPlan, facts: finalFacts });
      timeline = buildTimelineDataFromBiographyPlan(plan);
      planDiagnostics = {
        source: 'facts-first',
        mainEvents: plan.mainEvents.length,
        branches: plan.branches.length,
        branchEvents: plan.branches.reduce((sum: number, b: { events: unknown[] }) => sum + b.events.length, 0),
        hasBirthDate: Boolean(plan.birthDetails?.date),
        hasBirthPlace: Boolean(plan.birthDetails?.place),
      };
      timelineStats = {
        nodes: timeline.nodes.length,
        edges: timeline.edges.length,
        hasBirthDate: Boolean(timeline.birthDetails?.date),
        hasBirthPlace: Boolean(timeline.birthDetails?.place),
      };

      const evalMetrics = buildBiographyEvaluationMetrics({ facts: finalFacts, plan, timeline });
      qualityMetrics = {
        factsTotal: evalMetrics.facts.total,
        factsWithThemes: evalMetrics.facts.withThemes,
        themesCovered: Object.keys(evalMetrics.facts.themeCoverage).length,
        mainEvents: evalMetrics.plan.mainEvents,
        branches: evalMetrics.plan.branches,
        branchEvents: evalMetrics.plan.branchEvents,
        genericLabels: evalMetrics.plan.genericLabels,
        emptyNotes: evalMetrics.plan.emptyNotes,
      };
    } catch (error) {
      logger.error('[biographyImport] plan/timeline conversion failed', { error });
    }

    const meta = {
      factCount: finalFacts.length,
      model: `${factsModel} -> annotation -> redaktura -> composition -> render`,
      rawTextChars: len,
      planDiagnostics,
      timelineStats,
      qualityMetrics,
    };

    await updateJob({
      status: 'done',
      step4: { timeline, composition, canvasName: subjectName, meta },
    });

    // BYOK usage tracking — учитываем потраченные tokens в /profile под action `biography:import`.
    // Записываем только если использован user's BYOK ключ (не server fallback).
    if (params.isBYOK) {
      await recordBiographyByokUsage(params.uid, totalTokens);
    }

    logger.info('[biographyImport] complete', {
      jobId: jobRef.id,
      nodes: timelineStats?.nodes,
      totalTokens,
      byokTracked: params.isBYOK,
    });

    return {
      jobId: jobRef.id,
      subjectName,
      canvasName: subjectName,
      timeline,
      composition,
      meta,
    };
  } catch (error) {
    await updateJob({ status: 'error', error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

// ============================================================================
// CLOUD FUNCTION
// ============================================================================

export const biographyImport = onRequest(
  {
    timeoutSeconds: 600,
    memory: '2GiB',
    region: 'europe-west1',
    secrets: ['GEMINI_API_KEY'],
  },
  async (req, res) => {
    // CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Gemini-Api-Key');
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Methods', 'POST');
      res.status(204).send('');
      return;
    }
    if (req.method !== 'POST') {
      res.status(405).json({ ok: false, error: 'Method not allowed' });
      return;
    }

    try {
      const { uid, email } = await verifyAuth(req);
      const sourceUrl = validateSourceUrl(req.body as Record<string, unknown>);
      const canvasId = typeof req.body?.canvasId === 'string' ? req.body.canvasId : '';
      // BYOK: user's key from header takes priority over server secret
      const userKey = req.headers['x-gemini-api-key'];
      const trimmedUserKey = typeof userKey === 'string' ? userKey.trim() : '';
      const apiKey = trimmedUserKey || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(503).json({ ok: false, error: 'GEMINI_API_KEY not configured' });
        return;
      }
      const isBYOK = Boolean(trimmedUserKey);

      const clientJobId = typeof req.body?.jobId === 'string' ? req.body.jobId : undefined;
      const result = await runFullBiographyPipeline({ sourceUrl, apiKey, uid, userEmail: email, canvasId, jobId: clientJobId, isBYOK });

      res.status(200).json({
        ok: true,
        jobId: result.jobId,
        subjectName: result.subjectName,
        canvasName: result.canvasName,
        timeline: result.timeline,
        meta: result.meta,
      });
    } catch (error) {
      logger.error('[biographyImport] handler error', error);
      const { statusCode, message } = normalizeError(error);
      res.status(statusCode).json({
        ok: false,
        error: message,
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  },
);
