/**
 * Учёт реально проигранных минут видео. Отрезки хранятся плоским массивом
 * [start0, end0, start1, end1, …] в секундах: Firestore не хранит массивы
 * массивов. Отрезки слиты и отсортированы, поэтому пересмотр одного и того же
 * куска не накручивает просмотр, а перемотка в конец его не засчитывает.
 */

/** Максимальная скорость воспроизведения в плеере YouTube. */
const MAX_PLAYBACK_RATE = 2;
/** Запас на дрожание таймера и округления, сек. */
const STEP_TOLERANCE_SEC = 1.5;

/**
 * Прирост позиции похож на обычное воспроизведение, а не на перемотку:
 * за `wallSec` реального времени видео могло уйти вперёд не больше, чем
 * позволяет максимальная скорость. Фоновая вкладка тикает редко, но и там
 * соотношение сохраняется, поэтому прослушивание в фоне засчитывается.
 */
export function isNaturalPlaybackStep(stepSec: number, wallSec: number): boolean {
  return stepSec >= 0 && stepSec <= wallSec * MAX_PLAYBACK_RATE + STEP_TOLERANCE_SEC;
}

type Span = [number, number];

function toPairs(spans: unknown): Span[] {
  if (!Array.isArray(spans)) return [];
  const pairs: Span[] = [];
  for (let index = 0; index + 1 < spans.length; index += 2) {
    const start = spans[index];
    const end = spans[index + 1];
    if (typeof start !== 'number' || typeof end !== 'number') continue;
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    pairs.push([Math.max(0, start), end]);
  }
  return pairs;
}

function mergePairs(pairs: Span[]): number[] {
  const sorted = [...pairs].sort((a, b) => a[0] - b[0]);
  const merged: Span[] = [];
  for (const [start, end] of sorted) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) {
      last[1] = Math.max(last[1], end);
    } else {
      merged.push([start, end]);
    }
  }
  return merged.flat();
}

/** Объединение двух наборов отрезков (разные устройства, local + cloud). */
export function mergeSpans(a: unknown, b: unknown): number[] {
  return mergePairs([...toPairs(a), ...toPairs(b)]);
}

/** Добавляет проигранный отрезок; границы округляются до секунды. */
export function addSpan(spans: unknown, startSec: number, endSec: number): number[] {
  return mergePairs([...toPairs(spans), ...toPairs([Math.round(startSec), Math.round(endSec)])]);
}

/** Сколько секунд видео проиграно хотя бы раз. */
export function coveredSeconds(spans: unknown): number {
  return toPairs(spans).reduce((sum, [start, end]) => sum + (end - start), 0);
}
