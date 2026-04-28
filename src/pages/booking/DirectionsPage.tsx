import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { BookingLayout } from './BookingLayout';

interface DirectionsPageProps {
  embedded?: boolean;
}

const ADDRESS_LINES = [
  'Тбилиси, Орбелиани 38 | Мтквари 2',
  'Tbilisi, Orbeliani 38 | Mtkvari 2',
  'თბილისი, ორბელიანი 38 | მტკვარი 2',
];

const MAP_LINK = 'https://maps.app.goo.gl/RPs8p2rAwCkdJP1f9';

const SPACE_PHOTOS = [
  '/images/rooms/izumrudny/6n55tg9djb.jpg',
  '/images/rooms/lazurny/1dh0mgoumt.jpg',
  '/images/rooms/bordovy/11kukj54bu.jpg',
  '/images/warm-springs-2/venue-circle.jpg',
];

export function DirectionsPage({ embedded = false }: DirectionsPageProps) {
  const content = (
    <>
      <Helmet>
        <title>Как добраться — Психологический центр DOM</title>
        <meta
          name="description"
          content="Адрес и маршрут к психологическому центру DOM в Тбилиси: Орбелиани 38, Мтквари 2."
        />
      </Helmet>

      <div className="max-w-[1100px] mx-auto px-4 md:px-8 lg:px-12 py-12">
        <div className="grid lg:grid-cols-[1fr_0.85fr] gap-8 lg:gap-12 items-start">
          <section>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-dom-green mb-3">
              Психологический центр DOM
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-dom-gray-900 leading-tight mb-5">
              Как добраться
            </h1>
            <p className="text-lg text-dom-gray-600 leading-relaxed mb-8">
              Мы находимся в камерном пространстве в центре Тбилиси. Здесь проходят консультации,
              группы, интенсивы и мероприятия DOM.
            </p>

            <div className="rounded-2xl border border-dom-gray-200 bg-dom-cream/60 p-5 md:p-6 mb-6">
              <h2 className="text-lg font-semibold text-dom-gray-900 mb-4">Адрес</h2>
              <div className="space-y-2">
                {ADDRESS_LINES.map((line) => (
                  <p key={line} className="text-dom-gray-800 font-medium">
                    {line}
                  </p>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={MAP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex justify-center px-6 py-3 rounded-xl bg-dom-green hover:bg-dom-green-hover text-white font-medium transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                Открыть маршрут в Google Maps
              </a>
              <Link
                to="/booking/photos"
                className="inline-flex justify-center px-6 py-3 rounded-xl border border-dom-gray-200 text-dom-gray-700 font-medium hover:bg-dom-cream transition-all"
              >
                Посмотреть кабинеты
              </Link>
            </div>
          </section>

          <aside className="rounded-2xl overflow-hidden border border-dom-gray-200 bg-white shadow-brand">
            <img
              src="/images/tbilisi/tbilisi-cityview.jpg"
              alt="Тбилиси"
              className="w-full aspect-[4/3] object-cover"
              loading="lazy"
            />
            <div className="p-5">
              <p className="text-dom-gray-600 leading-relaxed">
                Если вы едете на мероприятие или консультацию впервые, лучше заложить немного
                времени на дорогу по центру города.
              </p>
            </div>
          </aside>
        </div>

        <section className="mt-12">
          <h2 className="text-2xl font-bold text-dom-gray-900 mb-5">Пространство внутри</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {SPACE_PHOTOS.map((src) => (
              <img
                key={src}
                src={src}
                alt="Пространство DOM"
                className="aspect-[4/3] w-full rounded-xl object-cover border border-dom-gray-200"
                loading="lazy"
              />
            ))}
          </div>
        </section>
      </div>
    </>
  );

  if (embedded) {
    return content;
  }

  return <BookingLayout>{content}</BookingLayout>;
}
