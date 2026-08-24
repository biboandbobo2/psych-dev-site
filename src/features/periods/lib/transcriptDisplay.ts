import type { VideoTranscriptSegment } from '../../../types/videoTranscripts';

/**
 * YouTube-каптии режут речь на реплики по 2–3 секунды — тысячи микрокарточек
 * нечитаемы и тяжелы для DOM. Склеиваем подряд идущие сегменты в абзацы:
 * новый абзац начинается на паузе в речи или когда абзац набрал целевую длину.
 * Ручные транскрипты (длинные сегменты) проходят без изменений — каждый
 * сегмент сам больше целевой длины.
 */
const PARAGRAPH_TARGET_CHARS = 300;
const PARAGRAPH_GAP_MS = 3000;

export function groupTranscriptSegments(
  segments: VideoTranscriptSegment[]
): VideoTranscriptSegment[] {
  const groups: VideoTranscriptSegment[] = [];
  let current: VideoTranscriptSegment | null = null;

  for (const segment of segments) {
    const continuesParagraph =
      current !== null &&
      current.text.length < PARAGRAPH_TARGET_CHARS &&
      segment.startMs - current.endMs < PARAGRAPH_GAP_MS;

    if (current && continuesParagraph) {
      current = {
        ...current,
        endMs: segment.endMs,
        durationMs: segment.endMs - current.startMs,
        text: `${current.text} ${segment.text}`.replace(/\s+/g, ' ').trim(),
      };
    } else {
      if (current) {
        groups.push(current);
      }
      current = { ...segment };
    }
  }

  if (current) {
    groups.push(current);
  }

  return groups;
}
