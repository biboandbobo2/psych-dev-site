import type { VideoFormEntry } from '../types';

/**
 * Normalizes concepts array, filtering out entries without names
 */
export function normalizeConcepts(
  concepts: Array<{ name: string; url?: string }>
): Array<{ name: string; url?: string }> {
  return concepts
    .map((concept) => {
      const name = concept.name?.trim();
      const url = concept.url?.trim();
      if (!name) return null;
      return url ? { name, url } : { name };
    })
    .filter((concept): concept is { name: string; url?: string } => Boolean(concept));
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
  isPublic: boolean;
}> {
  return videos
    .map((video) => ({
      title: video.title.trim(),
      url: video.url.trim(),
      deckUrl: video.deckUrl.trim(),
      audioUrl: video.audioUrl.trim(),
      isPublic: video.isPublic,
    }))
    .filter((video) => Boolean(video.url));
}

/**
 * Normalizes leisure recommendations (title required, other fields optional)
 */
export function normalizeLeisure(
  items: Array<{ title?: string; url?: string; type?: string; year?: string }>
): Array<{ title: string; url?: string; type?: string; year?: string }> {
  return items
    .map((item) => {
      const title = item.title?.trim();
      const url = item.url?.trim();
      const type = item.type?.trim();
      const year = item.year?.trim();
      if (!title) return null;
      return {
        title,
        ...(url ? { url } : {}),
        ...(type ? { type } : {}),
        ...(year ? { year } : {}),
      };
    })
    .filter((item): item is { title: string; url?: string; type?: string; year?: string } => Boolean(item));
}
