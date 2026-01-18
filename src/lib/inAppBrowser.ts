export function isMobileDevice(userAgent?: string) {
  const ua = userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent || '' : '');
  if (!ua) return false;
  return /iP(hone|od|ad)|Android/.test(ua);
}

export function isTelegramInAppBrowser(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';

  // Telegram Android добавляет "Telegram" в user agent
  if (/Telegram/i.test(ua)) return true;

  // Telegram iOS: проверяем наличие TelegramWebviewProxy
  if ('TelegramWebviewProxy' in window) return true;

  // Telegram iOS также может иметь специфичный WebKit без Safari
  // и иметь характерные признаки in-app браузера
  const isIOS = /iP(hone|od|ad)/.test(ua);
  const isWebKit = /AppleWebKit/.test(ua);
  const isSafari = /Safari/.test(ua);
  const isChrome = /CriOS/.test(ua);
  const isFirefox = /FxiOS/.test(ua);

  // iOS WebKit без Safari/Chrome/Firefox = in-app браузер (Telegram, Instagram, etc.)
  if (isIOS && isWebKit && !isSafari && !isChrome && !isFirefox) return true;

  return false;
}

export function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';

  // Telegram
  if (isTelegramInAppBrowser()) return true;

  // Instagram
  if (/Instagram/i.test(ua)) return true;

  // Facebook
  if (/FBAN|FBAV/i.test(ua)) return true;

  // Другие in-app браузеры на iOS (WebKit без Safari)
  const isIOS = /iP(hone|od|ad)/.test(ua);
  const isWebKit = /AppleWebKit/.test(ua);
  const isSafari = /Safari/.test(ua);
  const isChrome = /CriOS/.test(ua);
  const isFirefox = /FxiOS/.test(ua);

  if (isIOS && isWebKit && !isSafari && !isChrome && !isFirefox) return true;

  return false;
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
