import type { VercelRequest } from '@vercel/node';
import { debugError, debugLog } from '../../src/lib/debug.js';
import { getLectureGenAiClient } from './lectureApiRuntime.js';
import {
  buildBiographyAnnotationPrompt,
  buildBiographyRedakturaPrompt,
  buildBiographyCompositionPrompt,
  buildBiographyGapFillingPrompt,
  buildSimpleBiographyFactExtractionPrompt,
  fetchWikipediaPlainExtract,
  type BiographyEventTheme,
  type BiographyExtractionMode,
  type BiographyFactCandidate,
  type BiographyImportRequest,
} from './timelineBiography.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Validation & error handling
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Payload types
// ---------------------------------------------------------------------------

export type BiographyCompositionResult = {
  mainLine: number[];
  branches: Array<{ name: string; sphere: string; facts: number[] }>;
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
    groundingSources: Array<{ title?: string; uri?: string }>;
    urlContextMetadata: Array<{ retrievedUrl?: string; urlRetrievalStatus?: string }>;
  };
  subjectName: string | null;
  composition?: BiographyCompositionResult;
};

// ---------------------------------------------------------------------------
// Annotation (step 3): themes, people, month, day
// ---------------------------------------------------------------------------

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

async function annotateBiographyFacts(params: {
  apiKey: string;
  subjectName: string;
  facts: BiographyFactCandidate[];
}): Promise<{ annotatedFacts: BiographyFactCandidate[]; annotations: Map<number, AnnotationEntry> }> {
  const client = getLectureGenAiClient(params.apiKey);

  const indexedFacts = params.facts.map((fact, index) => ({
    index,
    year: fact.year ?? null,
    details: fact.details ?? fact.evidence ?? '',
  }));

  const prompt = buildBiographyAnnotationPrompt({
    subjectName: params.subjectName,
    facts: indexedFacts,
  });

  let rawText = '';
  try {
    const result = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.05,
        maxOutputTokens: 65536,
        responseMimeType: 'text/plain',
      },
    });
    rawText = collectGeminiResultText(result);
  } catch (error) {
    debugError('[timeline-biography] annotation failed', { error });
  }

  const annotations = parseAnnotationResponse(rawText);

  debugLog('[timeline-biography] annotation parsed', {
    total: params.facts.length,
    annotated: annotations.size,
    missing: params.facts.length - annotations.size,
  });

  const annotatedFacts = params.facts.map((fact, index) => {
    const ann = annotations.get(index);
    return {
      ...fact,
      themes: ann?.themes ?? fact.themes,
      people: ann?.people?.length ? ann.people : fact.people,
      month: ann?.month ?? fact.month,
    };
  });

  return { annotatedFacts, annotations };
}

// ---------------------------------------------------------------------------
// Redaktura (step 4): importance, shortLabel
// ---------------------------------------------------------------------------

type RedakturaEntry = {
  importance: number;
  shortLabel: string;
};

function parseRedakturaResponse(rawText: string) {
  const results = new Map<number, RedakturaEntry>();
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

async function redaktBiographyFacts(params: {
  apiKey: string;
  subjectName: string;
  facts: BiographyFactCandidate[];
  annotations: Map<number, AnnotationEntry>;
}): Promise<BiographyFactCandidate[]> {
  const client = getLectureGenAiClient(params.apiKey);

  const indexedFacts = params.facts.map((fact, index) => ({
    index,
    year: fact.year ?? null,
    details: fact.details ?? fact.evidence ?? '',
    themes: params.annotations.get(index)?.themes ?? fact.themes ?? [],
  }));

  const prompt = buildBiographyRedakturaPrompt({
    subjectName: params.subjectName,
    facts: indexedFacts,
  });

  let rawText = '';
  try {
    const result = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.05,
        maxOutputTokens: 16384,
        responseMimeType: 'text/plain',
      },
    });
    rawText = collectGeminiResultText(result);
  } catch (error) {
    debugError('[timeline-biography] redaktura failed', { error });
  }

  const redaktura = parseRedakturaResponse(rawText);

  debugLog('[timeline-biography] redaktura parsed', {
    total: params.facts.length,
    parsed: redaktura.size,
    missing: params.facts.length - redaktura.size,
  });

  return params.facts.map((fact, index) => {
    const red = redaktura.get(index);
    const rankScore = red?.importance ?? 2;
    const importance: 'high' | 'medium' | 'low' =
      rankScore >= 4 ? 'high' : rankScore === 3 ? 'medium' : 'low';

    return {
      ...fact,
      shortLabel: red?.shortLabel ?? fact.shortLabel,
      importance,
    };
  });
}

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

async function composeBiographyFactsIntoTimeline(params: {
  apiKey: string;
  subjectName: string;
  facts: BiographyFactCandidate[];
}): Promise<BiographyCompositionResult> {
  const birthFact = params.facts.find(f => f.eventType === 'birth' || f.category === 'birth');
  const birthYear = birthFact?.year ?? params.facts[0]?.year ?? 0;

  // Find death: prefer category/theme signals, fall back to keyword search
  const deathFact = params.facts.find(f => f.category === 'death')
    ?? params.facts.find(f => f.themes?.includes('losses') && (
      f.details?.includes('скончал') || f.details?.includes('Умер') || f.details?.includes('умер')
    ));
  const allYears = params.facts.map(f => f.year ?? 0).filter(y => y > 0 && y < 2100);
  const deathYear = deathFact?.year ?? (allYears.length > 0 ? Math.max(...allYears) : null);

  // Convert importance string to numeric score for composition prompt
  const importanceToScore = (imp: string | undefined): number => {
    if (imp === 'high') return 4;
    if (imp === 'medium') return 3;
    return 2;
  };

  const indexedFacts = params.facts.map((fact, index) => ({
    index,
    year: fact.year ?? 0,
    shortLabel: fact.shortLabel ?? (fact.details ?? fact.evidence ?? '').slice(0, 40),
    themes: (fact.themes ?? []).join(','),
    people: (fact.people ?? []).join(','),
    importance: importanceToScore(fact.importance),
  }));

  const prompt = buildBiographyCompositionPrompt({
    subjectName: params.subjectName,
    birthYear,
    deathYear,
    facts: indexedFacts,
  });

  const client = getLectureGenAiClient(params.apiKey);

  const result = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      temperature: 0.1,
      maxOutputTokens: 65536,
      responseMimeType: 'application/json',
    },
  });

  const rawText = collectGeminiResultText(result);
  const parsed = JSON.parse(rawText) as BiographyCompositionResult;

  // Validate: check all indices present
  const assigned = new Set<number>();
  for (const idx of parsed.mainLine) assigned.add(idx);
  for (const branch of parsed.branches) {
    for (const idx of branch.facts) assigned.add(idx);
  }

  const missing = params.facts.map((_, i) => i).filter(i => !assigned.has(i));
  debugLog('[timeline-biography] composition result', {
    mainLine: parsed.mainLine.length,
    branches: parsed.branches.length,
    branchNames: parsed.branches.map(b => b.name),
    assigned: assigned.size,
    missing: missing.length,
  });

  // If facts were missed, add them to the closest branch by theme
  if (missing.length > 0 && parsed.branches.length > 0) {
    const lastBranch = parsed.branches[parsed.branches.length - 1];
    lastBranch.facts.push(...missing);
  }

  return parsed;
}

// ---------------------------------------------------------------------------
// Extraction helpers
// ---------------------------------------------------------------------------

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
          maxOutputTokens: 65536,
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
 * Deduplicate facts:
 * 1. Same year + ≥3 keyword overlap → keep the longer one
 * 2. Dated fact vs undated fact with ≥3 keyword overlap → keep the dated one
 */
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
    for (const w of kwA) {
      if (kwB.has(w)) shared++;
    }
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

      // Only compare facts with same year OR when one is undated
      if (!sameYear && !oneUndated) continue;

      const kwA = extractKeywords(a.details);
      const kwB = extractKeywords(b.details);
      const shared = countOverlap(kwA, kwB);

      if (shared >= 3) {
        if (oneUndated) {
          // Prefer the dated fact
          removed.add(a.year == null ? i : j);
          if (a.year == null) break;
        } else {
          // Same year — prefer the longer description
          if (a.details.length >= b.details.length) {
            removed.add(j);
          } else {
            removed.add(i);
            break;
          }
        }
      }
    }
  }

  return facts.filter((_, idx) => !removed.has(idx));
}

// ---------------------------------------------------------------------------
// Two-pass extraction pipeline (entry point)
// ---------------------------------------------------------------------------

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
      const focusHint = slices.length > 1
        ? `Персона: ${subjectName}. Это часть ${index + 1} из ${slices.length}. Извлекай ВСЕ факты из этого фрагмента — включая мелкие семейные детали, конкретные произведения, второстепенные эпизоды, аресты, организации.`
        : `Персона: ${subjectName}. Извлекай максимум фактов — включая мелкие семейные детали, конкретные произведения, второстепенные эпизоды, аресты, организации.`;

      return generateSimpleBiographyFacts({
        apiKey: params.apiKey,
        articleTitle: subjectName,
        extract: slice,
        focusHint,
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

  allFacts = deduplicateFacts(allFacts);

  // Gap-filling pass: also send undated facts for dating
  try {
    const datedFacts = allFacts.filter(f => f.year != null);
    const undatedFacts = allFacts.filter(f => f.year == null);

    const existingFactTexts = datedFacts.map(f => `[${f.year}] ${f.details}`);
    const undatedFactTexts = undatedFacts.map(f => f.details);

    const gapClient = getLectureGenAiClient(params.apiKey);
    const gapSlices = len > 100000 ? slices : [fullExtract];

    const gapSettled = await Promise.allSettled(
      gapSlices.map(sliceText => {
        const gapPrompt = buildBiographyGapFillingPrompt({
          articleTitle: subjectName,
          extract: sliceText,
          existingFacts: existingFactTexts,
          undatedFacts: undatedFactTexts.length > 0 ? undatedFactTexts : undefined,
        });
        return gapClient.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [{ text: gapPrompt }] }],
          config: {
            temperature: 0.1,
            maxOutputTokens: 65536,
            responseMimeType: 'text/plain',
          },
        });
      })
    );

    // Start from dated facts only; gap-filling returns both new facts and re-dated old ones
    allFacts = [...datedFacts];
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
    // Gap-filling is best-effort
  }

  const factsResult = { facts: allFacts, model: factsModel };

  const { annotatedFacts, annotations } = await annotateBiographyFacts({
    apiKey: params.apiKey,
    subjectName,
    facts: factsResult.facts,
  });

  const finalFacts = await redaktBiographyFacts({
    apiKey: params.apiKey,
    subjectName,
    facts: annotatedFacts,
    annotations,
  });

  const composition = await composeBiographyFactsIntoTimeline({
    apiKey: params.apiKey,
    subjectName,
    facts: finalFacts,
  });

  return {
    ok: true,
    sourceUrl: params.sourceUrl,
    subjectName,
    facts: finalFacts,
    composition,
    meta: {
      factCount: finalFacts.length,
      extractionMode: 'two-pass' as BiographyExtractionMode,
      model: `${factsResult.model} -> annotation -> redaktura -> composition`,
      promptVersion: 'two-pass-v5',
      rawTextChars: fullExtract.length,
      strategy: 'two-pass-plaintext' as 'url-context',
      groundingSources: [],
      urlContextMetadata: [],
    },
  };
}

// ---------------------------------------------------------------------------
// Public API entry points
// ---------------------------------------------------------------------------

export async function runBiographyImport(params: {
  sourceUrl: string;
  apiKey: string;
}): Promise<BiographyExtractorSuccessPayload> {
  return runBiographyTwoPassExtraction(params);
}

export async function runBiographyFactExtraction(params: {
  sourceUrl: string;
  apiKey: string;
  extractionMode?: BiographyExtractionMode;
}): Promise<BiographyExtractorSuccessPayload> {
  return runBiographyTwoPassExtraction(params);
}
