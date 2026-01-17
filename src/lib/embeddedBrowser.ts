export function isEmbeddedMobileBrowser(userAgent?: string) {
  const ua = userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent || '' : '');
  if (!ua) return false;

  const isIOS = /iP(hone|od|ad)/.test(ua);
  const isAndroid = /Android/.test(ua);
  const isMobile = isIOS || isAndroid;

  const isWebViewIOS = isIOS && /AppleWebKit/.test(ua) && !/(Safari|CriOS|FxiOS|OPiOS|EdgiOS)/.test(ua);
  const isWebViewAndroid = isAndroid && /\bwv\b/.test(ua);
  const isInAppBrowser = /FBAN|FBAV|Instagram|Line|Twitter|Telegram|WhatsApp|Snapchat|TikTok|GSA|Pinterest|LinkedIn|Reddit|Discord/.test(ua);

  return isMobile && (isWebViewIOS || isWebViewAndroid || isInAppBrowser);
}

export function isMobileDevice(userAgent?: string) {
  const ua = userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent || '' : '');
  if (!ua) return false;
  return /iP(hone|od|ad)|Android/.test(ua);
}
