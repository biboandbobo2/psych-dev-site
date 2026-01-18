export function isMobileDevice(userAgent?: string) {
  const ua = userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent || '' : '');
  if (!ua) return false;
  return /iP(hone|od|ad)|Android/.test(ua);
}

export function isTelegramInAppBrowser(userAgent?: string) {
  const ua = userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent || '' : '');
  if (!ua) return false;
  return /Telegram/i.test(ua);
}

export type ExternalOpenResult =
  | 'shared'
  | 'copied'
  | 'opened'
  | 'blocked'
  | 'cancelled'
  | 'unavailable';

export async function requestExternalBrowserOpen(url?: string): Promise<ExternalOpenResult> {
  if (typeof window === 'undefined') return 'unavailable';
  const targetUrl = url || window.location.href;
  if (!targetUrl) return 'unavailable';

  if (navigator.share) {
    try {
      await navigator.share({ url: targetUrl });
      return 'shared';
    } catch (error) {
      const name = (error as { name?: string })?.name;
      if (name === 'AbortError') {
        return 'cancelled';
      }
    }
  }

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(targetUrl);
      return 'copied';
    } catch {
      // Ignore clipboard failures and try opening a new tab.
    }
  }

  const opened = window.open(targetUrl, '_blank', 'noopener,noreferrer');
  return opened ? 'opened' : 'blocked';
}
