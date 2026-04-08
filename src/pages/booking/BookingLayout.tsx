import '@fontsource-variable/sofia-sans';
import type { ReactNode } from 'react';

interface BookingLayoutProps {
  children: ReactNode;
}

export function BookingLayout({ children }: BookingLayoutProps) {
  return (
    <div className="font-dom min-h-screen flex flex-col bg-white text-dom-gray-900">
      <header className="h-[90px] border-b border-dom-gray-200/80 bg-[#f5f7ec] flex items-center px-4 md:px-8 lg:px-12">
        <div className="max-w-[1400px] w-full mx-auto flex items-center justify-between">
          <a href="/booking" className="flex items-center gap-3">
            <img
              src="/images/dom-logo.png"
              alt="DOM"
              className="w-16 h-16 rounded-full"
            />
            <span className="hidden sm:block text-xl font-semibold text-dom-gray-900">
              Аренда кабинетов
            </span>
          </a>
          <nav className="hidden md:flex items-center gap-6">
            <a
              href="/booking"
              className="text-dom-gray-700 hover:text-dom-green transition-colors duration-150"
            >
              Бронирование
            </a>
            <a
              href="#events"
              className="text-dom-gray-700 hover:text-dom-green transition-colors duration-150"
            >
              Мероприятия
            </a>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-gradient-to-r from-dom-green to-dom-green-hover text-white py-8 px-4 md:px-8 lg:px-12">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/images/dom-logo.png"
              alt="DOM"
              className="w-12 h-12 rounded-full"
            />
            <span className="font-semibold">Психологический центр ДОМ</span>
          </div>
          <p className="text-white/70 text-sm">
            &copy; {new Date().getFullYear()} Все права защищены
          </p>
        </div>
      </footer>
    </div>
  );
}
