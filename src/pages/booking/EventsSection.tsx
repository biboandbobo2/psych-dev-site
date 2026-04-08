export function EventsSection() {
  return (
    <section id="events" className="py-16 md:py-20 bg-dom-cream">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-dom-gray-900 leading-tight">
            Мероприятия
          </h2>
          <p className="mt-3 text-dom-gray-500 text-lg">
            Ближайшие события в нашем центре
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-dom-gray-200 shadow-brand p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-dom-cream mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-dom-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </div>
          <p className="text-dom-gray-500 text-lg">
            Скоро здесь появятся анонсы мероприятий
          </p>
        </div>
      </div>
    </section>
  );
}
