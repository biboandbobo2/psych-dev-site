import { ensureUrl } from './media';

export interface YouTubePlayerConfig {
  playerVars: Record<string, number | string>;
  videoId: string;
}

export function parseYouTubeEmbedConfig(embedUrl: string): YouTubePlayerConfig | null {
  const url = ensureUrl(embedUrl);
  if (!url || !url.pathname.startsWith('/embed/')) {
    return null;
  }

  const videoId = url.pathname.replace('/embed/', '').trim();
  if (!videoId) {
    return null;
  }

  const playerVars: Record<string, number | string> = {
    playsinline: 1,
    rel: 0,
    modestbranding: 1,
  };

  const start = url.searchParams.get('start');
  if (start && /^\d+$/.test(start)) {
    playerVars.start = Number(start);
  }

  const list = url.searchParams.get('list');
  if (list) {
    playerVars.list = list;
  }

  return {
    playerVars,
    videoId,
  };
}

export function isYouTubePausedState(state: number | null | undefined) {
  return state !== 1;
}
