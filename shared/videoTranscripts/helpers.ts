import {
  VIDEO_TRANSCRIPT_STORAGE_PREFIX,
  VIDEO_TRANSCRIPT_VERSION,
  type VideoTranscriptSegment,
} from "./schema.js";

export function buildVideoTranscriptStoragePath(
  youtubeVideoId: string,
  version = VIDEO_TRANSCRIPT_VERSION
) {
  return `${VIDEO_TRANSCRIPT_STORAGE_PREFIX}/${youtubeVideoId}/transcript.v${version}.json`;
}

export function buildTranscriptFullText(segments: VideoTranscriptSegment[]) {
  return segments
    .map((segment) => segment.text.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildTranscriptPreview(fullText: string, maxLength = 280) {
  const normalized = fullText.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return null;
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

export function getTranscriptDurationMs(segments: VideoTranscriptSegment[]) {
  if (!segments.length) {
    return null;
  }

  return segments[segments.length - 1].endMs;
}
