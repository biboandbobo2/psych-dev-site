import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { BookingLayout } from './BookingLayout';
import { ROOMS } from './types';

const ROOM_PHOTOS: Record<string, string[]> = {
  '3012185': [ // Лазурный
    '/images/rooms/lazurny/1dh0mgoumt.jpg',
    '/images/rooms/lazurny/3tibsptqrg.jpg',
  ],
  '2769648': [ // Бордовый
    '/images/rooms/bordovy/11kukj54bu.jpg',
    '/images/rooms/bordovy/17kq335t2u.jpg',
    '/images/rooms/bordovy/5ed9ne5p11.jpg',
    '/images/rooms/bordovy/7scipb76c0.jpg',
  ],
  '3012126': [ // Изумрудный
    '/images/rooms/izumrudny/6n55tg9djb.jpg',
    '/images/rooms/izumrudny/hfsofebks0.jpg',
  ],
};

export function PhotosPage() {
  const [lightbox, setLightbox] = useState<string | null>(null);

  return (
    <BookingLayout>
      <Helmet>
        <title>Фотографии кабинетов — Психологический центр ДОМ</title>
      </Helmet>

      <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12 py-12">
        <div className="flex items-center justify-between mb-10">
          <h1 className="text-3xl font-bold text-dom-gray-900">Фотографии кабинетов</h1>
          <a href="/booking" className="px-4 py-2 bg-dom-green hover:bg-dom-green-hover text-white rounded-xl text-sm font-medium transition-all">
            Забронировать
          </a>
        </div>

        {ROOMS.map((room) => {
          const photos = ROOM_PHOTOS[room.id] || [];
          return (
            <section key={room.id} className="mb-12">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: room.color }} />
                <h2 className="text-xl font-semibold text-dom-gray-900">{room.name}</h2>
                <span className="text-sm text-dom-gray-500">{room.description}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map((src) => (
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
          );
        })}
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
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
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
