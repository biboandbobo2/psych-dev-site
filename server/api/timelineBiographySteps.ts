/**
 * Step-функции biography pipeline: extraction, annotation, redaktura,
 * merged markup (BPT-9) и composition. Вынесено из
 * timelineBiographyPipeline.ts без изменения логики; оркестрация стадий
 * остаётся в runBiographyPipelineCore.
 */
import {
  buildBiographyAnnotationPrompt,
  buildBiographyCompositionPrompt,
  buildBiographyMergedMarkupPrompt,
  buildBiographyRedakturaPrompt,
  buildSimpleBiographyFactExtractionPrompt,
} from './timelineBiographyPrompts.js';
import {
  parseAnnotationResponse,
  parseMergedMarkupJsonResponse,
  parseMergedMarkupResponse,
  parseRedakturaResponse,
  parseSimpleJsonFacts,
  type AnnotationEntry,
} from './timelineBiographyParsers.js';
import {
  resolveCompositionLifespan,
  sanitizeCompositionResult,
} from './timelineBiographyComposer.js';
import {
  collectGeminiResultText,
  extractTotalTokens,
  extractionCallConfig,
  isLiteProfile,
  MERGED_MARKUP_RESPONSE_SCHEMA,
} from './timelineBiographyGemini.js';
import {
  DEFAULT_BIOGRAPHY_MODEL,
  type BiographyPipelineDeps,
} from './timelineBiographyPipelineTypes.js';
import type {
  BiographyCompositionResult,
  BiographyFactCandidate,
} from './timelineBiographyTypes.js';

export async function generateSimpleBiographyFacts(params: {
  deps: BiographyPipelineDeps;
  articleTitle: string;
  extract: string;
  focusHint?: string;
  label: string;
}): Promise<{ facts: BiographyFactCandidate[]; model: string }> {
  const prompt = buildSimpleBiographyFactExtractionPrompt({
    articleTitle: params.articleTitle,
    extract: params.extract,
    focusHint: params.focusHint,
  });

  const flashOnlyModels = [params.deps.model ?? DEFAULT_BIOGRAPHY_MODEL] as const;
  let lastError: unknown = null;

  for (const model of flashOnlyModels) {
    try {
      const result = await params.deps.callModel(
        {
          model,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: extractionCallConfig(params.deps),
        },
        params.label
      );
      params.deps.onTokens?.(extractTotalTokens(result));

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

export async function annotateBiographyFacts(params: {
  deps: BiographyPipelineDeps;
  subjectName: string;
  facts: BiographyFactCandidate[];
}): Promise<{ annotatedFacts: BiographyFactCandidate[]; annotations: Map<number, AnnotationEntry> }> {
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
    const result = await params.deps.callModel(
      {
        model: params.deps.model ?? DEFAULT_BIOGRAPHY_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          temperature: 0.05,
          maxOutputTokens: 65536,
          responseMimeType: 'text/plain',
        },
      },
      'annotation'
    );
    params.deps.onTokens?.(extractTotalTokens(result));
    rawText = collectGeminiResultText(result);
  } catch (error) {
    params.deps.logError?.('annotation failed', { error: String(error) });
  }

  const annotations = parseAnnotationResponse(rawText);

  params.deps.log?.('annotation parsed', {
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

export async function redaktBiographyFacts(params: {
  deps: BiographyPipelineDeps;
  subjectName: string;
  facts: BiographyFactCandidate[];
  annotations: Map<number, AnnotationEntry>;
}): Promise<{ facts: BiographyFactCandidate[]; redactedCount: number }> {
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
    const result = await params.deps.callModel(
      {
        model: params.deps.model ?? DEFAULT_BIOGRAPHY_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          temperature: 0.05,
          maxOutputTokens: 65536,
          responseMimeType: 'text/plain',
        },
      },
      'redaktura'
    );
    params.deps.onTokens?.(extractTotalTokens(result));
    rawText = collectGeminiResultText(result);
  } catch (error) {
    params.deps.logError?.('redaktura failed', { error: String(error) });
  }

  const redaktura = parseRedakturaResponse(rawText);

  params.deps.log?.('redaktura parsed', {
    total: params.facts.length,
    parsed: redaktura.size,
    missing: params.facts.length - redaktura.size,
  });

  const facts = params.facts.map((fact, index) => {
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
  return { facts, redactedCount: redaktura.size };
}

/** BPT-9: объединённая разметка одним вызовом (за флагом deps.mergedMarkup). */
export async function markupBiographyFactsMerged(params: {
  deps: BiographyPipelineDeps;
  subjectName: string;
  facts: BiographyFactCandidate[];
}): Promise<{ facts: BiographyFactCandidate[]; annotations: Map<number, AnnotationEntry>; redactedCount: number }> {
  const indexedFacts = params.facts.map((fact, index) => ({
    index,
    year: fact.year ?? null,
    details: fact.details ?? fact.evidence ?? '',
  }));

  const useJson = isLiteProfile(params.deps) || params.deps.structuredExtraction === true;
  const prompt = buildBiographyMergedMarkupPrompt({
    subjectName: params.subjectName,
    facts: indexedFacts,
    json: useJson,
  });

  let rawText = '';
  try {
    const result = await params.deps.callModel(
      {
        model: params.deps.model ?? DEFAULT_BIOGRAPHY_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: useJson
          ? {
              temperature: 0.05,
              maxOutputTokens: 65536,
              responseMimeType: 'application/json',
              responseSchema: MERGED_MARKUP_RESPONSE_SCHEMA,
            }
          : {
              temperature: 0.05,
              maxOutputTokens: 65536,
              responseMimeType: 'text/plain',
            },
      },
      'merged-markup'
    );
    params.deps.onTokens?.(extractTotalTokens(result));
    rawText = collectGeminiResultText(result);
  } catch (error) {
    params.deps.logError?.('merged markup failed', { error: String(error) });
  }

  const merged = useJson ? parseMergedMarkupJsonResponse(rawText) : parseMergedMarkupResponse(rawText);
  params.deps.log?.('merged markup parsed', {
    total: params.facts.length,
    parsed: merged.size,
    missing: params.facts.length - merged.size,
  });

  const annotations = new Map<number, AnnotationEntry>();
  const facts = params.facts.map((fact, index) => {
    const entry = merged.get(index);
    if (entry) {
      annotations.set(index, {
        themes: entry.themes,
        people: entry.people,
        month: entry.month,
        day: entry.day,
      });
    }
    const importance: 'high' | 'medium' | 'low' =
      (entry?.importance ?? 2) >= 4 ? 'high' : entry?.importance === 3 ? 'medium' : 'low';
    return {
      ...fact,
      themes: entry?.themes ?? fact.themes,
      people: entry?.people?.length ? entry.people : fact.people,
      month: entry?.month ?? fact.month,
      shortLabel: entry?.shortLabel || fact.shortLabel,
      importance,
    };
  });

  return { facts, annotations, redactedCount: merged.size };
}

export async function composeBiographyFactsIntoTimeline(params: {
  deps: BiographyPipelineDeps;
  subjectName: string;
  facts: BiographyFactCandidate[];
}): Promise<BiographyCompositionResult> {
  // Д-B2: та же логика lifespan, что и в buildPlanFromCompositionResult —
  // наивный find(category === 'death') брал первым смерть родственника.
  const { birthYear, deathYear } = resolveCompositionLifespan(params.facts);

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

  let composition: BiographyCompositionResult;
  try {
    const result = await params.deps.callModel(
      {
        model: params.deps.model ?? DEFAULT_BIOGRAPHY_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          temperature: 0.1,
          maxOutputTokens: 65536,
          responseMimeType: 'application/json',
        },
      },
      'composition'
    );
    params.deps.onTokens?.(extractTotalTokens(result));
    composition = JSON.parse(collectGeminiResultText(result)) as BiographyCompositionResult;
  } catch (error) {
    // Прод-семантика CF: падение composition не роняет импорт —
    // fallback: все факты на главной линии, без веток.
    params.deps.logError?.('composition failed, using fallback single-branch layout', { error: String(error) });
    composition = {
      mainLine: params.facts.map((_, i) => i),
      branches: [],
    };
  }

  // B3: строгая валидация — дубли/выдуманные индексы, потерянные по темам
  const sanitized = sanitizeCompositionResult(composition, params.facts);
  const rawAssigned = new Set<number>([
    ...composition.mainLine ?? [],
    ...(composition.branches ?? []).flatMap(b => b.facts ?? []),
  ]);
  params.deps.log?.('composition result', {
    mainLine: sanitized.mainLine.length,
    branches: sanitized.branches.length,
    branchNames: sanitized.branches.map(b => b.name),
    assigned: rawAssigned.size,
    missing: params.facts.length - rawAssigned.size,
  });

  return sanitized;
}
