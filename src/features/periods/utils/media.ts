import { getYouTubeVideoIdFromUrl, isYouTubeHost } from '../../../lib/youtube';

export const ensureUrl = (value: unknown): URL | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
};

const parseTimeParam = (raw: string | null): string | undefined => {
  if (!raw) return undefined;
  if (/^\d+$/.test(raw)) return raw;
  const match = raw.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/i);
  if (!match) return undefined;
  const [, hours, minutes, seconds] = match;
  const total =
    (Number(hours ?? 0) || 0) * 3600 +
    (Number(minutes ?? 0) || 0) * 60 +
    (Number(seconds ?? 0) || 0);
  return total ? String(total) : undefined;
};

export const buildYoutubeEmbedUrl = (rawValue: string) => {
  const url = ensureUrl(rawValue);
  if (!url) return '';

  const host = url.hostname.replace(/^www\./, '');
  if (host === 'youtube.com' && url.pathname.startsWith('/embed/')) {
    return url.toString();
  }

  const videoId = getYouTubeVideoIdFromUrl(url);

  // Если есть playlist параметр, но нет video ID - это ссылка только на плейлист
  // YouTube не позволяет встраивать плейлисты без конкретного видео
  const playlistId = url.searchParams.get('list');
  if (!videoId && playlistId) {
    // Возвращаем пустую строку - VideoSection покажет ссылку на плейлист
    return '';
  }

  if (!videoId) return '';

  const params = new URLSearchParams();
  if (playlistId) params.set('list', playlistId);
  if (url.searchParams.has('si')) params.set('si', url.searchParams.get('si') ?? '');

  const start = url.searchParams.get('start') ?? parseTimeParam(url.searchParams.get('t'));
  if (start) params.set('start', start);

  if (!params.has('feature')) params.set('feature', 'oembed');
  if (!params.has('rel')) params.set('rel', '0');
  params.set('modestbranding', '1');
  params.set('playsinline', '1');

  const query = params.toString();
  return `https://www.youtube.com/embed/${videoId}${query ? `?${query}` : ''}`;
};

export const isUrlString = (value: string) => Boolean(ensureUrl(value));

export const normalizeVideoEntry = (entry: unknown) => {
  if (!entry) {
    return {
      title: 'Видео-лекция',
      embedUrl: '',
      originalUrl: '',
      isYoutube: false,
      deckUrl: '',
      audioUrl: '',
    };
  }

  if (typeof entry === 'string') {
    const trimmed = entry.trim();
    const parsedUrl = ensureUrl(trimmed);
    return {
      title: 'Видео-лекция',
      embedUrl: buildYoutubeEmbedUrl(trimmed),
      originalUrl: trimmed,
      isYoutube: Boolean(parsedUrl && isYouTubeHost(parsedUrl.hostname)),
      deckUrl: '',
      audioUrl: '',
    };
  }

  const rawUrl = typeof (entry as any).url === 'string' ? (entry as any).url.trim() : '';
  const parsedUrl = ensureUrl(rawUrl);
  return {
    title: (entry as any).title ?? 'Видео-лекция',
    embedUrl: buildYoutubeEmbedUrl(rawUrl),
    originalUrl: rawUrl,
    isYoutube: Boolean(parsedUrl && isYouTubeHost(parsedUrl.hostname)),
    deckUrl: typeof (entry as any).deckUrl === 'string' ? (entry as any).deckUrl.trim() : '',
    audioUrl: typeof (entry as any).audioUrl === 'string' ? (entry as any).audioUrl.trim() : '',
  };
};
