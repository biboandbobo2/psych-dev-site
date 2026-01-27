import type { VideoFormEntry } from '../types';

/**
 * Creates an empty video entry with default values
 */
export function createEmptyVideoEntry(seed: number, defaultTitle: string): VideoFormEntry {
  return {
    id: `video-${seed}-${Date.now()}`,
    title: defaultTitle,
    url: '',
    deckUrl: '',
    audioUrl: '',
    isPublic: false,
  };
}

/**
 * Creates a video entry from a source object (handles various field name formats)
 */
export function createVideoEntryFromSource(
  source: any,
  index: number,
  fallbackTitle: string
): VideoFormEntry {
  const rawTitle =
    (typeof source?.title === 'string' && source.title.trim()) ||
    (typeof source?.label === 'string' && source.label.trim()) ||
    fallbackTitle;
  const rawUrl =
    (typeof source?.url === 'string' && source.url.trim()) ||
    (typeof source?.videoUrl === 'string' && source.videoUrl.trim()) ||
    '';
  const rawDeck =
    (typeof source?.deckUrl === 'string' && source.deckUrl.trim()) ||
    (typeof source?.deck_url === 'string' && source.deck_url.trim()) ||
    '';
  const rawAudio =
    (typeof source?.audioUrl === 'string' && source.audioUrl.trim()) ||
    (typeof source?.audio_url === 'string' && source.audio_url.trim()) ||
    '';

  return {
    id: `video-${index}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: rawTitle,
    url: rawUrl,
    deckUrl: rawDeck,
    audioUrl: rawAudio,
    isPublic: Boolean(source?.isPublic),
  };
}

/**
 * Normalizes YouTube URL to embed format
 */
export function normalizeEmbedUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (!trimmed.includes('youtube.com') && !trimmed.includes('youtu.be')) return trimmed;
  if (trimmed.includes('embed/')) return trimmed;
  if (trimmed.includes('watch?v=')) return trimmed.replace('watch?v=', 'embed/');
  return trimmed;
}
