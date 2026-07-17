/**
 * Типы и модельные константы biography pipeline (контракт runBiographyPipelineCore).
 * Вынесено из timelineBiographyPipeline.ts без изменения логики; публичная
 * поверхность по-прежнему реэкспортируется из pipeline-модуля.
 */
import type {
  BiographyCompositionResult,
  BiographyFactCandidate,
  BiographyTimelineData,
  BiographyTimelinePlan,
  WikipediaPageExtract,
} from './timelineBiographyTypes.js';

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
