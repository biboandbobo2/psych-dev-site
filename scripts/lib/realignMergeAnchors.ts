import { TRANSCRIPT_STOP_WORDS } from '../../shared/videoTranscripts/searchIndex';
import type {
  FwV3Line,
  MergeParagraph,
} from './manualTranscriptConverter';

export interface RealignOptions {
  /** Окно поиска в fw-v3 вокруг старого anchor'а (сек). По умолчанию 60. */
  searchRadiusSec?: number;
  /** Сколько fw-v3 строк объединять в окно для сравнения. По умолчанию 5. */
  windowFwLines?: number;
  /** Сколько первых значимых токенов абзаца использовать для матчинга. */
  paragraphProbeTokens?: number;
  /** Минимальный overlap (число совпавших токенов), при котором обновляем anchor. */
  minOverlap?: number;
}

export interface RealignDiagnostics {
  paragraphCount: number;
  updatedCount: number;
  skippedShort: number;
  skippedLowOverlap: number;
  shiftStats: {
    avgAbsSec: number;
    maxAbsSec: number;
    p95AbsSec: number;
  };
}

const MIN_TOKEN_LEN = 4;

function meaningfulTokens(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.toLowerCase().split(/[^a-zа-яё0-9]+/u)) {
    if (raw.length < MIN_TOKEN_LEN) continue;
    if (TRANSCRIPT_STOP_WORDS.has(raw)) continue;
    out.push(raw);
  }
  return out;
}

function buildWindowTokens(
  fwLines: FwV3Line[],
  startIndex: number,
  windowSize: number
): Set<string> {
  const set = new Set<string>();
  const end = Math.min(fwLines.length, startIndex + windowSize);
  for (let i = startIndex; i < end; i += 1) {
    for (const t of meaningfulTokens(fwLines[i].text)) {
      set.add(t);
    }
  }
  return set;
}

function countOverlap(probe: string[], windowTokens: Set<string>): number {
  let overlap = 0;
  // Уникальные probe-токены — повторы внутри короткого зачина бесполезны.
  const seen = new Set<string>();
  for (const t of probe) {
    if (seen.has(t)) continue;
    seen.add(t);
    if (windowTokens.has(t)) overlap += 1;
  }
  return overlap;
}

/**
 * Для каждого paragraph находит точный fw-v3-таймкод по token-overlap его
 * первых ~10 значимых слов с окном fw-v3 строк около предполагаемого anchor'а.
 * Возвращает новый массив paragraph'ов и диагностику.
 *
 * Логика:
 *   1. Берём probe = первые N значимых токенов абзаца.
 *   2. Берём fw-v3 строки в окне ±searchRadiusSec от старого anchor'а.
 *   3. Для каждой кандидат-строки строим набор токенов из неё + следующих
 *      windowFwLines-1 соседей. Считаем overlap с probe.
 *   4. Выбираем кандидат с максимальным overlap; при равенстве — ближайший
 *      к старому anchor'у (страхует от ложных матчей в повторяющихся фразах).
 *   5. Если overlap ≥ minOverlap — обновляем anchor; иначе оставляем как был.
 */
export function realignMergeAnchors(
  paragraphs: MergeParagraph[],
  fwLines: FwV3Line[],
  options: RealignOptions = {}
): { paragraphs: MergeParagraph[]; diagnostics: RealignDiagnostics } {
  const radius = options.searchRadiusSec ?? 60;
  const windowSize = options.windowFwLines ?? 5;
  const probeSize = options.paragraphProbeTokens ?? 10;
  const minOverlap = options.minOverlap ?? 3;

  const updated: MergeParagraph[] = [];
  const shifts: number[] = [];
  let skippedShort = 0;
  let skippedLowOverlap = 0;

  for (const p of paragraphs) {
    const probe = meaningfulTokens(p.text).slice(0, probeSize);
    if (probe.length < minOverlap) {
      skippedShort += 1;
      updated.push(p);
      continue;
    }

    let bestOverlap = 0;
    let bestAnchor = p.anchorSec;
    let bestDelta = Number.POSITIVE_INFINITY;

    for (let i = 0; i < fwLines.length; i += 1) {
      const line = fwLines[i];
      const delta = line.startSec - p.anchorSec;
      if (Math.abs(delta) > radius) continue;
      const winTokens = buildWindowTokens(fwLines, i, windowSize);
      const overlap = countOverlap(probe, winTokens);
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        bestAnchor = line.startSec;
        bestDelta = Math.abs(delta);
      } else if (overlap === bestOverlap && overlap > 0) {
        // Равные overlap — выбираем ближайший к старому anchor'у:
        // меньше шанс ложно матчиться на повторе через несколько минут.
        const absDelta = Math.abs(delta);
        if (absDelta < bestDelta) {
          bestAnchor = line.startSec;
          bestDelta = absDelta;
        }
      }
    }

    if (bestOverlap < minOverlap) {
      skippedLowOverlap += 1;
      updated.push(p);
      continue;
    }

    if (bestAnchor !== p.anchorSec) {
      shifts.push(Math.abs(bestAnchor - p.anchorSec));
    }
    updated.push({ ...p, anchorSec: bestAnchor });
  }

  const updatedCount = shifts.length;
  shifts.sort((a, b) => a - b);
  const avgAbsSec =
    updatedCount > 0
      ? shifts.reduce((s, v) => s + v, 0) / updatedCount
      : 0;
  const maxAbsSec = updatedCount > 0 ? shifts[shifts.length - 1] : 0;
  const p95AbsSec =
    updatedCount > 0
      ? shifts[Math.min(shifts.length - 1, Math.floor(shifts.length * 0.95))]
      : 0;

  return {
    paragraphs: updated,
    diagnostics: {
      paragraphCount: paragraphs.length,
      updatedCount,
      skippedShort,
      skippedLowOverlap,
      shiftStats: { avgAbsSec, maxAbsSec, p95AbsSec },
    },
  };
}
