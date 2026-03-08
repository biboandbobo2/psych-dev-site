import {
  VIDEO_TRANSCRIPT_STORAGE_PREFIX,
  VIDEO_TRANSCRIPT_VERSION,
  type VideoTranscriptSegment,
} from '../types/videoTranscripts';

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
]);

function parseUrl(value: string): URL | null {
  try {
    return new URL(value.trim());
  } catch {
    return null;
  }
}

export function getYouTubeVideoId(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  const url = parseUrl(trimmed);
  if (!url || !YOUTUBE_HOSTS.has(url.hostname)) {
    return null;
  }

  if (url.hostname === 'youtu.be') {
    return url.pathname.replace(/\//g, '') || null;
  }

  if (url.pathname.startsWith('/watch')) {
    return url.searchParams.get('v');
  }

  if (url.pathname.startsWith('/embed/')) {
    return url.pathname.split('/')[2] || null;
  }

  if (url.pathname.startsWith('/shorts/') || url.pathname.startsWith('/live/')) {
    return url.pathname.split('/')[2] || null;
  }

  return null;
}

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
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildTranscriptPreview(fullText: string, maxLength = 280) {
  const normalized = fullText.replace(/\s+/g, ' ').trim();
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
