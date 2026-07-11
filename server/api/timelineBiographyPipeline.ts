/**
 * Единый biography pipeline (BPT-2): извлечение → gap-filling → annotation →
 * redaktura → composition → render. Оркестрация существует в ОДНОМ месте;
 * Cloud Function и Vercel automation runtime — тонкие обёртки.
 *
 * Модуль транспорт-агностичен: модель инжектится через callModel, логи и
 * прогресс — через callbacks. Никаких импортов Vercel/Firebase/debug —
 * иначе CF не сможет его импортировать.
 */
import {
  buildBiographyAnnotationPrompt,
  buildBiographyCompositionPrompt,
  buildBiographyGapFillingPrompt,
  buildBiographyMergedMarkupPrompt,
  buildBiographyRedakturaPrompt,
  buildSimpleBiographyFactExtractionPrompt,
} from './timelineBiographyPrompts.js';
import { fetchWikipediaPlainExtract } from './timelineBiographyWikipedia.js';
import {
  filterFactsBeyondDeath,
  resolveGapFillingMode,
  stripFabricatedYearClusters,
  stripUnreliableMonths,
} from './timelineBiographyFacts.js';
import {
  deduplicateFacts,
  parseAnnotationResponse,
  parseMergedMarkupJsonResponse,
  parseMergedMarkupResponse,
  parseRedakturaResponse,
  parseSimpleJsonFacts,
  type AnnotationEntry,
} from './timelineBiographyParsers.js';
import {
  buildPlanFromCompositionResult,
  findDeathFact,
  resolveCompositionLifespan,
  sanitizeCompositionResult,
} from './timelineBiographyComposer.js';
import { cleanGenericEventLabels } from './timelineBiographyLint.js';
import { buildTimelineDataFromBiographyPlan } from './timelineBiographyQuality.js';
import type {
  BiographyCompositionResult,
  BiographyFactCandidate,
  BiographyTimelineData,
  BiographyTimelinePlan,
  WikipediaPageExtract,
} from './timelineBiographyTypes.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BiographyGenerateRequest = {
  model: string;
  contents: Array<{ role: string; parts: Array<{ text: string }> }>;
  config?: Record<string, unknown>;
};

export type BiographyGenAiClient = {
  models: {
    generateContent(request: BiographyGenerateRequest): Promise<unknown>;
  };
};

/** Вызов модели: CF оборачивает в retry+logger, Runtime — прямой вызов. */
export type CallBiographyModel = (request: BiographyGenerateRequest, label: string) => Promise<unknown>;

export type BiographyProgressCallback = (
  step: number,
  total: number,
  label: string,
  detail?: string
) => void;

export type BiographyPipelineStage = 'extraction' | 'gap-filling' | 'redaktura';

export type BiographyPipelineStageData = {
  facts: BiographyFactCandidate[];
  subjectName: string;
  extract: string;
  rawTextChars: number;
  slicesTotal: number;
  gapFillingMode?: 'full' | 'dating-only';
  factDensity?: number;
};

/** Дефолт pipeline без явных deps (бенчмарк-baseline, automation runtime).
 *  Переопределяется через deps.model — только Flash-тир, не Pro. */
export const DEFAULT_BIOGRAPHY_MODEL = 'gemini-2.5-flash';

/** Прод-модель user-facing импорта (CF biographyImport): non-thinking lite
 *  + tuningProfile 'lite'. Выбрана по бенчмарку 2026-07 (7 статей чистые,
 *  12–25× дешевле 2.5-flash, переживает retirement 2.5-flash 2026-10-16).
 *  DEFAULT_BIOGRAPHY_MODEL остаётся 2.5-flash, чтобы кэш baseline-бенчмарка
 *  и quality gate дефолтного пути не инвалидировались. */
export const BIOGRAPHY_PROD_MODEL = 'gemini-3.1-flash-lite';

export type BiographyPipelineDeps = {
  callModel: CallBiographyModel;
  /** Переопределение модели (только для бенчмарк-миграции); по умолчанию 2.5-flash. */
  model?: string;
  /** Тюнинг полноты извлечения: процедурная добавка к focusHint (не-thinking
   *  модели недобирают факты на декларативном «извлеки всё»). undefined →
   *  промпт байт-в-байт как прод (кэш-ключи стабильны). */
  extractionEmphasis?: string;
  /** BPT-9 (за флагом): annotation+redaktura одним вызовом — минус один
   *  запрос на импорт. false/undefined → легаси-путь, кэш стабилен. */
  mergedMarkup?: boolean;
  /** Structured output для extraction/gap (за флагом): responseSchema с
   *  nullable year — легальный «года нет» вместо фабрикации дат
   *  не-thinking моделями. false/undefined → конфиг байт-в-байт как прод. */
  structuredExtraction?: boolean;
  /** Прод-профиль тюнинга для не-thinking моделей (3.1-flash-lite):
   *  включает разом дробление+few-shot extraction, structured output и
   *  объединённую разметку. undefined → дефолтный путь байт-в-байт. */
  tuningProfile?: 'lite';
  onProgress?: BiographyProgressCallback;
  /** Суммарные токены каждого вызова (BYOK accounting в CF). */
  onTokens?: (tokens: number) => void;
  /** Границы стадий — CF пишет из них biographyJobs step1/step2/step3. */
  onStage?: (stage: BiographyPipelineStage, data: BiographyPipelineStageData) => void | Promise<void>;
  log?: (message: string, data?: Record<string, unknown>) => void;
  logError?: (message: string, data?: Record<string, unknown>) => void;
};

export type BiographyPipelineResult = {
  wikiPage: WikipediaPageExtract;
  subjectName: string;
  rawTextChars: number;
  factsModel: string;
  /** B6: покрытие TSV-разметки — annotation/redaktura деградируют молча
   *  (пропущенная строка = факт без тем/importance), это должно быть видно. */
  stepCoverage: {
    factsTotal: number;
    annotated: number;
    redacted: number;
  };
  /** Гарды датировочной фабрикации (сработки — сигнал ненадёжных дат модели). */
  dateSanity: {
    monthsStripped: number;
    yearsStripped: number;
  };
  facts: BiographyFactCandidate[];
  composition: BiographyCompositionResult;
  timeline?: BiographyTimelineData;
  /** Очищенный план (для qualityMetrics в CF). */
  plan?: BiographyTimelinePlan;
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

// ---------------------------------------------------------------------------
// Gemini result text extraction
// ---------------------------------------------------------------------------

export function collectGeminiResultText(result: unknown) {
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
            const parts: unknown[] = 'parts' in content && Array.isArray(content.parts) ? content.parts : [];
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

/** JSON-схема extraction/gap-ответа: nullable year/month узаконивают
 *  «дата неизвестна» (документированный приём Google против галлюцинаций). */
const FACT_EXTRACTION_RESPONSE_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      year: {
        type: 'integer',
        nullable: true,
        description: 'Год события, буквально указанный в тексте. null, если год в тексте не написан. НЕ выводить год из соседних событий.',
      },
      month: {
        type: 'integer',
        nullable: true,
        minimum: 1,
        maximum: 12,
        description: 'Месяц, только если буквально указан в тексте. Иначе null.',
      },
      text: { type: 'string', description: 'Конкретное событие, 5-15 слов.' },
      category: {
        type: 'string',
        enum: ['birth', 'education', 'move', 'publication', 'career', 'family', 'friends', 'health', 'conflict', 'award', 'project', 'death', 'other'],
      },
      sphere: {
        type: 'string',
        enum: ['education', 'career', 'creativity', 'family', 'health', 'friends', 'place', 'finance', 'hobby', 'other'],
      },
    },
    required: ['year', 'text', 'category', 'sphere'],
  },
} as const;

const LITE_DATING_EXAMPLES = [
  'ПРИМЕРЫ ПРАВИЛЬНОЙ ДАТИРОВКИ:',
  'Текст: «В 1927 году переехал в Париж.» → {"year": 1927, "text": "Переехал в Париж", "category": "move", "sphere": "place"}',
  'Текст: «Позднее активно выступал против войны.» (год из текста НЕ следует) → {"year": null, "text": "Активно выступал против войны", "category": "other", "sphere": "other"}',
  'Текст: «В эти годы много путешествовал по Европе.» (точного года нет) → {"year": null, "text": "Много путешествовал по Европе", "category": "move", "sphere": "place"}',
  'Текст: «С 1902 года регулярно проводил встречи с учениками.» (длительный факт — год НАЧАЛА) → {"year": 1902, "text": "Начал регулярные встречи с учениками", "category": "career", "sphere": "career"}',
  'НИКОГДА не приписывай факту год соседнего события или начала десятилетия. Нет года в тексте — ставь null.',
].join('\n');

/** Замерено на rogers/vygotsky (2026-07): не-thinking модели требуют
 *  процедуры вместо декларации. Поабзацный проход + минимум, растущий с
 *  размером слайса (~1 факт на 400 символов), + few-shot year=null. */
export function buildLiteExtractionEmphasis(sliceChars: number): string {
  const minFacts = Math.max(60, Math.round(sliceChars / 400));
  return [
    `МЕТОД РАБОТЫ — строго по процедуре: пройди фрагмент АБЗАЦ ЗА АБЗАЦЕМ. Из каждого абзаца выпиши ВСЕ события: каждое предложение с датой, именем, произведением, местом, организацией или переменой статуса — ОТДЕЛЬНЫЙ факт. Составное предложение с несколькими событиями дели на несколько фактов. Не обобщай и не сжимай. Пропустить абзац нельзя. ОСОБОЕ ПРАВИЛО: предложение, в котором написан год (например «1924»), пропускать ЗАПРЕЩЕНО — каждое такое предложение обязано дать минимум один факт с этим годом. Верни не менее ${minFacts} фактов.`,
    LITE_DATING_EXAMPLES,
  ].join('\n');
}

function isLiteProfile(deps: BiographyPipelineDeps) {
  return deps.tuningProfile === 'lite';
}

function resolvedExtractionEmphasis(deps: BiographyPipelineDeps, sliceChars: number): string | undefined {
  if (deps.extractionEmphasis) return deps.extractionEmphasis;
  return isLiteProfile(deps) ? buildLiteExtractionEmphasis(sliceChars) : undefined;
}

/** Схема JSON-ответа объединённой разметки (lite-профиль): TSV с пустыми
 *  колонками не-thinking модели схлопывают, теряя позиционность строк. */
const MERGED_MARKUP_RESPONSE_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      index: { type: 'integer' },
      themes: { type: 'array', items: { type: 'string' } },
      people: { type: 'array', items: { type: 'string' } },
      month: { type: 'integer', nullable: true, minimum: 1, maximum: 12 },
      day: { type: 'integer', nullable: true, minimum: 1, maximum: 31 },
      importance: { type: 'integer', minimum: 1, maximum: 5 },
      shortLabel: { type: 'string' },
    },
    required: ['index', 'themes', 'month', 'importance', 'shortLabel'],
  },
} as const;

function extractionCallConfig(deps: BiographyPipelineDeps): Record<string, unknown> {
  if (!deps.structuredExtraction && !isLiteProfile(deps)) {
    return {
      temperature: 0.1,
      maxOutputTokens: 65536,
      responseMimeType: 'text/plain',
    };
  }
  return {
    temperature: 0.1,
    maxOutputTokens: 65536,
    responseMimeType: 'application/json',
    responseSchema: FACT_EXTRACTION_RESPONSE_SCHEMA,
  };
}

function extractTotalTokens(result: unknown): number {
  if (!result || typeof result !== 'object' || !('usageMetadata' in result)) return 0;
  const meta = (result as { usageMetadata?: { totalTokenCount?: number } }).usageMetadata;
  return typeof meta?.totalTokenCount === 'number' ? meta.totalTokenCount : 0;
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

async function generateSimpleBiographyFacts(params: {
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

async function annotateBiographyFacts(params: {
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

async function redaktBiographyFacts(params: {
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
async function markupBiographyFactsMerged(params: {
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

async function composeBiographyFactsIntoTimeline(params: {
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

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export async function runBiographyPipelineCore(params: {
  sourceUrl: string;
  /** Pre-fetched страница (fixtures в бенчмарках/тестах) — сеть не трогается. */
  page?: WikipediaPageExtract;
  deps: BiographyPipelineDeps;
}): Promise<BiographyPipelineResult> {
  const { deps } = params;
  const progress = deps.onProgress ?? (() => {});
  const TOTAL_STEPS = 6;

  progress(1, TOTAL_STEPS, 'Загрузка статьи из Wikipedia');
  const wikiPage = params.page ?? (await fetchWikipediaPlainExtract(params.sourceUrl));
  const fullExtract = wikiPage.biographyExtract || wikiPage.extract;
  const len = fullExtract.length;

  // Те же слайсы, что готовит Wikipedia-модуль (28K + overlap + lead-контекст)
  const slices = wikiPage.factExtractSlices?.length ? wikiPage.factExtractSlices : [fullExtract];

  const subjectName = wikiPage.title;
  progress(1, TOTAL_STEPS, 'Загрузка статьи из Wikipedia', `${subjectName} — ${Math.round(len / 1000)}K символов`);
  deps.log?.('extraction start', { subjectName, chars: len, slices: slices.length });

  progress(2, TOTAL_STEPS, 'Извлечение биографических фактов', `${slices.length} ${slices.length === 1 ? 'часть' : 'части'}`);

  // Последовательно — параллельные вызовы ловят 429 на free tier
  let allFacts: BiographyFactCandidate[] = [];
  let factsModel = deps.model ?? DEFAULT_BIOGRAPHY_MODEL;
  for (let index = 0; index < slices.length; index++) {
    const baseFocusHint = slices.length > 1
      ? `Персона: ${subjectName}. Это часть ${index + 1} из ${slices.length}. Извлекай ВСЕ факты из этого фрагмента — включая мелкие семейные детали, конкретные произведения, второстепенные эпизоды, аресты, организации.`
      : `Персона: ${subjectName}. Извлекай максимум фактов — включая мелкие семейные детали, конкретные произведения, второстепенные эпизоды, аресты, организации.`;
    const emphasis = resolvedExtractionEmphasis(deps, slices[index].length);
    const focusHint = emphasis ? `${baseFocusHint}\n${emphasis}` : baseFocusHint;

    // F1 (verifier): падение слайса после ретраев — ошибка импорта, а не
    // молча обрезанная биография (прод-семантика старого CF).
    const result = await generateSimpleBiographyFacts({
      deps,
      articleTitle: subjectName,
      extract: slices[index],
      focusHint,
      label: `extraction slice ${index + 1}/${slices.length}`,
    });
    allFacts.push(...result.facts);
    factsModel = result.model;
    deps.log?.(`slice ${index + 1}/${slices.length} done`, { facts: result.facts.length });
  }

  if (allFacts.length === 0) {
    throw new Error('two-pass-flash-failed: all slices returned 0 facts');
  }

  allFacts = deduplicateFacts(allFacts);

  // Post-death фильтр: посмертные факты (памятники, издания) не должны
  // доезжать до composition.
  const extractedBirthFact = allFacts.find(f => f.category === 'birth' || f.eventType === 'birth');
  const extractedBirthYear = extractedBirthFact?.year ?? null;
  const extractedDeathYear = findDeathFact(allFacts, extractedBirthYear ?? undefined)?.year ?? null;
  {
    const beforeFilter = allFacts.length;
    allFacts = filterFactsBeyondDeath(allFacts, extractedDeathYear);
    const filtered = beforeFilter - allFacts.length;
    if (filtered > 0) {
      deps.log?.(`post-death filter: removed ${filtered} facts`, { deathYear: extractedDeathYear });
    }
  }

  const { mode: gapFillingMode, factDensity, lifespanYears } = resolveGapFillingMode(
    allFacts,
    extractedBirthYear,
    extractedDeathYear
  );
  deps.log?.('density analysis', {
    facts: allFacts.length, lifespanYears, density: factDensity.toFixed(2), gapFillingMode,
  });

  const stageData = (): BiographyPipelineStageData => ({
    facts: allFacts,
    subjectName,
    extract: fullExtract,
    rawTextChars: len,
    slicesTotal: slices.length,
    gapFillingMode,
    factDensity,
  });
  await deps.onStage?.('extraction', stageData());

  progress(2, TOTAL_STEPS, 'Извлечение биографических фактов', `${allFacts.length} фактов извлечено`);

  progress(3, TOTAL_STEPS, 'Добивочный проход (gap-filling)');
  // Gap-filling pass: also send undated facts for dating
  try {
    const datedFacts = allFacts.filter(f => f.year != null);
    const undatedFacts = allFacts.filter(f => f.year == null);

    if (gapFillingMode === 'dating-only' && undatedFacts.length === 0) {
      deps.log?.('skipping gap-filling: density high, no undated facts');
    } else {
      const gapPrompt = buildBiographyGapFillingPrompt({
        articleTitle: subjectName,
        extract: fullExtract,
        existingFacts: datedFacts.map(f => `[${f.year}] ${f.details}`),
        undatedFacts: undatedFacts.length > 0 ? undatedFacts.map(f => f.details) : undefined,
        mode: gapFillingMode,
        deathYear: extractedDeathYear,
        emphasis: isLiteProfile(deps)
          ? `МЕТОД РАБОТЫ: перечитай статью РАЗДЕЛ ЗА РАЗДЕЛОМ и сверь каждый раздел со списком выше — всё недостающее выпиши.\n${LITE_DATING_EXAMPLES}`
          : undefined,
      });
      const gapResult = await deps.callModel(
        {
          model: params.deps.model ?? DEFAULT_BIOGRAPHY_MODEL,
          contents: [{ role: 'user', parts: [{ text: gapPrompt }] }],
          config: extractionCallConfig(deps),
        },
        'gap-filling'
      );
      deps.onTokens?.(extractTotalTokens(gapResult));

      // Start from dated facts only; gap-filling returns both new facts and re-dated old ones
      allFacts = [...datedFacts];
      const gapFacts = parseSimpleJsonFacts(collectGeminiResultText(gapResult));
      if (gapFacts.length > 0) {
        allFacts.push(...gapFacts);
      }
      allFacts = deduplicateFacts(allFacts);
      // gap-filling может добавить посмертный мусор — фильтр повторно
      allFacts = filterFactsBeyondDeath(allFacts, extractedDeathYear);
    }
  } catch (error) {
    // Gap-filling is best-effort
    deps.logError?.('gap-filling failed', { error: String(error) });
  }

  // Гард фабрикации годов: аномальный кластер одного года (не-thinking
  // модели сваливают нарративные факты в один год) → год снимается.
  // Размещение ПОСЛЕ gap-filling: промпты не меняются, кэш реплеится.
  const yearGuard = stripFabricatedYearClusters(allFacts);
  allFacts = yearGuard.facts;
  if (yearGuard.yearsStripped > 0) {
    deps.log?.('date guard: год снят с аномального кластера', { yearsStripped: yearGuard.yearsStripped });
  }

  await deps.onStage?.('gap-filling', stageData());
  progress(3, TOTAL_STEPS, 'Добивочный проход (gap-filling)', `${allFacts.length} фактов после добивки`);

  progress(4, TOTAL_STEPS, 'Аннотация и тематизация', `${allFacts.length} фактов`);
  let finalFacts: BiographyFactCandidate[];
  let annotations: Map<number, AnnotationEntry>;
  let redactedCount: number;
  if (deps.mergedMarkup || isLiteProfile(deps)) {
    // BPT-9: один вызов вместо двух
    const merged = await markupBiographyFactsMerged({ deps, subjectName, facts: allFacts });
    finalFacts = merged.facts;
    annotations = merged.annotations;
    redactedCount = merged.redactedCount;
    progress(5, TOTAL_STEPS, 'Редактура и ранжирование', `${finalFacts.length} фактов`);
  } else {
    const annotated = await annotateBiographyFacts({
      deps,
      subjectName,
      facts: allFacts,
    });
    annotations = annotated.annotations;

    progress(5, TOTAL_STEPS, 'Редактура и ранжирование', `${annotated.annotatedFacts.length} фактов`);
    const redacted = await redaktBiographyFacts({
      deps,
      subjectName,
      facts: annotated.annotatedFacts,
      annotations,
    });
    finalFacts = redacted.facts;
    redactedCount = redacted.redactedCount;
  }
  const stepCoverage = {
    factsTotal: finalFacts.length,
    annotated: annotations.size,
    redacted: redactedCount,
  };
  // Гард фиктивных месяцев (после annotation/redaktura — месяцы финальны;
  // в downstream-промптах месяцев нет, кэш реплеится).
  const monthGuard = stripUnreliableMonths(finalFacts);
  const guardedFacts = monthGuard.facts;
  if (monthGuard.monthsStripped > 0) {
    deps.log?.('date guard: месяцы фиктивны (модальный месяц)', { monthsStripped: monthGuard.monthsStripped });
  }
  const dateSanity = {
    monthsStripped: monthGuard.monthsStripped,
    yearsStripped: yearGuard.yearsStripped,
  };
  allFacts = guardedFacts;
  await deps.onStage?.('redaktura', stageData());

  progress(6, TOTAL_STEPS, 'Композиция и визуализация');
  const composition = await composeBiographyFactsIntoTimeline({
    deps,
    subjectName,
    facts: guardedFacts,
  });

  // Convert composition → plan → timeline data
  let timeline: BiographyTimelineData | undefined;
  let plan: BiographyTimelinePlan | undefined;
  let planDiagnostics: BiographyPipelineResult['planDiagnostics'];
  let timelineStats: BiographyPipelineResult['timelineStats'];

  try {
    const rawPlan = buildPlanFromCompositionResult({
      subjectName,
      facts: guardedFacts,
      composition,
    });
    plan = cleanGenericEventLabels({ plan: rawPlan, facts: guardedFacts });

    timeline = buildTimelineDataFromBiographyPlan(plan);

    planDiagnostics = {
      source: 'facts-first',
      mainEvents: plan.mainEvents.length,
      branches: plan.branches.length,
      branchEvents: plan.branches.reduce((sum, b) => sum + b.events.length, 0),
      hasBirthDate: Boolean(plan.birthDetails?.date),
      hasBirthPlace: Boolean(plan.birthDetails?.place),
    };

    timelineStats = {
      nodes: timeline.nodes.length,
      edges: timeline.edges.length,
      hasBirthDate: Boolean(timeline.birthDetails?.date),
      hasBirthPlace: Boolean(timeline.birthDetails?.place),
    };

    deps.log?.('timeline built', {
      mainEvents: plan.mainEvents.length,
      branches: plan.branches.length,
      nodes: timeline.nodes.length,
      edges: timeline.edges.length,
    });
  } catch (error) {
    deps.logError?.('plan/timeline conversion failed — returning facts without timeline', { error: String(error) });
  }

  return {
    wikiPage,
    subjectName,
    rawTextChars: len,
    factsModel,
    stepCoverage,
    dateSanity,
    facts: guardedFacts,
    composition,
    timeline,
    plan,
    planDiagnostics,
    timelineStats,
  };
}
