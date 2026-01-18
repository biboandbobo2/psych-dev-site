import { useState, useCallback, useMemo } from 'react';
import {
  isMobileDevice,
  isTelegramInAppBrowser,
  requestExternalBrowserOpen,
  type ExternalOpenResult,
} from '../lib/inAppBrowser';

type OpenResultNotice = {
  type: 'info' | 'success' | 'warning';
  message: string;
};

function getNoticeForResult(result: ExternalOpenResult): OpenResultNotice {
  switch (result) {
    case 'shared':
      return {
        type: 'info',
        message: 'Откройте ссылку в Safari/Chrome через меню «Поделиться».',
      };
    case 'copied':
      return {
        type: 'success',
        message: 'Ссылка скопирована. Откройте Safari/Chrome и вставьте её в адресную строку.',
      };
    case 'opened':
      return {
        type: 'info',
        message: 'Если страница всё ещё в Telegram, откройте её через меню ⋯ → «Открыть в Safari/Chrome».',
      };
    case 'cancelled':
      return {
        type: 'warning',
        message: 'Открытие отменено. Можно открыть страницу через меню ⋯ в Telegram.',
      };
    case 'blocked':
      return {
        type: 'warning',
        message: 'Не удалось открыть браузер. В меню ⋯ выберите «Открыть в Safari/Chrome».',
      };
    default:
      return {
        type: 'warning',
        message: 'Не удалось открыть браузер. Попробуйте открыть ссылку в Safari/Chrome вручную.',
      };
  }
}

export function useTelegramBrowser() {
  const [notice, setNotice] = useState<OpenResultNotice | null>(null);
  const isTelegram = useMemo(() => isTelegramInAppBrowser(), []);
  const isMobile = useMemo(() => isMobileDevice(), []);
  const isInTelegramMobile = isTelegram && isMobile;

  const openInBrowser = useCallback(async (url?: string) => {
    if (typeof window === 'undefined') return;
    const targetUrl = url || window.location.href;
    setNotice(null);
    const result = await requestExternalBrowserOpen(targetUrl);
    setNotice(getNoticeForResult(result));
    return result;
  }, []);

  const clearNotice = useCallback(() => {
    setNotice(null);
  }, []);

  return {
    isTelegram,
    isMobile,
    isInTelegramMobile,
    notice,
    openInBrowser,
    clearNotice,
  };
}
