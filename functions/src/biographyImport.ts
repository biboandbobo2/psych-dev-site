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
import { GoogleGenAI } from '@google/genai';

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
import { buildPlanFromCompositionResult } from '../../server/api/timelineBiographyComposer.js';
import { buildTimelineDataFromBiographyPlan } from '../../server/api/timelineBiographyQuality.js';

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
// Helpers (inlined from timelineBiographyRuntime to avoid pulling in Vercel deps)
// ============================================================================

function getGenAiClient(apiKey: string) {
  return new GoogleGenAI({ apiKey });
}

/** Call Gemini with retry on 429 (rate limit) — up to 3 attempts with 60s delay */
async function callGeminiWithRetry(
  client: GoogleGenAI,
  params: { model: string; contents: Array<{ role: string; parts: Array<{ text: string }> }>; config: Record<string, unknown> },
  label: string,
): Promise<unknown> {
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 60_000; // 60s — free tier resets per-minute quota
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const callStart = Date.now();
      const result = await client.models.generateContent(params);
      const callDurationMs = Date.now() - callStart;
      logger.info(`[biographyImport] ${label}: Gemini call took ${(callDurationMs / 1000).toFixed(1)}s (attempt ${attempt + 1})`);
      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const is429 = /429|RESOURCE_EXHAUSTED|quota/i.test(msg);
      if (is429 && attempt < MAX_RETRIES - 1) {
        logger.info(`[biographyImport] ${label}: 429 rate limit, retrying in ${RETRY_DELAY_MS / 1000}s (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }
      throw error;
    }
  }
  throw new Error(`${label}: max retries exceeded`);
}

function collectGeminiResultText(result: unknown) {
  if (result && typeof result === 'object') {
    const directText = 'text' in result && typeof result.text === 'string' ? result.text : '';
    if (directText.trim()) return directText;

    const outputsText = 'outputs' in result && Array.isArray(result.outputs)
      ? result.outputs
          .map((output: Record<string, unknown>) => {
            if (!output || typeof output !== 'object') return '';
            const type = 'type' in output && typeof output.type === 'string' ? output.type : '';
            if (type !== 'text') return '';
            return 'text' in output && typeof output.text === 'string' ? output.text : '';
          })
          .filter(Boolean)
          .join('\n')
      : '';
    if (outputsText.trim()) return outputsText;

    const candidateText = 'candidates' in result && Array.isArray(result.candidates)
      ? result.candidates
          .flatMap((candidate: Record<string, unknown>) => {
            if (!candidate || typeof candidate !== 'object') return [];
            const content = 'content' in candidate ? candidate.content : null;
            if (!content || typeof content !== 'object') return [];
            const parts = 'parts' in (content as Record<string, unknown>) && Array.isArray((content as Record<string, unknown>).parts) ? (content as Record<string, unknown>).parts as Array<Record<string, unknown>> : [];
            return parts
              .map((part) => {
                if (!part || typeof part !== 'object') return '';
                return 'text' in part && typeof part.text === 'string' ? part.text : '';
              })
              .filter(Boolean);
          })
          .join('\n')
      : '';
    if (candidateText.trim()) return candidateText;
  }
  return '';
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


function deduplicateFacts(facts: BiographyFactCandidate[]): BiographyFactCandidate[] {
  const stopWords = new Set(['в', 'и', 'на', 'с', 'по', 'из', 'за', 'от', 'к', 'до', 'для', 'не', 'о', 'об', 'его', 'её', 'был', 'была', 'были', 'году', 'год', 'года', 'лет']);
  function extractKeywords(text: string): Set<string> {
    return new Set(
      text.toLowerCase().replace(/[«»"".,;:!?()—–\-]/g, ' ').split(/\s+/)
        .filter(w => w.length > 2 && !stopWords.has(w))
    );
  }
  function countOverlap(kwA: Set<string>, kwB: Set<string>): number {
    let shared = 0;
    for (const w of kwA) { if (kwB.has(w)) shared++; }
    return shared;
  }
  const removed = new Set<number>();
  for (let i = 0; i < facts.length; i++) {
    if (removed.has(i)) continue;
    for (let j = i + 1; j < facts.length; j++) {
      if (removed.has(j)) continue;
      const a = facts[i];
      const b = facts[j];
      const sameYear = a.year != null && b.year != null && a.year === b.year;
      const oneUndated = (a.year == null) !== (b.year == null);
      if (!sameYear && !oneUndated) continue;
      const kwA = extractKeywords(a.details);
      const kwB = extractKeywords(b.details);
      const shared = countOverlap(kwA, kwB);
      if (shared >= 3) {
        if (oneUndated) {
          removed.add(a.year == null ? i : j);
          if (a.year == null) break;
        } else {
          if (a.details.length >= b.details.length) { removed.add(j); }
          else { removed.add(i); break; }
        }
      }
    }
  }
  return facts.filter((_, idx) => !removed.has(idx));
}

// ============================================================================
// Annotation
// ============================================================================

const VALID_THEMES = new Set<BiographyEventTheme>([
  'upbringing_mentors', 'education', 'friends_network', 'romance',
  'family_household', 'children', 'travel_moves_exile', 'service_career',
  'creative_work', 'conflict_duels', 'losses', 'politics_public_pressure',
  'health', 'legacy',
]);

type AnnotationEntry = {
  themes: BiographyEventTheme[];
  people: string[];
  month: number | null;
  day: number | null;
};

function parseAnnotationResponse(rawText: string) {
  const annotations = new Map<number, AnnotationEntry>();
  for (const line of rawText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('INDEX')) continue;
    const parts = trimmed.split(/\t/);
    if (parts.length < 2) continue;
    const index = parseInt(parts[0], 10);
    if (isNaN(index)) continue;
    const themes = (parts[1] ?? '').split(',').map(t => t.trim()).filter(t => VALID_THEMES.has(t as BiographyEventTheme)) as BiographyEventTheme[];
    const people = (parts[2] ?? '').split(',').map(p => p.trim()).filter(p => p && p !== '-' && p !== 'пусто');
    const month = parts[3] ? parseInt(parts[3], 10) : null;
    const day = parts[4] ? parseInt(parts[4], 10) : null;
    if (themes.length > 0) {
      annotations.set(index, {
        themes,
        people,
        month: month && !isNaN(month) && month >= 1 && month <= 12 ? month : null,
        day: day && !isNaN(day) && day >= 1 && day <= 31 ? day : null,
      });
    }
  }
  return annotations;
}

// ============================================================================
// Redaktura
// ============================================================================

function parseRedakturaResponse(rawText: string) {
  const results = new Map<number, { importance: number; shortLabel: string }>();
  for (const line of rawText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('INDEX')) continue;
    const parts = trimmed.split(/\t/);
    if (parts.length < 3) continue;
    const index = parseInt(parts[0], 10);
    if (isNaN(index)) continue;
    const importance = parseInt(parts[1], 10);
    const shortLabel = parts[2]?.trim() ?? '';
    results.set(index, {
      importance: importance >= 1 && importance <= 5 ? importance : 3,
      shortLabel,
    });
  }
  return results;
}

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
  };
}> {
  const db = getFirestore();
  const client = getGenAiClient(params.apiKey);

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
    const extractedDeathFact = allFacts.find(f => f.category === 'death');
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
    const extractedBirthFact = allFacts.find(f => f.category === 'birth' || f.eventType === 'birth');
    const extractedBirthYear = extractedBirthFact?.year ?? null;
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
    const birthFact = finalFacts.find(f => f.eventType === 'birth' || f.category === 'birth');
    const birthYear = birthFact?.year ?? finalFacts[0]?.year ?? 0;
    const deathFact = finalFacts.find(f => f.category === 'death')
      ?? finalFacts.find(f => f.themes?.includes('losses') && (f.details?.includes('скончал') || f.details?.includes('Умер') || f.details?.includes('умер')));
    const allYears = finalFacts.map(f => f.year ?? 0).filter(y => y > 0 && y < 2100);
    const deathYear = deathFact?.year ?? (allYears.length > 0 ? Math.max(...allYears) : null);

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

    try {
      const plan = buildPlanFromCompositionResult({ subjectName, facts: finalFacts, composition });
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
    } catch (error) {
      logger.error('[biographyImport] plan/timeline conversion failed', { error });
    }

    const meta = {
      factCount: finalFacts.length,
      model: `${factsModel} -> annotation -> redaktura -> composition -> render`,
      rawTextChars: len,
      planDiagnostics,
      timelineStats,
    };

    await updateJob({
      status: 'done',
      step4: { timeline, composition, canvasName: subjectName, meta },
    });

    logger.info('[biographyImport] complete', { jobId: jobRef.id, nodes: timelineStats?.nodes });

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
      const apiKey = (typeof userKey === 'string' && userKey.trim()) ? userKey.trim() : process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(503).json({ ok: false, error: 'GEMINI_API_KEY not configured' });
        return;
      }

      const clientJobId = typeof req.body?.jobId === 'string' ? req.body.jobId : undefined;
      const result = await runFullBiographyPipeline({ sourceUrl, apiKey, uid, userEmail: email, canvasId, jobId: clientJobId });

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
