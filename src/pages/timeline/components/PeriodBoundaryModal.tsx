import type { Periodization, Period } from '../types';

interface PeriodBoundaryModalProps {
  periodization: Periodization;
  periodBefore: Period;
  periodAfter: Period;
  age: number; // Возраст границы
  onClose: () => void;
}

/**
 * Модальное окно с информацией о границе между периодами
 * Показывается при клике на линию между периодами
 */
export function PeriodBoundaryModal({
  periodization,
  periodBefore,
  periodAfter,
  age,
  onClose,
}: PeriodBoundaryModalProps) {
  const linkUrl =
    periodization.getMoreInfoUrl?.({ periodBefore, periodAfter, age }) ?? periodization.wikiUrl ?? null;
  const linkLabel =
    periodization.moreInfoLabel ??
    (periodization.getMoreInfoUrl ? '📖 Перейти к разделу курса' : '📖 Подробнее в Wikipedia');

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Заголовок */}
        <div className="mb-4">
          <h3 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Georgia, serif' }}>
            {periodization.name}
          </h3>
          <p className="mt-1 text-sm text-slate-500">{periodization.author}</p>
        </div>

        {/* Возраст перехода */}
        <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3">
          <div className="text-center">
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Переход в возрасте
            </div>
            <div className="mt-1 text-2xl font-bold text-emerald-700">
              {age} {age === 1 ? 'год' : age < 5 ? 'года' : 'лет'}
            </div>
          </div>
        </div>

        {/* Информация о периодах */}
        <div className="space-y-3">
          {/* Период "до" */}
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                До перехода
              </div>
              <div className="text-xs text-slate-400">
                {periodBefore.startAge}–{periodBefore.endAge} лет
              </div>
            </div>
            <div className="mb-1 font-semibold text-slate-900" style={{ fontFamily: 'Georgia, serif' }}>
              {periodBefore.name}
            </div>
            <div className="text-sm text-slate-600">{periodBefore.description}</div>
          </div>

          {/* Стрелка вниз */}
          <div className="flex justify-center">
            <svg className="h-6 w-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>

          {/* Период "после" */}
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                После перехода
              </div>
              <div className="text-xs text-slate-400">
                {periodAfter.startAge}–{periodAfter.endAge} лет
              </div>
            </div>
            <div className="mb-1 font-semibold text-slate-900" style={{ fontFamily: 'Georgia, serif' }}>
              {periodAfter.name}
            </div>
            <div className="text-sm text-slate-600">{periodAfter.description}</div>
          </div>
        </div>

        {/* Критерий периодизации */}
        <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Критерий деления
          </div>
          <div className="text-sm text-slate-700">{periodization.criterion}</div>
        </div>

        {/* Примечание о гибких границах */}
        {periodization.flexibleBoundaries && periodization.boundaryNote && (
          <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-amber-700">
              ⚠️ О границах
            </div>
            <div className="text-sm text-amber-900">{periodization.boundaryNote}</div>
          </div>
        )}

        {/* Кнопки */}
        <div className="mt-6 flex gap-3">
          {linkUrl && (
            <a
              href={linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              {linkLabel}
            </a>
          )}
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-6 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Закрыть
          </button>
        </div>

        {/* Кнопка закрытия (крестик) */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          title="Закрыть"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
