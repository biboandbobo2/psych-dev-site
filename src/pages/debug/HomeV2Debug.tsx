import { Helmet } from 'react-helmet-async';

/**
 * Макет переработки /home. Правила:
 *  - Палитра строго из шапки: bg-bg, bg-card, bg-card2, bg-accent-100, bg-mark.
 *  - Насыщенный bg-accent НЕ используем (слишком ярко).
 *  - Градиентов нет.
 *  - Каталог — общая подложка с квадратными карточками одинаковой высоты.
 *  - Кнопка «Кабинет объявлений» НЕ здесь (поедет в шапку AppLayout).
 *
 * Данные — заглушки.
 */

const courses = [
  { id: 'development', icon: '👶', name: 'Психология развития', lesson: 'Пренатальный период', resume: 'Продолжим с 50:21', percent: 0, total: 14, done: 0 },
  { id: 'clinical', icon: '🧠', name: 'Основы патопсихологии', lesson: 'Введение', resume: 'Продолжим с последнего урока', percent: 0, total: 11, done: 0 },
];

const assignments = [
  { id: 'a1', course: 'Патпсихология', title: 'Таблица', body: 'Заполнить таблицу по итогу прослушанных лекций', due: '24.10' },
  { id: 'a2', course: 'Инд. консультирование', title: 'Наблюдение', body: 'Выбрать фокус, наблюдать месяц и вести дневник', due: '24.10' },
];

const events = [
  { id: 'e1', title: 'Супервизия', dateLabel: '10.11 — 11.11', time: '11:00 – 19:00', host: 'Леша Зыков' },
  { id: 'e2', title: 'Мышление и речь', dateLabel: '10.11', time: '19:00 – 22:00', host: 'Леша Зыков', course: 'Общая психология' },
];

const calendarDays = [
  { n: 7, d: 'пн', has: false },
  { n: 8, d: 'вт', has: false, today: true },
  { n: 9, d: 'ср', has: false },
  { n: 10, d: 'чт', has: true },
  { n: 11, d: 'пт', has: true },
  { n: 12, d: 'сб', has: true },
  { n: 13, d: 'вс', has: false },
];

const catalog = [
  { id: 'c1', icon: '🎓', name: 'Введение в основы клинической психологии', note: 'Дополнительный курс' },
  { id: 'c2', icon: '👥', name: 'Групповая психотерапия', note: 'Дополнительный курс' },
  { id: 'c3', icon: '❤️', name: 'Лекции от АНО ДПО Экзистенциально-гуманистическое образование', note: 'Дополнительный курс' },
  { id: 'c4', icon: '📚', name: 'Общая психология', note: 'Основной курс' },
  { id: 'c5', icon: '🌿', name: 'Интенсив «Тёплые ключи»', note: 'Выезд · 3 дня' },
  { id: 'c6', icon: '🧩', name: 'Когнитивно-поведенческая терапия', note: 'Дополнительный курс' },
];

export default function HomeV2Debug() {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <Helmet>
        <title>Debug — Home v2</title>
      </Helmet>

      <div className="mx-auto max-w-6xl px-4 py-6 space-y-6 sm:py-8">
        {/* Hero */}
        <header>
          <p className="text-sm text-muted">Добрый день, Алексей</p>
          <h1 className="mt-1 text-3xl font-bold text-fg sm:text-4xl">Мои курсы</h1>
        </header>

        {/* 2 колонки: курсы+задания | календарь+события */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          {/* LEFT */}
          <div className="space-y-6">
            {/* Карточки курсов */}
            <div className="space-y-4">
              {courses.map((c) => (
                <article
                  key={c.id}
                  className="overflow-hidden rounded-2xl border border-border bg-card shadow-brand"
                >
                  <div className="grid grid-cols-[104px_minmax(0,1fr)] sm:grid-cols-[200px_minmax(0,1fr)]">
                    <div className="flex items-center justify-center bg-[#CFEAD0] p-4">
                      <span className="text-[44px] sm:text-[64px]" aria-hidden>{c.icon}</span>
                    </div>
                    <div className="flex min-w-0 flex-col gap-3 p-5">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                          Курс потока
                        </p>
                        <h2 className="mt-1 break-words text-xl font-bold leading-tight text-fg sm:text-3xl">{c.name}</h2>
                        <p className="mt-2 text-sm text-muted">Лекция: {c.lesson}</p>
                        <p className="mt-1 text-xs font-semibold text-accent">{c.resume}</p>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-xl border border-accent/30 bg-accent-100 px-5 py-2.5 text-sm font-semibold text-accent transition hover:bg-accent-100/70"
                        >
                          ▶ Продолжить
                        </button>
                        <div className="rounded-xl border border-border bg-card2 px-3 py-2 text-right">
                          <p className="text-lg font-bold leading-none text-fg">{c.percent}%</p>
                          <p className="mt-1 text-[11px] text-muted">{c.done}/{c.total} занятий</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Задания — в общей подложке */}
            <section className="rounded-2xl border border-border bg-card p-5 shadow-brand">
              <h3 className="mb-3 text-xl font-bold text-fg">Задания</h3>
              {assignments.length === 0 ? (
                <p className="text-sm text-muted">Пока нет заданий.</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {assignments.map((a) => (
                    <article key={a.id} className="rounded-xl border border-border bg-card2 p-4">
                      <p className="text-sm font-semibold text-fg">{a.course}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-wide text-muted">{a.title}</p>
                      <p className="mt-2 text-sm text-muted">{a.body}</p>
                      <p className="mt-3 text-xs">
                        <span className="inline-flex items-center gap-1 rounded-md bg-mark px-2 py-0.5 font-semibold text-[#5a4b00]">
                          Дедлайн: {a.due}
                        </span>
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* RIGHT (sticky) */}
          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            {/* Календарь */}
            <section className="rounded-2xl border border-border bg-card p-4 shadow-brand">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-bold text-fg">Календарь</h3>
                <span className="text-xs text-muted">Неделя ▾</span>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {calendarDays.map((d) => (
                  <div key={d.n} className="py-1">
                    <div className="text-[10px] uppercase text-muted">{d.d}</div>
                    <div
                      className={`mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                        d.today ? 'bg-mark font-bold text-[#5a4b00]' : 'text-fg'
                      }`}
                    >
                      {d.n}
                    </div>
                    <div className={`mx-auto mt-1 h-1.5 w-1.5 rounded-full ${d.has ? 'bg-accent' : 'bg-transparent'}`} />
                  </div>
                ))}
              </div>
            </section>

            {/* Ближайшие события */}
            <section className="rounded-2xl border border-border bg-card p-4 shadow-brand">
              <h3 className="mb-3 text-lg font-bold text-fg">Ближайшие события</h3>
              <ul className="space-y-3">
                {events.map((e) => (
                  <li key={e.id} className="rounded-xl border border-border bg-card2 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-fg">{e.title}</p>
                        <p className="mt-1 text-xs text-muted">
                          {e.host}{e.course ? ` · ${e.course}` : ''}
                        </p>
                        <p className="mt-1 text-xs text-muted">{e.time}</p>
                      </div>
                      <span className="whitespace-nowrap rounded-md bg-mark px-2 py-1 text-[11px] font-semibold text-[#5a4b00]">
                        {e.dateLabel}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {/* Объявления группы */}
            <section className="rounded-2xl border border-border bg-accent-100/60 p-4">
              <h3 className="mb-1 text-sm font-bold text-fg">Объявления моей группы</h3>
              <p className="text-xs text-muted">На этой неделе нет новых.</p>
            </section>
          </aside>
        </div>

        {/* Каталог — общая подложка + квадраты */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-brand">
          <h3 className="mb-4 text-xl font-bold text-fg">Каталог платформы</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {catalog.map((c) => (
              <article
                key={c.id}
                className="flex aspect-square flex-col justify-between rounded-xl border border-border bg-card2 p-4 transition hover:bg-card"
              >
                <span className="text-3xl" aria-hidden>{c.icon}</span>
                <div>
                  <h4 className="text-sm font-semibold leading-tight text-fg">{c.name}</h4>
                  <p className="mt-1 text-xs text-muted">{c.note}</p>
                </div>
                <button
                  type="button"
                  className="self-start rounded-md text-xs font-semibold text-accent transition hover:underline"
                >
                  Посмотреть →
                </button>
              </article>
            ))}
          </div>
        </section>

        {/* Возможности платформы */}
        <a
          href="/features"
          className="block rounded-2xl border border-border bg-mark/60 p-5 transition hover:bg-mark"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl" aria-hidden>💡</span>
              <div>
                <h3 className="text-lg font-bold text-[#5a4b00]">Возможности платформы</h3>
                <p className="hidden text-sm text-[#5a4b00]/75 sm:block">
                  Тесты, заметки, таймлайн, научный поиск
                </p>
              </div>
            </div>
            <span className="text-xl text-[#5a4b00]">→</span>
          </div>
        </a>
      </div>
    </div>
  );
}
