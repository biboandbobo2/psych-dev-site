import { useState, useEffect, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { signOut, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useAuthStore } from '../../stores/useAuthStore';
import { AuthModal } from './AuthModal';
import { PhoneModal } from './PhoneModal';
import { useUserPhone } from './useUserPhone';
import { BookingContext } from './BookingContext';
import type { BookingStep } from './types';
import { debugError } from '../../lib/debug';
import { ChevronDownIcon } from './icons';

interface BookingLayoutProps {
  children: ReactNode;
  bookingStep?: BookingStep;
}

export function BookingLayout({ children, bookingStep }: BookingLayoutProps) {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  const isStartScreen = location.pathname === '/booking' && (!bookingStep || bookingStep === 'start');
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { phone: userPhone, loading: phoneLoading, refresh: refreshPhone } = useUserPhone();
  const needsPhone = !!user && !phoneLoading && !userPhone;

  // Handle email link sign-in callback (after user clicks magic link)
  useEffect(() => {
    if (!isSignInWithEmailLink(auth, window.location.href)) return;

    let email = window.localStorage.getItem('emailForSignIn');
    if (!email) {
      email = window.prompt('Введите ваш email для подтверждения:');
    }
    if (!email) return;

    signInWithEmailLink(auth, email, window.location.href)
      .then(() => {
        window.localStorage.removeItem('emailForSignIn');
        window.history.replaceState(null, '', '/booking');
      })
      .catch((err) => {
        debugError('[BookingLayout] Email link sign-in error:', err);
      });
  }, []);

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut(auth);
  };

  return (
    <div className="font-dom min-h-screen flex flex-col bg-white text-dom-gray-900">
      <header className="h-[90px] border-b border-dom-gray-200/80 bg-[#f5f7ec] flex items-center px-4 md:px-8 lg:px-12">
        <div className="max-w-[1400px] w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/booking" className="flex-shrink-0">
              <img src="/images/dom-logo.png" alt="DOM" className="w-16 h-16 rounded-full" />
            </Link>
            {isStartScreen && (
              <nav className="hidden sm:flex items-center gap-3">
                <Link
                  to="/booking/photos"
                  className="px-5 py-2.5 rounded-xl text-base font-medium text-dom-gray-700 hover:bg-dom-green/10 hover:text-dom-green transition-all"
                >
                  Фотографии кабинетов
                </Link>
                <Link
                  to="/booking/pricing"
                  className="px-5 py-2.5 rounded-xl text-base font-medium text-dom-gray-700 hover:bg-dom-green/10 hover:text-dom-green transition-all"
                >
                  Стоимость аренды
                </Link>
                <Link
                  to="/home"
                  className="px-5 py-2.5 rounded-xl text-base font-medium text-dom-gray-700 hover:bg-dom-green/10 hover:text-dom-green transition-all"
                >
                  DOM Academy
                </Link>
              </nav>
            )}
          </div>

          {/* Auth section */}
          <div className="relative">
            {user ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-dom-green/5 transition-colors"
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-dom-green/20 flex items-center justify-center text-dom-green font-bold text-sm">
                      {(user.displayName || user.email || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <span className="hidden sm:block text-sm font-medium text-dom-gray-700 max-w-[120px] truncate">
                    {user.displayName || user.email?.split('@')[0]}
                  </span>
                  <ChevronDownIcon className="w-4 h-4 text-dom-gray-500" />
                </button>

                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-dom-gray-200 py-1 z-50">
                      <Link
                        to="/booking/account"
                        className="block px-4 py-2.5 text-sm text-dom-gray-700 hover:bg-dom-cream transition-colors"
                        onClick={() => setMenuOpen(false)}
                      >
                        Мои бронирования
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="w-full text-left px-4 py-2.5 text-sm text-dom-gray-700 hover:bg-dom-cream transition-colors"
                      >
                        Выйти
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-dom-green hover:bg-dom-green-hover text-white text-sm font-medium transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                Войти
              </button>
            )}
          </div>
        </div>
      </header>

      <BookingContext.Provider value={{ userPhone, userPhoneLoading: phoneLoading, bookingStep: bookingStep ?? null }}>
        <main className="flex-1">{children}</main>
      </BookingContext.Provider>

      <footer className="bg-gradient-to-r from-dom-green to-dom-green-hover text-white py-8 px-4 md:px-8 lg:px-12">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/images/dom-logo.png" alt="DOM" className="w-12 h-12 rounded-full" />
            <span className="font-semibold">Психологический центр DOM</span>
          </div>
          <p className="text-white/70 text-sm">
            &copy; {new Date().getFullYear()} Все права защищены
          </p>
        </div>
      </footer>

      {/* Auth modal */}
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />

      {/* Phone modal — shown after first login if no phone */}
      {user && needsPhone && (
        <PhoneModal uid={user.uid} onComplete={() => refreshPhone()} />
      )}
    </div>
  );
}
