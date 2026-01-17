import { useEffect, useState, useCallback } from 'react';
import { isMobileDevice, isTelegramInAppBrowser } from '../lib/inAppBrowser';

function getCurrentUrl() {
  if (typeof window === 'undefined') return '';
  return window.location.href;
}

export default function TelegramOpenInBrowser() {
  const [showPrompt, setShowPrompt] = useState(false);

  const handleOpen = useCallback(() => {
    const url = getCurrentUrl();
    if (!url) return;
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) {
      // Fallback: keep the prompt so user can use the in-app menu to open in Safari/Chrome.
      setShowPrompt(true);
    }
  }, []);

  useEffect(() => {
    if (!isMobileDevice() || !isTelegramInAppBrowser()) return;
    setShowPrompt(true);
    // Try opening immediately; if blocked, user can tap the button.
    handleOpen();
  }, [handleOpen]);

  if (!showPrompt) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-6 sm:hidden">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-center shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">Откройте в браузере</h2>
        <p className="mt-2 text-sm text-gray-600">
          Встроенный браузер Telegram часто блокирует вход через Google.
          Откройте страницу в Safari/Chrome, чтобы авторизоваться.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleOpen}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Открыть в браузере
          </button>
          <button
            type="button"
            onClick={() => setShowPrompt(false)}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700"
          >
            Продолжить здесь
          </button>
        </div>
      </div>
    </div>
  );
}
