import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { BookingLayout } from './BookingLayout';
import { ROOMS } from './types';

interface PricingPageProps {
  embedded?: boolean;
}

const thClass = 'px-4 py-3 text-left text-sm font-semibold text-dom-gray-900 bg-dom-cream';
const tdClass = 'px-4 py-3 text-sm text-dom-gray-700 border-t border-dom-gray-200';

export function PricingPage({ embedded = false }: PricingPageProps) {
  const content = (
    <>
      <Helmet>
        <title>Бронирование кабинетов — Психологический центр DOM</title>
      </Helmet>

      <div className="max-w-[900px] mx-auto px-4 md:px-8 py-12">
        <h1 className="text-3xl font-bold text-dom-gray-900 mb-10">Стоимость аренды</h1>

        {/* Кабинеты */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-dom-gray-900 mb-4">Кабинеты</h2>
          <div className="overflow-x-auto rounded-xl border border-dom-gray-200">
            <table className="w-full">
              <thead>
                <tr>
                  <th className={thClass} />
                  <th className={thClass}>1 час</th>
                  <th className={thClass}>1,5 часа</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={tdClass}>Индивидуальная практика (любой кабинет)</td>
                  <td className={tdClass}>25 gel</td>
                  <td className={tdClass}>35 gel</td>
                </tr>
                <tr>
                  <td className={tdClass}>Группы, пары, дети (Бордовый или Лазурный)</td>
                  <td className={tdClass}>30 gel</td>
                  <td className={tdClass}>45 gel</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Абонементы */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-dom-gray-900 mb-2">Абонементы</h2>
          <p className="text-sm text-dom-gray-500 mb-4">Любой кабинет, любой формат работы. Приобретается в начале месяца.</p>
          <div className="overflow-x-auto rounded-xl border border-dom-gray-200">
            <table className="w-full">
              <thead>
                <tr>
                  <th className={thClass}>Часов в месяц</th>
                  <th className={thClass}>Цена</th>
                  <th className={thClass}>За час</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={tdClass}>6</td>
                  <td className={tdClass}>135 gel</td>
                  <td className={tdClass}>22,5 gel</td>
                </tr>
                <tr>
                  <td className={tdClass}>12</td>
                  <td className={tdClass}>240 gel</td>
                  <td className={tdClass}>20 gel</td>
                </tr>
                <tr>
                  <td className={tdClass}>24</td>
                  <td className={tdClass}>420 gel</td>
                  <td className={tdClass}>17,5 gel</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Счастливые часы */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-dom-gray-900 mb-2">Счастливые часы</h2>
          <p className="text-sm text-dom-gray-500 mb-4">Будни 9:00–14:00, выходные 18:00–22:00</p>
          <div className="rounded-xl border border-dom-gray-200 bg-dom-cream/50 p-5">
            <p className="text-dom-gray-700">
              <span className="font-semibold">10 часов в месяц</span> — 150 gel
              <span className="text-dom-gray-500 ml-2">(15 gel/ч)</span>
            </p>
          </div>
        </section>

        {/* Зал */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-dom-gray-900 mb-4">Зал для мероприятий</h2>
          <div className="overflow-x-auto rounded-xl border border-dom-gray-200">
            <table className="w-full">
              <thead>
                <tr>
                  <th className={thClass}>Часов</th>
                  <th className={thClass}>Цена</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['1', '45 gel'],
                  ['3', '100 gel'],
                  ['5', '150 gel'],
                  ['10', '270 gel'],
                  ['20', '500 gel'],
                ].map(([hours, price]) => (
                  <tr key={hours}>
                    <td className={tdClass}>{hours}</td>
                    <td className={tdClass}>{price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-dom-gray-500 mt-3">
            Оборудование (проектор, микрофон, колонки) — +30 gel
          </p>
        </section>

        {/* CTA */}
        <div className="mt-10">
          <p className="text-center text-dom-gray-500 text-sm mb-4">Забронировать кабинет</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {ROOMS.map((room) => (
              <Link
                key={room.id}
                to={`/booking?room=${room.id}`}
                className="flex items-center gap-2 px-5 py-3 bg-dom-green hover:bg-dom-green-hover text-white rounded-xl font-medium transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: room.color, border: '2px solid rgba(255,255,255,0.5)' }} />
                {room.name.replace(' кабинет', '')}
              </Link>
            ))}
          </div>
          <div className="text-center mt-5">
            <a
              href="https://t.me/PsyDom_Tbilisi_administrator"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 border border-dom-gray-200 rounded-xl font-medium text-dom-gray-700 hover:bg-dom-cream transition-all"
            >
              Связаться с администратором
            </a>
          </div>
        </div>
      </div>
    </>
  );

  if (embedded) {
    return content;
  }

  return <BookingLayout>{content}</BookingLayout>;
}
