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
  const { isInTelegramMobile } = useTelegramBrowser();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isInTelegramMobile && !wasDismissed()) {
      setVisible(true);
    }
  }, [isInTelegramMobile]);

  const handleDismiss = () => {
    setDismissed();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 p-3 sm:hidden">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <span className="text-xl" aria-hidden="true">⚠️</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-900">
              Встроенный браузер
            </p>
            <p className="mt-1 text-sm text-amber-700">
              Для входа через Google откройте сайт в Safari/Chrome:
            </p>
            <p className="mt-2 text-sm font-semibold text-amber-900">
              <span className="inline-block rounded bg-gray-200 px-1.5 py-0.5 font-mono text-gray-800">⋯</span> → «Открыть в Safari»
            </p>
            <button
              type="button"
              onClick={handleDismiss}
              className="mt-3 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm text-amber-700"
            >
              Понятно
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
