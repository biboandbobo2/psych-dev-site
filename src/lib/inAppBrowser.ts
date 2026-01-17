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
