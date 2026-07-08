/**
 * CI quality gate для biography pipeline: реплей на кэшированных ответах
 * Gemini (tests/fixtures/biography/gemini) — 0 токенов, полностью
 * детерминированно.
 *
 * Контракт: для каждой статьи с полным кэшем pipeline обязан выдавать
 * структурно валидный таймлайн (инварианты I1–I13), ноль правок
 * normalizeImportedTimelineData и полное покрытие critical-фактов.
 *
 * При изменении промптов кэш-ключи меняются и статья выпадает из проверки
 * (cache miss) — это осознанный механизм: изменение промпта обязано
 * сопровождаться пере-снятием benchmark'а (--live после одобрения бюджета),
 * иначе гейт упадёт по «0 проверяемых статей».
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

import {
  runBiographyImport,
  setBiographyGenAiClientFactory,
} from '../../server/api/timelineBiographyRuntime.js';
import type { WikipediaPageExtract } from '../../server/api/timelineBiographyTypes.js';
import { buildArticleMetrics, type ArticleMetrics } from '../../scripts/lib/biographyBenchmarkMetrics';
import {
  BiographyGeminiCacheMissError,
  createCachingBiographyClient,
  createEmptyStats,
} from '../../scripts/lib/biographyGeminiCache';
import { biographyBenchmarkSet } from '../../scripts/lib/biographyBenchmarkSet';

const WIKI_DIR = path.resolve(__dirname, '../fixtures/biography/wiki');
const GEMINI_CACHE_DIR = path.resolve(__dirname, '../fixtures/biography/gemini');

function hasCache(articleId: string) {
  const dir = path.join(GEMINI_CACHE_DIR, articleId);
  return existsSync(dir) && readdirSync(dir).length >= 4;
}

async function replayArticle(articleId: string): Promise<ArticleMetrics | 'cache-incomplete'> {
  const entry = biographyBenchmarkSet.find((e) => e.id === articleId)!;
  const page = JSON.parse(
    readFileSync(path.join(WIKI_DIR, `${articleId}.json`), 'utf8')
  ) as WikipediaPageExtract;
  const stats = createEmptyStats();
  setBiographyGenAiClientFactory(() =>
    createCachingBiographyClient({ articleId, live: false, apiKey: 'cache-only', stats })
  );
  try {
    const payload = await runBiographyImport({ sourceUrl: entry.sourceUrl, apiKey: 'cache-only', page });
    if (stats.misses > 0) return 'cache-incomplete';
    return buildArticleMetrics({ entry, payload, stats, wallClockMs: 0 });
  } catch (error) {
    if (error instanceof BiographyGeminiCacheMissError || stats.misses > 0) return 'cache-incomplete';
    throw error;
  } finally {
    setBiographyGenAiClientFactory(null);
  }
}

describe('biography pipeline quality gates (кэш, 0 токенов)', () => {
  const cachedArticles = biographyBenchmarkSet.filter((e) => hasCache(e.id)).map((e) => e.id);
  const verified: string[] = [];

  it('есть хотя бы одна статья с полным кэшем', () => {
    expect(cachedArticles.length).toBeGreaterThan(0);
  });

  for (const articleId of cachedArticles) {
    it(`${articleId}: структурные гейты и critical-факты`, async () => {
      const metrics = await replayArticle(articleId);
      if (metrics === 'cache-incomplete') {
        // Статья начата, но кэш неполный (прерванный live-прогон) — не гейтим
        return;
      }

      // Инварианты I1/I12/I13 и «normalize ничего не правит» — жёсткие нули
      expect(metrics.structure.referentialViolations, 'referentialViolations').toBe(0);
      expect(metrics.structure.duplicateIds, 'duplicateIds').toBe(0);
      expect(metrics.structure.eventsOutsideBranchWindow, 'eventsOutsideBranchWindow').toBe(0);
      expect(metrics.structure.sharedXOverlappingLanes, 'sharedXOverlappingLanes').toBe(0);
      expect(metrics.structure.normalizeEdits.total, 'normalizeEdits').toBe(0);

      // Полнота: критические факты ground truth — все; общее покрытие ≥ 90%
      if (metrics.coverage) {
        expect(metrics.coverage.criticalMatched, 'criticalMatched').toBe(metrics.coverage.criticalFacts);
        expect(
          metrics.coverage.timelineMatched / metrics.coverage.totalFacts,
          `coverage ${metrics.coverage.timelineMatched}/${metrics.coverage.totalFacts}`
        ).toBeGreaterThanOrEqual(0.9);
      }

      // Читаемость: generic-лейблов событий не больше 2 на статью
      expect(metrics.labels.genericNodeLabels, 'genericNodeLabels').toBeLessThanOrEqual(2);

      verified.push(articleId);
    }, 30_000);
  }

  afterAll(() => {
    // Изменение промптов инвалидирует кэш — гейт обязан проверять хоть что-то
    expect(verified.length, 'ни одна статья не прошла реплей — пере-сними benchmark').toBeGreaterThan(0);
  });
});
