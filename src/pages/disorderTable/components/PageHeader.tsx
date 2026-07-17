import { Link } from 'react-router-dom';

interface PageHeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export function PageHeader({ searchQuery, onSearchChange }: PageHeaderProps) {
  return (
    <>
      <div className="mb-2 border-b border-slate-200 pb-2">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Таблица по расстройствам</h1>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <Link
          to="/profile"
          className="inline-flex rounded-lg border border-rose-300 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-800 transition hover:bg-rose-100"
        >
          Выход
        </Link>

        <label className="ml-auto flex min-w-[190px] flex-1 items-center rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 sm:max-w-[360px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            aria-label="Поиск по тексту записей"
            placeholder="Найти запись по тексту"
            className="w-full border-none bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400 sm:text-sm"
          />
        </label>
      </div>
    </>
  );
}

interface GeneralCommentsBarProps {
  generalCommentsCount: number;
  onOpen: () => void;
}

export function GeneralCommentsBar({ generalCommentsCount, onOpen }: GeneralCommentsBarProps) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-2.5 py-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-emerald-900">
        Лектор
      </span>
      <button
        type="button"
        onClick={onOpen}
        className="inline-flex rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 text-xs font-medium text-emerald-900 transition hover:bg-emerald-100"
      >
        Общие комментарии от лектора
        {generalCommentsCount > 0 ? ` (${generalCommentsCount})` : ''}
      </button>
    </div>
  );
}

interface ErrorBannersProps {
  error: string | null;
  listError: string | null;
}

export function ErrorBanners({ error, listError }: ErrorBannersProps) {
  return (
    <div className="mt-2 space-y-1.5">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {listError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {listError}
        </div>
      )}
    </div>
  );
}
