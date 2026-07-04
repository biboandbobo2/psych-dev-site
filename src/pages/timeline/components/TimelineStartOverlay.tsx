interface TimelineStartOverlayProps {
  onStartWithBirth: () => void;
  onOpenBiographyImport: () => void;
  onLoadExample: () => void;
  onDismiss: () => void;
}

/**
 * Стартовый экран пустого холста: три дорожки вместо пугающего белого
 * листа. Панели вокруг остаются кликабельными (оверлей не блокирует).
 */
export function TimelineStartOverlay({
  onStartWithBirth,
  onOpenBiographyImport,
  onLoadExample,
  onDismiss,
}: TimelineStartOverlayProps) {
  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center">
      <div
        className="pointer-events-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-2xl backdrop-blur"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        <h2 className="text-xl font-bold text-slate-900">Линия жизни</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          Холст пока пуст. С чего начнём?
        </p>

        <div className="mt-4 space-y-2.5">
          <button
            type="button"
            onClick={onStartWithBirth}
            className="w-full rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-sky-50 px-4 py-3 text-left transition hover:border-blue-300 hover:from-blue-100 hover:to-sky-100"
          >
            <div className="text-sm font-semibold text-blue-800">👶 Начать с рождения</div>
            <div className="mt-0.5 text-xs text-slate-600">Дата и место — и первая точка уже на линии</div>
          </button>

          <button
            type="button"
            onClick={onOpenBiographyImport}
            className="w-full rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 px-4 py-3 text-left transition hover:border-violet-300 hover:from-violet-100 hover:to-fuchsia-100"
          >
            <div className="text-sm font-semibold text-violet-800">📖 Биография известного человека</div>
            <div className="mt-0.5 text-xs text-slate-600">Ссылка на Википедию — таймлайн соберётся сам</div>
          </button>

          <button
            type="button"
            onClick={onLoadExample}
            className="w-full rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 px-4 py-3 text-left transition hover:border-emerald-300 hover:from-emerald-100 hover:to-teal-100"
          >
            <div className="text-sm font-semibold text-emerald-800">✨ Посмотреть пример</div>
            <div className="mt-0.5 text-xs text-slate-600">Готовая линия жизни с ветками — можно менять и удалять</div>
          </button>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="mt-4 w-full rounded-xl px-3 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
        >
          Начать с чистого листа →
        </button>
      </div>
    </div>
  );
}
