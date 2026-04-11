import '@fontsource-variable/sofia-sans';
import { useState, useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { signOut, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { useAuthStore } from '../../stores/useAuthStore';
import { AuthModal } from './AuthModal';
import { PhoneModal } from './PhoneModal';
import { debugError } from '../../lib/debug';

interface BookingLayoutProps {
  children: ReactNode;
}

export function BookingLayout({ children }: BookingLayoutProps) {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  const isMainPage = location.pathname === '/booking';
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [phone, setPhone] = useState<string | null>(null);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [needsPhone, setNeedsPhone] = useState(false);

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

  // Check if user has phone in Firestore
  useEffect(() => {
    if (!user) {
      setPhone(null);
      setNeedsPhone(false);
      return;
    }
    setPhoneLoading(true);
    getDoc(doc(db, 'users', user.uid)).then((snap) => {
      const data = snap.data();
      if (data?.phone) {
        setPhone(data.phone);
        setNeedsPhone(false);
      } else {
        setPhone(null);
        setNeedsPhone(true);
      }
    }).finally(() => setPhoneLoading(false));
  }, [user]);

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut(auth);
  };

  return (
    <div className="font-dom min-h-screen flex flex-col bg-white text-dom-gray-900">
      <header className="h-[90px] border-b border-dom-gray-200/80 bg-[#f5f7ec] flex items-center px-4 md:px-8 lg:px-12">
        <div className="max-w-[1400px] w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/booking" className="flex-shrink-0">
              <img src="/images/dom-logo.png" alt="DOM" className="w-16 h-16 rounded-full" />
            </a>
            {isMainPage && (
              <nav className="hidden sm:flex items-center gap-3">
                <a
                  href="/booking/photos"
                  className="px-5 py-2.5 rounded-xl text-base font-medium text-dom-gray-700 hover:bg-dom-green/10 hover:text-dom-green transition-all"
                >
                  Фотографии кабинетов
                </a>
                <a
                  href="/booking/pricing"
                  className="px-5 py-2.5 rounded-xl text-base font-medium text-dom-gray-700 hover:bg-dom-green/10 hover:text-dom-green transition-all"
                >
                  Стоимость аренды
                </a>
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
                  <svg className="w-4 h-4 text-dom-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-dom-gray-200 py-1 z-50">
                      <a
                        href="/booking/account"
                        className="block px-4 py-2.5 text-sm text-dom-gray-700 hover:bg-dom-cream transition-colors"
                        onClick={() => setMenuOpen(false)}
                      >
                        Мои бронирования
                      </a>
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

      <main className="flex-1">{children}</main>

      <footer className="bg-gradient-to-r from-dom-green to-dom-green-hover text-white py-8 px-4 md:px-8 lg:px-12">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/images/dom-logo.png" alt="DOM" className="w-12 h-12 rounded-full" />
            <span className="font-semibold">Психологический центр ДОМ</span>
          </div>
          <p className="text-white/70 text-sm">
            &copy; {new Date().getFullYear()} Все права защищены
          </p>
        </div>
      </footer>

      {/* Auth modal */}
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />

      {/* Phone modal — shown after first login if no phone */}
      {user && needsPhone && !phoneLoading && (
        <PhoneModal uid={user.uid} onComplete={(p) => { setPhone(p); setNeedsPhone(false); }} />
      )}
    </div>
  );
}
