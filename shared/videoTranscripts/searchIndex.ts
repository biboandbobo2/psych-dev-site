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

const SEARCH_CHUNK_MAX_SEGMENTS = 4;
const SEARCH_CHUNK_MAX_CHARS = 320;

function normalizeTranscriptSearchText(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

export function formatTranscriptTimestamp(startMs: number) {
  const totalSeconds = Math.max(0, Math.floor(startMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, seconds]
      .map((part) => String(part).padStart(2, "0"))
      .join(":");
  }

  return [minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
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
