import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { SITE_NAME } from '../routes';

export default function BookingPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 py-8">
      <Helmet>
        <title>Бронирование кабинетов — {SITE_NAME}</title>
        <meta
          name="description"
          content="Бронирование кабинетов в психологическом центре «Дом» в Тбилиси — партнёр Академии Дом."
        />
      </Helmet>

      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6B7A8D]">Партнёр</p>
        <h1 className="text-3xl font-black leading-tight text-[#1F2F46] sm:text-4xl">
          Бронирование кабинетов
        </h1>
        <p className="text-sm text-[#556476]">
          Психологический центр «Дом» в Тбилиси — партнёр Академии Дом. Здесь можно провести очную
          сессию или арендовать кабинет для работы с клиентами.
        </p>
      </header>

      <section className="rounded-2xl border border-dashed border-[#DDE5EE] bg-[#F9FBFF] p-6 text-center">
        <p className="text-lg font-semibold text-[#2C3E50]">Страница бронирования скоро появится</p>
        <p className="mt-2 text-sm text-[#6B7A8D]">
          Мы объединяем сайт Академии Дом с сервисом бронирования центра. Пока можно связаться
          напрямую через форму обратной связи или написать в Telegram.
        </p>
        <Link
          to="/home"
          className="mt-4 inline-flex items-center justify-center rounded-xl bg-[#3359CB] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2A49A8]"
        >
          Вернуться на главную
        </Link>
      </section>
    </div>
  );
}
