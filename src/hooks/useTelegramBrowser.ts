import { useMemo } from 'react';
import { isMobileDevice, isInAppBrowser } from '../lib/inAppBrowser';

export function useTelegramBrowser() {
  const isInApp = useMemo(() => isInAppBrowser(), []);
  const isMobile = useMemo(() => isMobileDevice(), []);
  const isInTelegramMobile = isInApp && isMobile;

  return {
    isTelegram: isInApp,
    isMobile,
    isInTelegramMobile,
  };
}
