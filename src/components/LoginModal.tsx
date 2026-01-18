import { useState } from "react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../lib/firebase";
import { debugError } from "../lib/debug";
import { useTelegramBrowser } from "../hooks/useTelegramBrowser";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Преобразует код ошибки Firebase в понятное сообщение
 */
function getErrorMessage(error: any): string {
  const code = error?.code || '';
  const message = error?.message || '';

  // Проверяем на internal assertion error (баг Firebase SDK)
  if (message.includes('INTERNAL ASSERTION FAILED')) {
    return 'Произошла ошибка соединения. Обновите страницу и попробуйте снова.';
  }

  switch (code) {
    case 'auth/popup-closed-by-user':
      return 'Окно авторизации было закрыто. Попробуйте ещё раз.';
    case 'auth/popup-blocked':
      return 'Всплывающее окно заблокировано браузером. Разрешите всплывающие окна для этого сайта.';
    case 'auth/network-request-failed':
      return 'Проблема с сетью. Проверьте интернет-соединение и попробуйте снова.';
    case 'auth/cancelled-popup-request':
      return 'Запрос авторизации был отменён. Попробуйте ещё раз.';
    case 'auth/user-cancelled':
      return 'Авторизация отменена. Попробуйте ещё раз.';
    case 'auth/account-exists-with-different-credential':
      return 'Аккаунт с этим email уже существует с другим способом входа.';
    case 'auth/invalid-credential':
      return 'Неверные учётные данные. Попробуйте ещё раз.';
    case 'auth/operation-not-allowed':
      return 'Этот способ входа временно недоступен.';
    case 'auth/timeout':
      return 'Время ожидания истекло. Проверьте соединение и попробуйте снова.';
    default:
      // Если сообщение содержит "network" или "connection"
      if (message.toLowerCase().includes('network') || message.toLowerCase().includes('connection')) {
        return 'Проблема с сетью. Проверьте интернет-соединение и попробуйте снова.';
      }
      return 'Не удалось войти. Попробуйте ещё раз или обновите страницу.';
  }
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isInTelegramMobile, notice, openInBrowser } = useTelegramBrowser();

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);

      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);

      onClose();
    } catch (err: any) {
      debugError("Login error:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    handleGoogleSignIn();
  };

  const handleOpenInBrowser = async () => {
    setError(null);
    await openInBrowser();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      ></div>

      <div className="relative bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4 z-10">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
          aria-label="Закрыть модальное окно"
        >
          ×
        </button>

        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Вход в систему</h2>
          <p className="text-gray-600 mb-6">
            Войдите через Google, чтобы получить доступ к личному кабинету
          </p>

          {/* Активное предупреждение для Telegram */}
          {isInTelegramMobile && (
            <div className="mb-6 rounded-xl border-2 border-red-200 bg-red-50 p-4 text-left">
              <div className="flex items-start gap-3">
                <span className="text-xl" aria-hidden="true">🚫</span>
                <div className="flex-1">
                  <p className="font-semibold text-red-900">
                    Вход невозможен в браузере Telegram
                  </p>
                  <p className="mt-1 text-sm text-red-700">
                    Google блокирует авторизацию во встроенных браузерах. Откройте сайт в Safari или Chrome.
                  </p>
                  {notice && (
                    <p className="mt-2 text-sm font-medium text-blue-700">
                      {notice.message}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleOpenInBrowser}
                    className="mt-3 w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Открыть в браузере
                  </button>
                  <p className="mt-2 text-xs text-red-600">
                    Или нажмите ⋯ → «Открыть в Safari/Chrome»
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {loading ? "Вход..." : "Войти через Google"}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800 mb-3">{error}</p>
              <button
                onClick={handleRetry}
                disabled={loading}
                className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
              >
                Попробовать снова
              </button>
            </div>
          )}

          <p className="mt-6 text-xs text-gray-500">
            При входе вы соглашаетесь с условиями использования сервиса
          </p>
        </div>
      </div>
    </div>
  );
}
