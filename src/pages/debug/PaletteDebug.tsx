import { Helmet } from 'react-helmet-async';

const swatches: Array<{ token: string; hex: string; role: string; className: string }> = [
  { token: '--bg', hex: '#FAF7F0', role: 'кремово-бежевый фон', className: 'bg-bg' },
  { token: '--fg', hex: '#111827', role: 'основной текст (ink)', className: 'bg-fg' },
  { token: '--muted', hex: '#6B7280', role: 'приглушённый текст', className: 'bg-muted' },
  { token: '--border', hex: '#E7E2DA', role: 'мягкая граница', className: 'bg-border' },
  { token: '--card', hex: '#FFFFFF', role: 'карточки', className: 'bg-card' },
  { token: '--card-2', hex: '#FDFBF7', role: 'светло-кремовый', className: 'bg-card2' },
  { token: '--accent', hex: '#2E7D32', role: 'зелёный акцент', className: 'bg-accent' },
  { token: '--accent-100', hex: '#E8F5E9', role: 'светло-зелёный fill', className: 'bg-accent-100' },
  { token: '--mark', hex: '#FFF3B0', role: 'жёлтый highlight', className: 'bg-mark' },
];

export default function PaletteDebug() {
  return (
    <div className="min-h-screen bg-bg p-6 text-fg">
      <Helmet>
        <title>Debug — Palette</title>
      </Helmet>

      <div className="mx-auto max-w-4xl space-y-6">
        <header>
          <h1 className="text-2xl font-bold">🎨 Палитра «Академия Дом»</h1>
          <p className="mt-1 text-sm text-muted">
            CSS-переменные из <code>src/styles/theme.css</code>. Эта же палитра использует шапка
            <code className="mx-1">AppLayout</code>. Все новые экраны должны опираться на эти
            токены (Tailwind-классы <code>bg-bg</code>, <code>text-accent</code> и т.д.), а не
            на жёсткие hex.
          </p>
        </header>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-brand">
          <h2 className="mb-4 text-lg font-semibold">Токены</h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {swatches.map((s) => (
              <li
                key={s.token}
                className="flex items-center gap-3 rounded-xl border border-border bg-card2 p-3"
              >
                <div
                  className={`${s.className} h-12 w-12 flex-shrink-0 rounded-lg border border-border`}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-xs text-muted">
                    {s.token} · {s.hex}
                  </div>
                  <div className="text-sm text-fg">{s.role}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-brand">
          <h2 className="mb-4 text-lg font-semibold">Примеры компонентов</h2>

          <div className="space-y-3">
            <div className="rounded-2xl border border-border bg-card2 p-4">
              <p className="text-xs uppercase tracking-wide text-muted">Карточка</p>
              <p className="mt-1 text-base text-fg">Обычный текст внутри карточки</p>
            </div>

            <div className="rounded-2xl border border-accent/30 bg-accent-100 p-4">
              <p className="text-xs uppercase tracking-wide text-accent">Акцентный блок</p>
              <p className="mt-1 text-base text-fg">Используем для подсветки важного раздела</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Primary CTA
              </button>
              <button
                type="button"
                className="rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold text-fg transition hover:bg-card2"
              >
                Secondary
              </button>
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-100 px-3 py-1 text-xs font-semibold text-accent">
                🎓 Студент
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-border/60 px-3 py-1 text-xs font-semibold text-muted">
                👤 Гость
              </span>
            </div>

            <blockquote className="bg-accent-100/80 rounded-xl border border-accent/20 p-4 text-sm text-fg">
              Цитата/note использует встроенный стиль <code>blockquote</code> из theme.css —
              светло-зелёный фон с зелёной границей.
            </blockquote>

            <mark className="mark text-sm">Выделение текста через mark / .mark</mark>
          </div>
        </section>

        <section className="rounded-2xl border border-dashed border-accent/40 bg-accent-100/40 p-5 text-sm text-fg">
          <p>
            <strong>Как применять в Home и Profile:</strong> заменить hex-константы
            <code className="mx-1">#3359CB</code>/<code>#1F2F46</code>/<code>blue-*</code>/<code>purple-*</code>
            на Tailwind-классы <code>bg-accent</code>, <code>text-fg</code>,
            <code>border-border</code>, <code>bg-card2</code>.
          </p>
        </section>
      </div>
    </div>
  );
}
