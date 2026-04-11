const EVENTS = [
  {
    title: 'Летняя Психологическая Школа 2026',
    dates: '22–26 июля',
    location: 'Боржоми, Грузия',
    description: 'Пятая школа DOM посвящена теме сообществ — как люди оказываются вместе и что происходит, когда они объединяются. 5 дней лекций, воркшопов, йоги и вечерних мероприятий.',
    price: 'от 1 890 лари',
    href: 'https://www.notion.so/2026-14c7438bfceb80e694c6c98e8894a16b',
    color: '#4A90D9',
  },
  {
    title: 'Интенсив «Тёплые ключи 2»',
    dates: '31 июля — 2 августа',
    location: 'Тбилиси, центр DOM',
    description: 'Трёхдневный интенсив по групповой психотерапии для психологов и помогающих практиков. Интегративный метод на основе экзистенциально-гуманистического подхода.',
    price: 'от 850 лари',
    href: '/warm_springs2',
    color: '#2E8B57',
  },
];

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
        <div className="grid md:grid-cols-2 gap-6">
          {EVENTS.map((event) => (
            <a
              key={event.title}
              href={event.href}
              target={event.href.startsWith('http') ? '_blank' : undefined}
              rel={event.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="group bg-white rounded-2xl border border-dom-gray-200 shadow-brand p-6 md:p-8 flex flex-col hover:-translate-y-1 hover:shadow-lg transition-all"
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: event.color }}
                />
                <span className="text-sm font-medium text-dom-gray-500">
                  {event.dates} &middot; {event.location}
                </span>
              </div>
              <h3 className="text-xl font-bold text-dom-gray-900 mb-3 group-hover:text-dom-green transition-colors">
                {event.title}
              </h3>
              <p className="text-dom-gray-500 text-sm leading-relaxed flex-1">
                {event.description}
              </p>
              <div className="mt-5 flex items-center justify-between">
                <span className="text-sm font-semibold text-dom-green">{event.price}</span>
                <span className="text-sm text-dom-gray-500 group-hover:text-dom-green transition-colors">
                  Подробнее &rarr;
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
