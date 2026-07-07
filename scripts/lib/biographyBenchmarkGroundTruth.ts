/**
 * Ground truth для biography benchmark: ключевые факты каждой биографии
 * с годом и матчерами. Матчер `article` валидирует, что факт реально есть
 * в тексте статьи (fixture); `timeline` — что он представлен на таймлайне.
 *
 * Заполняется по мере курирования; статьи без ground truth участвуют только
 * в структурных метриках (coverage = null).
 */
import type { BiographyBenchmarkFact } from './biographyBenchmarks';

export const biographyBenchmarkGroundTruth: Record<string, BiographyBenchmarkFact[]> = {};
