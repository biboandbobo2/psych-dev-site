import { useEffect, useState } from 'react';
import { useTelegramBrowser } from '../hooks/useTelegramBrowser';

const STORAGE_KEY = 'psd:telegramBannerDismissed';

function wasDismissed(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) === '1';
}

function setDismissed(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, '1');
}

export default function TelegramOpenInBrowser() {
  const { isInTelegramMobile, notice, openInBrowser, clearNotice } = useTelegramBrowser();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isInTelegramMobile && !wasDismissed()) {
      setVisible(true);
    }
  }, [isInTelegramMobile]);

  const handleDismiss = () => {
    setDismissed();
    setVisible(false);
    clearNotice();
  };

  const handleOpen = async () => {
    await openInBrowser();
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 p-3 sm:hidden">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <span className="text-xl" aria-hidden="true">⚠️</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-900">
              Браузер Telegram
            </p>
            <p className="mt-1 text-sm text-amber-700">
              Вход через Google может не работать. Для авторизации откройте сайт в Safari/Chrome.
            </p>
            {notice && (
              <p className="mt-2 text-sm font-medium text-blue-700">
                {notice.message}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleOpen}
                className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white"
              >
                Открыть в браузере
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm text-amber-700"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
