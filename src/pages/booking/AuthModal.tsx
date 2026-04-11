import { useState } from 'react';
import { signInWithPopup, signInWithCustomToken, sendSignInLinkToEmail } from 'firebase/auth';
import { auth, googleProvider } from '../../lib/firebase';
import { debugError } from '../../lib/debug';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthTab = 'login' | 'register';

function getErrorMessage(error: unknown): string {
  const err = error as { code?: string; message?: string };
  const code = err?.code || '';
  if (err?.message?.includes('INTERNAL ASSERTION FAILED')) {
    return 'Ошибка соединения. Обновите страницу.';
  }
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
    case 'auth/user-cancelled':
      return 'Авторизация отменена.';
    case 'auth/popup-blocked':
      return 'Всплывающее окно заблокировано. Разрешите popup для этого сайта.';
    case 'auth/email-already-in-use':
      return 'Этот email уже зарегистрирован. Перейдите на вкладку «Вход».';
    case 'auth/invalid-email':
      return 'Некорректный email.';
    case 'auth/invalid-action-code':
      return 'Ссылка для входа недействительна или уже использована.';
    case 'auth/expired-action-code':
      return 'Ссылка для входа истекла. Запросите новую.';
    case 'auth/operation-not-allowed':
      return 'Этот способ входа временно недоступен.';
    default:
      return 'Произошла ошибка. Попробуйте ещё раз.';
  }
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [tab, setTab] = useState<AuthTab>('login');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  if (!isOpen) return null;

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      onClose();
    } catch (err) {
      debugError('[AuthModal] Google sign-in error:', err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'loginByEmail', email }),
      });
      const json = await res.json();
      if (!json.success) {
        if (json.error === 'USER_NOT_FOUND') {
          setError('Email не зарегистрирован. Перейдите на вкладку «Регистрация».');
          return;
        }
        if (json.error === 'EMAIL_NOT_VERIFIED') {
          setError('Email не подтверждён. Зарегистрируйтесь заново — мы отправим ссылку для подтверждения.');
          return;
        }
        throw new Error(json.error || 'Login failed');
      }
      await signInWithCustomToken(auth, json.data.token);
      onClose();
    } catch (err) {
      debugError('[AuthModal] Email login error:', err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await sendSignInLinkToEmail(auth, email, {
        url: `${window.location.origin}/booking`,
        handleCodeInApp: true,
      });
      window.localStorage.setItem('emailForSignIn', email);
      setLinkSent(true);
    } catch (err) {
      debugError('[AuthModal] Email register error:', err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full px-4 py-3 rounded-xl border border-dom-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-dom-green/30 focus:border-dom-green';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <div className="flex justify-end">
          <button onClick={onClose} className="text-dom-gray-500 hover:text-dom-gray-900 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <h2 className="text-2xl font-bold text-dom-gray-900 text-center mb-6">
          {tab === 'login' ? 'Войти' : 'Регистрация'}
        </h2>

        {linkSent ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-dom-green/10 mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-dom-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-dom-gray-700 font-medium mb-2">Письмо отправлено!</p>
            <p className="text-dom-gray-500 text-sm mb-4">
              Проверьте почту <strong>{email}</strong> и перейдите по ссылке для входа.
            </p>
            <button onClick={onClose} className="text-dom-green hover:text-dom-green-hover font-medium text-sm">
              Закрыть
            </button>
          </div>
        ) : (
          <>
            {/* Google sign-in */}
            <button
              onClick={handleGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-dom-gray-200 hover:border-dom-gray-300 hover:bg-dom-cream transition-all text-sm font-medium text-dom-gray-700 mb-4"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Войти через Google
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-dom-gray-200" />
              <span className="text-xs text-dom-gray-500">или по email</span>
              <div className="flex-1 h-px bg-dom-gray-200" />
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 bg-dom-cream rounded-lg p-1">
              <button
                onClick={() => { setTab('login'); setError(''); }}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${tab === 'login' ? 'bg-white text-dom-gray-900 shadow-sm' : 'text-dom-gray-500'}`}
              >
                Вход
              </button>
              <button
                onClick={() => { setTab('register'); setError(''); }}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${tab === 'register' ? 'bg-white text-dom-gray-900 shadow-sm' : 'text-dom-gray-500'}`}
              >
                Регистрация
              </button>
            </div>

            <form onSubmit={tab === 'login' ? handleEmailLogin : handleEmailRegister} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                className={inputClass}
              />
              {error && <p className="text-dom-red text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-dom-green hover:bg-dom-green-hover text-white font-medium text-sm transition-all disabled:opacity-50"
              >
                {loading ? 'Подождите...' : tab === 'login' ? 'Войти' : 'Отправить ссылку'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
