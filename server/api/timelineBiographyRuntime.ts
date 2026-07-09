import type { VercelRequest } from '@vercel/node';
import { debugError, debugLog } from '../../src/lib/debug.js';
import { getLectureGenAiClient } from '../../api/_lib/lectureApiRuntime.js';
import {
  runBiographyPipelineCore,
  type BiographyGenAiClient,
  type BiographyProgressCallback,
} from './timelineBiographyPipeline.js';
import type {
  BiographyCompositionResult,
  BiographyExtractionMode,
  BiographyFactCandidate,
  BiographyImportRequest,
  BiographyTimelineData,
  WikipediaPageExtract,
} from './timelineBiographyTypes.js';

// ---------------------------------------------------------------------------
// Gemini client injection: бенчмарки и тесты подменяют фабрику клиента
// (кэширование ответов / фейковый клиент), прод-путь использует
// getLectureGenAiClient как раньше.
// ---------------------------------------------------------------------------

let genAiClientFactoryOverride: ((apiKey: string) => BiographyGenAiClient) | null = null;

export function setBiographyGenAiClientFactory(
  factory: ((apiKey: string) => BiographyGenAiClient) | null
) {
  genAiClientFactoryOverride = factory;
}

function resolveGenAiClient(apiKey: string): BiographyGenAiClient {
  return genAiClientFactoryOverride ? genAiClientFactoryOverride(apiKey) : getLectureGenAiClient(apiKey);
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
// Payload
// ---------------------------------------------------------------------------

export type BiographyExtractorSuccessPayload = {
  ok: true;
  sourceUrl: string;
  canvasName?: string;
  facts: BiographyFactCandidate[];
  timeline?: BiographyTimelineData;
  meta: {
    factCount: number;
    extractionMode: BiographyExtractionMode;
    model: string;
    promptVersion: string;
    rawTextChars: number;
    strategy: 'url-context' | 'google-search-grounding';
    groundingSources: Array<{ title?: string; uri?: string }>;
    urlContextMetadata: Array<{ retrievedUrl?: string; urlRetrievalStatus?: string }>;
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
    /** B6: покрытие TSV-разметки (annotation/redaktura деградируют молча). */
    stepCoverage?: {
      factsTotal: number;
      annotated: number;
      redacted: number;
    };
    /** Сработки гардов датировочной фабрикации. */
    dateSanity?: {
      monthsStripped: number;
      yearsStripped: number;
    };
  };
  subjectName: string | null;
  composition?: BiographyCompositionResult;
};

// ---------------------------------------------------------------------------
// Entry points (automation endpoints, бенчмарки, тесты)
// ---------------------------------------------------------------------------

async function runBiographyTwoPass(params: {
  sourceUrl: string;
  apiKey: string;
  onProgress?: BiographyProgressCallback;
  page?: WikipediaPageExtract;
  model?: string;
  extractionEmphasis?: string;
  mergedMarkup?: boolean;
  structuredExtraction?: boolean;
  tuningProfile?: 'lite';
}): Promise<BiographyExtractorSuccessPayload> {
  const client = resolveGenAiClient(params.apiKey);

  const result = await runBiographyPipelineCore({
    sourceUrl: params.sourceUrl,
    page: params.page,
    deps: {
      callModel: (request) => client.models.generateContent(request),
      model: params.model,
      extractionEmphasis: params.extractionEmphasis,
      mergedMarkup: params.mergedMarkup,
      structuredExtraction: params.structuredExtraction,
      tuningProfile: params.tuningProfile,
      onProgress: params.onProgress,
      log: (message, data) => debugLog(`[timeline-biography] ${message}`, data),
      logError: (message, data) => debugError(`[timeline-biography] ${message}`, data),
    },
  });

  return {
    ok: true,
    sourceUrl: params.sourceUrl,
    canvasName: result.subjectName,
    subjectName: result.subjectName,
    facts: result.facts,
    timeline: result.timeline,
    composition: result.composition,
    meta: {
      factCount: result.facts.length,
      extractionMode: 'two-pass' as BiographyExtractionMode,
      model: `${result.factsModel} -> annotation -> redaktura -> composition -> render`,
      promptVersion: 'two-pass-v6',
      rawTextChars: result.rawTextChars,
      strategy: 'two-pass-plaintext' as 'url-context',
      groundingSources: [],
      urlContextMetadata: [],
      planDiagnostics: result.planDiagnostics,
      timelineStats: result.timelineStats,
      stepCoverage: result.stepCoverage,
      dateSanity: result.dateSanity,
    },
  };
}

export async function runBiographyImport(params: {
  sourceUrl: string;
  apiKey: string;
  onProgress?: BiographyProgressCallback;
  /** Pre-fetched страница (fixtures в бенчмарках/тестах) — сеть не трогается. */
  page?: WikipediaPageExtract;
  /** Переопределение модели (бенчмарк-миграция); по умолчанию 2.5-flash. */
  model?: string;
  /** Тюнинг полноты извлечения (бенчмарк-эксперименты). */
  extractionEmphasis?: string;
  /** BPT-9 (за флагом): объединённая разметка одним вызовом. */
  mergedMarkup?: boolean;
  /** Structured output extraction/gap (за флагом). */
  structuredExtraction?: boolean;
  /** Прод-профиль тюнинга не-thinking моделей (весь стек одним флагом). */
  tuningProfile?: 'lite';
}): Promise<BiographyExtractorSuccessPayload> {
  return runBiographyTwoPass(params);
}

export async function runBiographyFactExtraction(params: {
  sourceUrl: string;
  apiKey: string;
  extractionMode?: BiographyExtractionMode;
  page?: WikipediaPageExtract;
}): Promise<BiographyExtractorSuccessPayload> {
  return runBiographyTwoPass(params);
}
