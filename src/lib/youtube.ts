const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'youtu.be',
  'm.youtube.com',
  'music.youtube.com',
  'www.youtube.com',
]);

export function isYouTubeHost(hostname: string) {
  return YOUTUBE_HOSTS.has(hostname.trim().toLowerCase());
}

export function getYouTubeVideoIdFromUrl(url: URL | null) {
  if (!url || !isYouTubeHost(url.hostname)) {
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

export function getYouTubeVideoId(value: unknown) {
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

  try {
    return getYouTubeVideoIdFromUrl(new URL(trimmed));
  } catch {
    return null;
  }
}
