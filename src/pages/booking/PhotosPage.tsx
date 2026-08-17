import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { BookingLayout } from './BookingLayout';
import { Link } from 'react-router-dom';
import { ROOMS } from './types';
import { CloseIcon } from './icons';

interface PhotosPageProps {
  embedded?: boolean;
}

const ROOM_PHOTOS: Record<string, { description: string; photos: string[] }> = {
  '3012126': {
    description: 'Кабинет для индивидуальных консультаций — терапевт и клиент. Есть выход на балкон.',
    photos: [
      '/images/rooms/izumrudny/6n55tg9djb.jpg',
      '/images/rooms/izumrudny/hfsofebks0.jpg',
    ],
  },
  '3012185': {
    description:
      'Для индивидуальных консультаций, пар, семей, детей и групп до 12 человек. По договорённости можно хранить в кабинете реквизит для групповой работы.',
    photos: [
      '/images/rooms/lazurny/1dh0mgoumt.jpg',
      '/images/rooms/lazurny/3tibsptqrg.jpg',
    ],
  },
  '2769648': {
    description:
      'Для индивидуальных консультаций, пар, семей, детей и групп до 12 человек. Есть детский уголок и диван.',
    photos: [
      '/images/rooms/bordovy/11kukj54bu.jpg',
      '/images/rooms/bordovy/17kq335t2u.jpg',
      '/images/rooms/bordovy/5ed9ne5p11.jpg',
      '/images/rooms/bordovy/7scipb76c0.jpg',
    ],
  },
};

const ROOMS_WITH_PHOTOS = ROOMS.map((room) => ({
  ...room,
  ...(ROOM_PHOTOS[room.id] || { description: room.description, photos: [] }),
}));

export function PhotosPage({ embedded = false }: PhotosPageProps) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  const content = (
    <>
      <Helmet>
        <title>Бронирование кабинетов — Психологический центр DOM</title>
      </Helmet>

      <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12 py-12">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-bold text-dom-gray-900 mb-2">Фотографии кабинетов</h1>
            <p className="text-dom-gray-500">
              DOM находится по адресу Орбелиани 38 | Мтквари 2.
            </p>
          </div>
          <Link
            to="/booking/directions"
            className="inline-flex justify-center px-5 py-3 rounded-xl border border-dom-gray-200 text-dom-gray-700 font-medium hover:bg-dom-cream transition-all"
          >
            Как добраться
          </Link>
        </div>

        {ROOMS_WITH_PHOTOS.map((room) => (
          <section key={room.id} className="mb-14">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: room.color }} />
              <Link
                to={`/booking?room=${room.id}`}
                className="text-xl font-semibold text-dom-gray-900 hover:text-dom-green transition-colors"
              >
                {room.name}
              </Link>
            </div>
            <p className="text-dom-gray-500 text-sm mb-5 ml-7">{room.description}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {room.photos.map((src) => (
                <button
                  key={src}
                  onClick={() => setLightbox(src)}
                  className="aspect-[4/3] rounded-xl overflow-hidden border border-dom-gray-200 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
                >
                  <img src={src} alt={room.name} className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </section>
        ))}

        {/* Зал для мероприятий */}
        <section className="mt-8 mb-4">
          <h2 className="text-2xl font-bold text-dom-gray-900 mb-3 text-center">Зал для мероприятий</h2>
          <p className="text-dom-gray-700 leading-relaxed max-w-[700px] mx-auto text-center">
            Просторный зал для лекций, групп, практикумов и мастер-классов — вмещает до 30 человек.
            Аренда — от 45 gel за час, при бронировании от 3 часов — дешевле. Проектор, микрофон
            и колонки — +30 gel. Зал бронируется через администратора.
          </p>
          <div className="text-center mt-6">
            <a
              href="https://t.me/PsyDom_Tbilisi_administrator"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-dom-green hover:bg-dom-green-hover text-white rounded-xl font-medium transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              Написать администратору
            </a>
          </div>
        </section>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors"
          >
            <CloseIcon className="w-8 h-8" />
          </button>
          <img
            src={lightbox}
            alt=""
            className="max-w-full max-h-[90vh] rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );

  if (embedded) {
    return content;
  }

  return <BookingLayout>{content}</BookingLayout>;
}
