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

const extractYoutubeId = (url: URL | null) => {
  if (!url) return null;
  const host = url.hostname.replace(/^www\./, '');
  if (host === 'youtu.be') {
    return url.pathname.replace(/\//g, '');
  }
  if (['youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(host)) {
    if (url.pathname.startsWith('/embed/')) {
      const [, , videoId] = url.pathname.split('/');
      return videoId || null;
    }
    if (url.pathname.startsWith('/watch')) {
      return url.searchParams.get('v');
    }
    if (url.pathname.startsWith('/shorts/') || url.pathname.startsWith('/live/')) {
      const [, , videoId] = url.pathname.split('/');
      return videoId || null;
    }
  }
  return null;
};

export const buildYoutubeEmbedUrl = (rawValue: string) => {
  const url = ensureUrl(rawValue);
  if (!url) return '';

  const host = url.hostname.replace(/^www\./, '');
  if (host === 'youtube.com' && url.pathname.startsWith('/embed/')) {
    return url.toString();
  }

  const videoId = extractYoutubeId(url);
  if (!videoId) return '';

  const params = new URLSearchParams();
  if (url.searchParams.has('list')) params.set('list', url.searchParams.get('list') ?? '');
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
    return {
      title: 'Видео-лекция',
      embedUrl: buildYoutubeEmbedUrl(trimmed),
      originalUrl: trimmed,
      isYoutube: Boolean(ensureUrl(trimmed)?.hostname.includes('youtu')),
      deckUrl: '',
      audioUrl: '',
    };
  }

  const rawUrl = typeof (entry as any).url === 'string' ? (entry as any).url.trim() : '';
  return {
    title: (entry as any).title ?? 'Видео-лекция',
    embedUrl: buildYoutubeEmbedUrl(rawUrl),
    originalUrl: rawUrl,
    isYoutube: Boolean(ensureUrl(rawUrl)?.hostname.includes('youtu')),
    deckUrl: typeof (entry as any).deckUrl === 'string' ? (entry as any).deckUrl.trim() : '',
    audioUrl: typeof (entry as any).audioUrl === 'string' ? (entry as any).audioUrl.trim() : '',
  };
};
