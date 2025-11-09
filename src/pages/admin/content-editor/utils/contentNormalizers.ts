import type { VideoFormEntry, ListItem } from '../types';

/**
 * Normalizes concepts array by trimming and filtering empty strings
 */
export function normalizeConcepts(concepts: string[]): string[] {
  return concepts.map((concept) => concept.trim()).filter(Boolean);
}

/**
 * Normalizes authors array, filtering out entries without names
 */
export function normalizeAuthors(
  authors: Array<{ name: string; url?: string }>
): Array<{ name: string; url?: string }> {
  return authors
    .map((author) => {
      const name = author.name?.trim();
      const url = author.url?.trim();
      if (!name) return null;
      return url ? { name, url } : { name };
    })
    .filter((author): author is { name: string; url?: string } => Boolean(author));
}

/**
 * Normalizes literature list, filtering out entries without both title and URL
 */
export function normalizeLiterature(
  items: Array<{ title: string; url: string }>
): Array<{ title: string; url: string }> {
  return items
    .map((item) => {
      const title = item.title?.trim();
      const url = item.url?.trim();
      if (!title || !url) return null;
      return { title, url };
    })
    .filter((item): item is { title: string; url: string } => Boolean(item));
}

/**
 * Normalizes video playlist, filtering out entries without URLs
 */
export function normalizeVideos(
  videos: VideoFormEntry[]
): Array<{
  title: string;
  url: string;
  deckUrl: string;
  audioUrl: string;
}> {
  return videos
    .map((video) => ({
      title: video.title.trim(),
      url: video.url.trim(),
      deckUrl: video.deckUrl.trim(),
      audioUrl: video.audioUrl.trim(),
    }))
    .filter((video) => Boolean(video.url));
}
