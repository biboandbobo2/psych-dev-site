interface FilterControlsProps {
  canApplyFilters: boolean;
  onApply: () => void;
  onReset: () => void;
  showBulkSelectionMode: boolean;
  isCellSelectionMode: boolean;
  selectedCellsCount: number;
  onToggleBulkMode: () => void;
  onOpenBulkModal: () => void;
  isMobile: boolean;
  isAdmin: boolean;
}

export function FilterControls({
  canApplyFilters,
  onApply,
  onReset,
  showBulkSelectionMode,
  isCellSelectionMode,
  selectedCellsCount,
  onToggleBulkMode,
  onOpenBulkModal,
  isMobile,
  isAdmin,
}: FilterControlsProps) {
  return (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/70 px-2.5 py-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-blue-900">Фильтры</span>
        <button
          type="button"
          onClick={onApply}
          disabled={!canApplyFilters}
          className="inline-flex rounded-lg border border-blue-300 bg-blue-100 px-2.5 py-1.5 text-xs font-medium text-blue-800 transition hover:bg-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Применить фильтр
        </button>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100"
        >
          Сбросить
        </button>
      </div>

      {showBulkSelectionMode && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-2.5 py-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-amber-900">
            Несколько ячеек
          </span>
          <button
            type="button"
            onClick={onToggleBulkMode}
            className={`inline-flex rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
              isCellSelectionMode
                ? 'border-amber-400 bg-white text-amber-900 hover:bg-amber-100'
                : 'border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-200'
            }`}
          >
            {isCellSelectionMode ? 'Режим выбора включен' : 'Выбрать несколько ячеек'}
          </button>
          {isCellSelectionMode && (
            <button
              type="button"
              onClick={onOpenBulkModal}
              disabled={selectedCellsCount === 0}
              className="inline-flex rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Внести текст в выбранные ({selectedCellsCount})
            </button>
          )}
        </div>
      )}

      {isMobile && (
        <p className="mb-1 text-xs text-slate-600">
          Мобильный режим: доступен просмотр таблицы и содержимого ячеек. Редактирование доступно
          на компьютере.
        </p>
      )}
      {isAdmin && (
        <p className="mb-1 text-xs text-slate-600">
          Для преподавателя доступен просмотр и комментирование таблицы студента.
        </p>
      )}
    </>
  );
}
