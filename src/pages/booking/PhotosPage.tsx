import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { BookingLayout } from './BookingLayout';
import { Link } from 'react-router-dom';
import { ROOMS } from './types';
import { CloseIcon } from './icons';

const ROOM_PHOTOS: Record<string, { description: string; photos: string[] }> = {
  '3012126': {
    description: 'Кабинет для индивидуальных консультаций',
    photos: [
      '/images/rooms/izumrudny/6n55tg9djb.jpg',
      '/images/rooms/izumrudny/hfsofebks0.jpg',
    ],
  },
  '3012185': {
    description: 'Кабинет для индивидуальных и семейных консультаций',
    photos: [
      '/images/rooms/lazurny/1dh0mgoumt.jpg',
      '/images/rooms/lazurny/3tibsptqrg.jpg',
    ],
  },
  '2769648': {
    description: 'Кабинет для индивидуальных консультаций и работы с детьми',
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

export function PhotosPage() {
  const [lightbox, setLightbox] = useState<string | null>(null);

  return (
    <BookingLayout>
      <Helmet>
        <title>Фотографии кабинетов — Психологический центр ДОМ</title>
      </Helmet>

      <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12 py-12">
        <h1 className="text-3xl font-bold text-dom-gray-900 mb-10">Фотографии кабинетов</h1>

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
        <div className="mt-8 mb-4 text-center">
          <p className="text-xl md:text-2xl text-dom-gray-700 leading-relaxed max-w-[700px] mx-auto">
            Также у нас есть просторный зал для мероприятий и мастер-классов.
            Для его аренды свяжитесь с нашим{' '}
            <a
              href="https://t.me/PsyDom_Tbilisi_administrator"
              target="_blank"
              rel="noopener noreferrer"
              className="text-dom-green hover:text-dom-green-hover font-medium underline underline-offset-4 transition-colors"
            >
              администратором
            </a>.
          </p>
        </div>
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
    </BookingLayout>
  );
}
