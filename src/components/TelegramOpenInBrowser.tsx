import { useEffect, useState, useCallback, useMemo } from 'react';
import { isMobileDevice, isTelegramInAppBrowser } from '../lib/inAppBrowser';
import { logClientEvent, formatClientLog, clearClientLog } from '../lib/clientLog';

function getCurrentUrl() {
  if (typeof window === 'undefined') return '';
  return window.location.href;
}

export default function TelegramOpenInBrowser() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [logVisible, setLogVisible] = useState(false);
  const isTelegram = useMemo(() => isTelegramInAppBrowser(), []);
  const isMobile = useMemo(() => isMobileDevice(), []);

  const handleOpen = useCallback(() => {
    const url = getCurrentUrl();
    if (!url) return;
    logClientEvent('telegram.open_attempt', { url });
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) {
      logClientEvent('telegram.open_blocked');
      // Fallback: keep the prompt so user can use the in-app menu to open in Safari/Chrome.
      setShowPrompt(true);
    }
  }, []);

  useEffect(() => {
    if (!isMobile || !isTelegram) return;
    logClientEvent('telegram.detected', {
      ua: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    });
    setShowPrompt(true);
    // Try opening immediately; if blocked, user can tap the button.
    handleOpen();
  }, [handleOpen, isMobile, isTelegram]);

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
          <button
            type="button"
            onClick={() => setLogVisible((prev) => !prev)}
            className="text-xs text-gray-500 underline"
          >
            {logVisible ? 'Скрыть диагностику' : 'Показать диагностику'}
          </button>
        </div>
        {logVisible && (
          <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-left">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-600">Лог попыток</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const text = formatClientLog();
                    if (navigator.clipboard?.writeText) {
                      navigator.clipboard.writeText(text);
                    }
                  }}
                  className="text-xs text-blue-600"
                >
                  Скопировать
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearClientLog();
                    logClientEvent('telegram.log_cleared');
                    setLogVisible(false);
                  }}
                  className="text-xs text-gray-500"
                >
                  Очистить
                </button>
              </div>
            </div>
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-[11px] text-gray-600">
              {formatClientLog() || 'лог пуст'}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
