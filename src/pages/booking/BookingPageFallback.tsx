import { Skeleton } from '../../components/ui/Skeleton';

export function BookingPageFallback() {
  return (
    <div className="font-dom min-h-screen flex flex-col bg-white text-dom-gray-900">
      <header className="h-[90px] border-b border-dom-gray-200/80 bg-[#f5f7ec] flex items-center px-4 md:px-8 lg:px-12">
        <div className="max-w-[1400px] w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/images/dom-logo.png" alt="DOM" className="w-16 h-16 rounded-full" />
            <nav className="hidden sm:flex items-center gap-3">
              <span className="px-5 py-2.5 rounded-xl text-base font-medium text-dom-gray-700">Фотографии кабинетов</span>
              <span className="px-5 py-2.5 rounded-xl text-base font-medium text-dom-gray-700">Стоимость аренды</span>
            </nav>
          </div>
          <div className="px-5 py-2.5 rounded-xl bg-dom-green text-white text-sm font-medium">Войти</div>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-12 md:py-16">
          <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12">
            <div className="text-center mb-10">
              <h1 className="text-3xl md:text-4xl font-bold text-dom-gray-900 leading-tight">
                Забронировать кабинет
              </h1>
              <p className="mt-3 text-dom-gray-500 text-lg">Подготавливаем экран бронирования</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
              {[0, 1].map((card) => (
                <div key={card} className="rounded-2xl p-8 border-2 border-dom-gray-200 shadow-brand bg-white">
                  <Skeleton className="w-14 h-14 mb-5 rounded-xl bg-dom-green/10" />
                  <Skeleton className="h-7 w-40 mb-3" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 md:py-16 bg-white">
          <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-dom-gray-900">Расписание</h2>
              <p className="mt-1 text-sm text-dom-gray-500">Подгружаем ближайшие свободные слоты</p>
            </div>
            <div className="rounded-2xl border border-dom-gray-200 shadow-brand bg-dom-cream/40 p-4 md:p-6">
              <Skeleton className="h-[420px] w-full rounded-2xl" />
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gradient-to-r from-dom-green to-dom-green-hover text-white py-8 px-4 md:px-8 lg:px-12">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/images/dom-logo.png" alt="DOM" className="w-12 h-12 rounded-full" />
            <span className="font-semibold">Психологический центр ДОМ</span>
          </div>
          <p className="text-white/70 text-sm">&copy; {new Date().getFullYear()} Все права защищены</p>
        </div>
      </footer>
    </div>
  );
}
