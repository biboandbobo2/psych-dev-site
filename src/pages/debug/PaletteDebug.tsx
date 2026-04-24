import { Helmet } from 'react-helmet-async';

/**
 * Debug-страница палитры. Маппинг на реальные переменные
 * из src/styles/theme.css и примеры пастельных капсул как в шапке сайта.
 */

const tokens: Array<{ label: string; hex: string; className: string; role: string }> = [
  { label: '--bg (surface)', hex: '#FAF7F0', className: 'bg-bg', role: 'основной фон' },
  { label: '--card', hex: '#FFFFFF', className: 'bg-card', role: 'белые карточки' },
  { label: '--card-2', hex: '#FDFBF7', className: 'bg-card2', role: 'светло-кремовый' },
  { label: '--border', hex: '#E7E2DA', className: 'bg-border', role: 'границы' },
  { label: '--fg (ink)', hex: '#111827', className: 'bg-fg', role: 'текст' },
  { label: '--muted', hex: '#6B7280', className: 'bg-muted', role: 'второстепенный текст' },
  { label: '--accent', hex: '#2E7D32', className: 'bg-accent', role: 'зелёный (редко, на primary-кнопке)' },
  { label: '--accent-100', hex: '#E8F5E9', className: 'bg-accent-100', role: 'мятный (капсулы шапки)' },
  { label: '--mark', hex: '#FFF3B0', className: 'bg-mark', role: 'жёлтый highlight (Поиск в шапке)' },
];

export default function PaletteDebug() {
  return (
    <div className="min-h-screen bg-bg p-6 text-fg">
      <Helmet>
        <title>Debug — Palette</title>
      </Helmet>

      <div className="mx-auto max-w-4xl space-y-6">
        <header>
          <h1 className="text-2xl font-bold">🎨 Палитра «DOM Academy» — акварельная</h1>
          <p className="mt-2 text-sm text-muted">
            Основа — кремовый фон + мягкие пастели (мятный, жёлтый).
            Насыщенный зелёный используем редко — только для главных CTA.
            Градиенты не применяем.
          </p>
        </header>

        {/* Как в шапке */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-brand">
          <h2 className="mb-3 text-lg font-semibold">Капсулы как в шапке сайта</h2>
          <p className="mb-4 text-sm text-muted">
            Этот стиль уже используется в <code>AppLayout</code>. Переиспользуем для бейджей,
            ссылок в админке и CTA-разделов.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-xl border border-border bg-mark px-4 py-2 text-sm font-medium text-[#5a4b00]">
              🔎 Поиск
            </span>
            <span className="inline-flex items-center gap-2 rounded-xl border border-border bg-accent-100 px-4 py-2 text-sm font-medium text-[#1F4D22]">
              🤖 AI
            </span>
            <span className="inline-flex items-center gap-2 rounded-xl border border-border bg-accent-100 px-4 py-2 text-sm font-medium text-[#1F4D22]">
              ✏️ Редактор
            </span>
            <span className="inline-flex items-center gap-2 rounded-xl border border-border bg-card2 px-4 py-2 text-sm font-medium text-fg">
              📓 Заметки
            </span>
          </div>
        </section>

        {/* Токены */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-brand">
          <h2 className="mb-4 text-lg font-semibold">Токены</h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {tokens.map((t) => (
              <li
                key={t.label}
                className="flex items-center gap-3 rounded-xl border border-border bg-card2 p-3"
              >
                <div
                  className={`${t.className} h-12 w-12 flex-shrink-0 rounded-lg border border-border`}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-xs text-muted">
                    {t.label} · {t.hex}
                  </div>
                  <div className="text-sm text-fg">{t.role}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Карточки и CTA */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-brand">
          <h2 className="mb-4 text-lg font-semibold">Карточки и CTA</h2>
          <div className="space-y-3">
            <div className="rounded-2xl border border-border bg-card2 p-4">
              <p className="text-xs uppercase tracking-wide text-muted">Секция</p>
              <h3 className="mt-1 text-lg font-semibold text-fg">Обычная карточка</h3>
              <p className="mt-1 text-sm text-muted">
                Фон — <code>bg-card2</code>, рамка — <code>border-border</code>.
              </p>
            </div>

            <div className="rounded-2xl border border-accent/30 bg-accent-100 p-4">
              <p className="text-xs uppercase tracking-wide text-accent">Акцентная подсветка</p>
              <p className="mt-1 text-sm text-fg">
                Мягкий зелёный для важного блока (приглашение, уведомление).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Главная кнопка
              </button>
              <button
                type="button"
                className="rounded-xl border border-border bg-card2 px-5 py-2.5 text-sm font-semibold text-fg transition hover:bg-card"
              >
                Вторая кнопка
              </button>
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-100 px-3 py-1 text-xs font-semibold text-accent">
                🎓 Студент
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card2 px-3 py-1 text-xs font-semibold text-muted">
                👤 Гость
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-dashed border-accent/30 bg-accent-100/30 p-4 text-sm text-fg">
          <p>
            <strong>Задача для Home и Profile:</strong> все <code>#3359CB</code>,
            <code>#1F2F46</code>, <code>bg-blue-*</code>, <code>bg-purple-*</code>,
            градиенты <code>from-blue-* to-purple-*</code> — заменить на <code>bg-accent</code>
            (только primary CTA), <code>bg-accent-100</code>/<code>bg-mark</code>/<code>bg-card2</code>
            (фоны секций), <code>text-fg</code>/<code>text-muted</code> (текст).
          </p>
        </section>
      </div>
    </div>
  );
}
