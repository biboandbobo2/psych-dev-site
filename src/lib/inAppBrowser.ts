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
