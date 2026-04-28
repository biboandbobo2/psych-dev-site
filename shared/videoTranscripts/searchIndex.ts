import type {
  TranscriptImportResult,
  TranscriptImportTarget,
  VideoReference,
} from "./importTypes.js";
import {
  VIDEO_TRANSCRIPT_SEARCH_VERSION,
  type VideoTranscriptSearchChunk,
  type VideoTranscriptSearchChunkDocShape,
  type VideoTranscriptSearchDocShape,
  type VideoTranscriptSegment,
} from "./schema.js";
import { formatTimestampMs } from "../formatTimestamp.js";

const SEARCH_CHUNK_MAX_SEGMENTS = 4;
const SEARCH_CHUNK_MAX_CHARS = 320;

export const TRANSCRIPT_TOKEN_MIN_LENGTH = 3;

const TRANSCRIPT_STOP_WORDS_LIST = [
  "and", "or", "the", "a", "an", "of", "in", "on", "at", "to", "for", "with", "by", "from", "as",
  "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did",
  "will", "would", "could", "should", "may", "might", "must", "can", "this", "that", "these",
  "those", "it", "its",
  "и", "в", "на", "с", "по", "для", "из", "к", "о", "об", "от", "до", "за", "при", "во", "не",
  "как", "что", "это", "или", "но", "а", "же", "ли", "бы", "его", "её", "их", "то", "все",
  "вся", "всё",
] as const;

export const TRANSCRIPT_STOP_WORDS: ReadonlySet<string> = new Set(TRANSCRIPT_STOP_WORDS_LIST);

function normalizeTranscriptSearchText(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Generates prefix tokens from normalized text for indexed search.
 * Each word ≥ 3 chars (and not a stop-word) is expanded to all its prefixes
 * of length 3..fullWordLength. Result is deduplicated.
 *
 * Example: "психология фрейда" → ["пси", "псих", "психо", ..., "психология",
 *                                   "фре", "фрей", "фрейд", "фрейда"]
 */
export function buildSearchTokens(normalizedText: string): string[] {
  const tokens = new Set<string>();
  const words = normalizedText.toLowerCase().split(/[^a-zа-яё0-9]+/u);

  for (const word of words) {
    if (word.length < TRANSCRIPT_TOKEN_MIN_LENGTH) continue;
    if (TRANSCRIPT_STOP_WORDS.has(word)) continue;
    for (let len = TRANSCRIPT_TOKEN_MIN_LENGTH; len <= word.length; len += 1) {
      tokens.add(word.slice(0, len));
    }
  }

  return Array.from(tokens);
}

export function formatTranscriptTimestamp(startMs: number) {
  return formatTimestampMs(startMs) ?? "00:00";
}

function buildChunkText(segments: VideoTranscriptSegment[]) {
  return segments
    .map((segment) => segment.text.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function finalizeSearchChunk(
  segments: VideoTranscriptSegment[],
  chunkIndex: number
): VideoTranscriptSearchChunk | null {
  if (!segments.length) {
    return null;
  }

  const text = buildChunkText(segments);
  if (!text) {
    return null;
  }

  const startMs = segments[0].startMs;
  const endMs = segments[segments.length - 1].endMs;

  return {
    chunkIndex,
    endMs,
    normalizedText: normalizeTranscriptSearchText(text),
    segmentCount: segments.length,
    startMs,
    text,
    timestampLabel: formatTranscriptTimestamp(startMs),
  };
}

function shouldStartNewChunk(
  currentSegments: VideoTranscriptSegment[],
  nextSegment: VideoTranscriptSegment
) {
  if (currentSegments.length >= SEARCH_CHUNK_MAX_SEGMENTS) {
    return true;
  }

  const currentTextLength = buildChunkText(currentSegments).length;
  const nextTextLength = nextSegment.text.replace(/\s+/g, " ").trim().length;

  return currentTextLength + nextTextLength + 1 > SEARCH_CHUNK_MAX_CHARS;
}

export function buildTranscriptSearchChunks(segments: VideoTranscriptSegment[]) {
  const chunks: VideoTranscriptSearchChunk[] = [];
  let currentSegments: VideoTranscriptSegment[] = [];

  segments.forEach((segment) => {
    if (!segment.text.trim()) {
      return;
    }

    if (currentSegments.length > 0 && shouldStartNewChunk(currentSegments, segment)) {
      const chunk = finalizeSearchChunk(currentSegments, chunks.length);
      if (chunk) {
        chunks.push(chunk);
      }
      currentSegments = [];
    }

    currentSegments.push(segment);
  });

  const lastChunk = finalizeSearchChunk(currentSegments, chunks.length);
  if (lastChunk) {
    chunks.push(lastChunk);
  }

  return chunks;
}

export function buildTranscriptSearchReferenceKey(reference: VideoReference, referenceIndex: number) {
  return `${reference.courseId}::${reference.lessonId}::${referenceIndex}`;
}

export function buildTranscriptSearchParentDoc<TTimestamp>(
  target: TranscriptImportTarget,
  chunkCount: number,
  now: TTimestamp
): VideoTranscriptSearchDocShape<TTimestamp> {
  return {
    youtubeVideoId: target.youtubeVideoId,
    chunkCount,
    referenceCount: target.references.length,
    updatedAt: now,
    version: VIDEO_TRANSCRIPT_SEARCH_VERSION,
  };
}

export function buildTranscriptSearchChunkDocs<TTimestamp>(
  target: TranscriptImportTarget,
  transcript: TranscriptImportResult,
  now: TTimestamp
) {
  const chunks = buildTranscriptSearchChunks(transcript.segments);
  const parentDoc = buildTranscriptSearchParentDoc(
    target,
    chunks.length * target.references.length,
    now
  );

  const docs = target.references.flatMap((reference, referenceIndex) => {
    const referenceKey = buildTranscriptSearchReferenceKey(reference, referenceIndex);

    return chunks.map((chunk) => ({
      id: `${referenceKey}::${chunk.chunkIndex}`,
      data: {
        youtubeVideoId: target.youtubeVideoId,
        referenceKey,
        courseId: reference.courseId,
        periodId: reference.lessonId,
        periodTitle: reference.lessonTitle,
        lectureTitle: reference.title,
        sourcePath: reference.sourcePath,
        sourceUrl: reference.url,
        chunkIndex: chunk.chunkIndex,
        startMs: chunk.startMs,
        endMs: chunk.endMs,
        timestampLabel: chunk.timestampLabel,
        segmentCount: chunk.segmentCount,
        text: chunk.text,
        normalizedText: chunk.normalizedText,
        searchTokens: buildSearchTokens(chunk.normalizedText),
        updatedAt: now,
        version: VIDEO_TRANSCRIPT_SEARCH_VERSION,
      } satisfies VideoTranscriptSearchChunkDocShape<TTimestamp>,
    }));
  });

  return {
    chunks,
    docs,
    parentDoc,
  };
}
