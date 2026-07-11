/**
 * Кэширующий Gemini-клиент для biography benchmark.
 *
 * Ключ кэша: (articleId, шаг pipeline, sha256(model+prompt+config), variant).
 * Сырые ответы модели лежат в fixtures — повторный расчёт метрик и регрессия
 * незатронутых шагов не тратят ни одного токена. Live-вызовы разрешены только
 * явным флагом --live (после одобрения бюджета).
 *
 * variant: 'a' — основной прогон; 'b' — второй прогон для замера стабильности
 * (тот же промпт, независимая генерация).
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { BiographyGenAiClient } from '../../server/api/timelineBiographyPipeline.js';

export const BIOGRAPHY_GEMINI_CACHE_DIR = path.resolve(
  process.cwd(),
  'tests/fixtures/biography/gemini'
);

export type GeminiUsage = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  thoughtsTokenCount?: number;
  totalTokenCount?: number;
};

export type CachedGeminiRecord = {
  step: string;
  model: string;
  variant: string;
  promptSha256: string;
  promptChars: number;
  promptPreview: string;
  responseText: string;
  usage: GeminiUsage | null;
  durationMs: number | null;
  recordedAt: string;
};

export class BiographyGeminiCacheMissError extends Error {
  constructor(articleId: string, step: string) {
    super(
      `Gemini cache miss: article=${articleId} step=${step}. ` +
        'Live-вызовы отключены — запусти suite с --live после одобрения бюджета.'
    );
    this.name = 'BiographyGeminiCacheMissError';
  }
}

function detectStep(prompt: string): string {
  if (prompt.startsWith('Извлеки ВСЕ биографические факты')) return 'extraction';
  if (prompt.startsWith('Ты — второй проход')) return 'gap';
  if (prompt.startsWith('Ты — разметчик')) return 'annotation';
  if (prompt.startsWith('Ты — редактор')) return 'redaktura';
  if (prompt.startsWith('Ты — нарратолог')) return 'composition';
  return 'other';
}

type GenerateRequest = {
  model: string;
  contents: Array<{ role: string; parts: Array<{ text: string }> }>;
  config?: Record<string, unknown>;
};

export type CachingClientStats = {
  hits: number;
  misses: number;
  liveCalls: number;
  totalTokens: number;
  totalDurationMs: number;
  byStep: Record<string, { calls: number; tokens: number }>;
  /** Дневная квота free tier выбита — продолжать прогон бессмысленно. */
  dailyQuotaHit: boolean;
};

export function createEmptyStats(): CachingClientStats {
  return { hits: 0, misses: 0, liveCalls: 0, totalTokens: 0, totalDurationMs: 0, byStep: {}, dailyQuotaHit: false };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callRealGemini(apiKey: string, request: GenerateRequest) {
  const { GoogleGenAI } = await import('@google/genai');
  const client = new GoogleGenAI({ apiKey });
  const maxAttempts = 3;
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await client.models.generateContent(request as never);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      // Дневная квота (RequestsPerDay) не лечится ретраем — фейлим сразу
      if (/PerDay/i.test(message)) {
        throw error;
      }
      if (/429|RESOURCE_EXHAUSTED|quota/i.test(message) && attempt < maxAttempts) {
        process.stderr.write(`  [gemini] 429, retry ${attempt}/${maxAttempts - 1} через 60с\n`);
        await sleep(60_000);
        continue;
      }
      // 503 high demand / транзиентные сетевые сбои — короткий ретрай
      if (/503|UNAVAILABLE|high demand|fetch failed|ECONNRESET|ETIMEDOUT/i.test(message) && attempt < maxAttempts) {
        process.stderr.write(`  [gemini] transient (${message.slice(0, 60)}), retry ${attempt}/${maxAttempts - 1} через 20с\n`);
        await sleep(20_000);
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

function extractText(result: unknown): string {
  if (result && typeof result === 'object') {
    if ('text' in result && typeof (result as { text?: unknown }).text === 'string') {
      return (result as { text: string }).text;
    }
    const candidates = (result as { candidates?: unknown }).candidates;
    if (Array.isArray(candidates)) {
      return candidates
        .flatMap((candidate) => {
          const parts = (candidate as { content?: { parts?: unknown } })?.content?.parts;
          return Array.isArray(parts)
            ? parts.map((part) => (typeof (part as { text?: unknown })?.text === 'string' ? (part as { text: string }).text : ''))
            : [];
        })
        .filter(Boolean)
        .join('\n');
    }
  }
  return '';
}

function extractUsage(result: unknown): GeminiUsage | null {
  const usage = (result as { usageMetadata?: GeminiUsage })?.usageMetadata;
  if (!usage || typeof usage !== 'object') return null;
  const { promptTokenCount, candidatesTokenCount, thoughtsTokenCount, totalTokenCount } = usage;
  return { promptTokenCount, candidatesTokenCount, thoughtsTokenCount, totalTokenCount };
}

export function createCachingBiographyClient(params: {
  articleId: string;
  variant?: 'a' | 'b';
  live: boolean;
  apiKey: string;
  /** Пауза между live-вызовами (free tier: 10 RPM) */
  liveDelayMs?: number;
  cacheDir?: string;
  stats?: CachingClientStats;
  /** Жёсткий потолок живых вызовов (защита бюджета) — при превышении throw. */
  maxLiveCalls?: number;
}): BiographyGenAiClient {
  const variant = params.variant ?? 'a';
  const cacheDir = params.cacheDir ?? BIOGRAPHY_GEMINI_CACHE_DIR;
  const stats = params.stats ?? createEmptyStats();
  const liveDelayMs = params.liveDelayMs ?? 7000;

  return {
    models: {
      generateContent: async (request: GenerateRequest) => {
        const prompt = request.contents[0]?.parts[0]?.text ?? '';
        const step = detectStep(prompt);
        const hash = createHash('sha256')
          .update(JSON.stringify({ model: request.model, prompt, config: request.config ?? {} }))
          .digest('hex');
        const suffix = variant === 'a' ? '' : `-${variant}`;
        const dir = path.join(cacheDir, params.articleId);
        const filePath = path.join(dir, `${step}-${hash.slice(0, 16)}${suffix}.json`);

        const record = ((): CachedGeminiRecord | null => {
          if (!existsSync(filePath)) return null;
          return JSON.parse(readFileSync(filePath, 'utf8')) as CachedGeminiRecord;
        })();

        const stepStats = (stats.byStep[step] ??= { calls: 0, tokens: 0 });
        stepStats.calls += 1;

        if (record) {
          stats.hits += 1;
          stats.totalTokens += record.usage?.totalTokenCount ?? 0;
          stats.totalDurationMs += record.durationMs ?? 0;
          stepStats.tokens += record.usage?.totalTokenCount ?? 0;
          return { text: record.responseText, usageMetadata: record.usage ?? undefined };
        }

        stats.misses += 1;
        if (params.live && params.maxLiveCalls != null && stats.liveCalls >= params.maxLiveCalls) {
          throw new Error(
            `Достигнут потолок live-вызовов (${params.maxLiveCalls}) для ${params.articleId} — прогон остановлен для защиты бюджета.`
          );
        }
        if (!params.live) {
          // Runtime глотает падения отдельных extraction-слайсов — пишем
          // причину в stderr, иначе miss маскируется под «0 facts».
          process.stderr.write(`  [cache-miss] ${params.articleId}/${step} — live-вызовы выключены\n`);
          throw new BiographyGeminiCacheMissError(params.articleId, step);
        }

        await sleep(liveDelayMs);
        const startedAt = Date.now();
        let result: unknown;
        try {
          result = await callRealGemini(params.apiKey, request);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (/PerDay/i.test(message)) {
            stats.dailyQuotaHit = true;
            process.stderr.write(`  [quota] дневной лимит free tier выбит (${params.articleId}/${step})\n`);
          }
          throw error;
        }
        const durationMs = Date.now() - startedAt;

        const responseText = extractText(result);
        const usage = extractUsage(result);
        const newRecord: CachedGeminiRecord = {
          step,
          model: request.model,
          variant,
          promptSha256: hash,
          promptChars: prompt.length,
          promptPreview: prompt.slice(0, 200),
          responseText,
          usage,
          durationMs,
          recordedAt: new Date().toISOString(),
        };
        mkdirSync(dir, { recursive: true });
        writeFileSync(filePath, JSON.stringify(newRecord, null, 2), 'utf8');

        stats.liveCalls += 1;
        stats.totalTokens += usage?.totalTokenCount ?? 0;
        stats.totalDurationMs += durationMs;
        stepStats.tokens += usage?.totalTokenCount ?? 0;

        return { text: responseText, usageMetadata: usage ?? undefined };
      },
    },
  };
}
