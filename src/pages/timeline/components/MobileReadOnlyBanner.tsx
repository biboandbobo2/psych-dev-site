import { Link } from 'react-router-dom';

/** Баннер «таймлайн в режиме просмотра» для мобильного viewport. */
export function MobileReadOnlyBanner() {
  return (
    <div className="absolute top-4 left-4 right-4 z-10 sm:hidden">
      <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-sm backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold">Таймлайн в режиме просмотра</p>
            <p className="text-xs text-slate-500">
              Редактирование доступно в веб-версии на компьютере.
            </p>
          </div>
          <Link
            to="/profile"
            className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
          >
            Выход
          </Link>
        </div>
      </div>
    </div>
  );
}
