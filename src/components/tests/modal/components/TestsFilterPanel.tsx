import type { DisplayStatus, FilterDraft, SortOption } from '../hooks/useTestsFilters';

interface TestsFilterPanelProps {
  filterDraft: FilterDraft;
  rubricOptions: string[];
  statusCounts: Record<DisplayStatus, number>;
  onUpdateDraft: (draft: FilterDraft) => void;
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
}

const STATUS_LABELS: Record<DisplayStatus, string> = {
  published: 'Опубликованные',
  draft: 'Черновики',
  taken_down: 'Снятые',
};

function IconFunnel({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 5h16l-6.8 8.16a1.5 1.5 0 0 0-.35.96V19l-4 2v-7.88a1.5 1.5 0 0 0-.35-.96L4 5z" />
    </svg>
  );
}

/**
 * Filter panel component for tests
 */
export function TestsFilterPanel({
  filterDraft,
  rubricOptions,
  statusCounts,
  onUpdateDraft,
  onApply,
  onReset,
  onClose,
}: TestsFilterPanelProps) {
  return (
    <div className="fixed inset-0 z-[10000] flex items-end justify-end bg-black/40 px-4 py-6 md:items-stretch md:p-6">
      <div
        className="w-full max-w-lg overflow-hidden rounded-t-3xl bg-white shadow-2xl md:h-full md:max-w-sm md:rounded-3xl"
        role="dialog"
        aria-modal="true"
      >
        <header className="border-b px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Фильтры
          </h3>
        </header>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-4 md:max-h-full">
          <div className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="test-filters-query"
                className="block text-sm font-medium text-gray-700"
              >
                Поиск
              </label>
              <input
                id="test-filters-query"
                type="text"
                value={filterDraft.query}
                onChange={(event) =>
                  onUpdateDraft({
                    ...filterDraft,
                    query: event.target.value,
                  })
                }
                placeholder="Название или ID"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div className="space-y-2">
              <span className="block text-sm font-medium text-gray-700">
                Статус
              </span>
              <div className="space-y-2">
                {(Object.keys(STATUS_LABELS) as DisplayStatus[]).map(
                  (status) => (
                    <label
                      key={status}
                      className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm"
                    >
                      <span className="flex items-center gap-2 text-gray-700">
                        <input
                          type="checkbox"
                          checked={filterDraft.statuses.includes(status)}
                          onChange={(event) => {
                            const nextStatuses = filterDraft.statuses.includes(
                              status
                            )
                              ? filterDraft.statuses.filter(
                                  (value) => value !== status
                                )
                              : [...filterDraft.statuses, status];
                            onUpdateDraft({
                              ...filterDraft,
                              statuses: nextStatuses,
                            });
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        {STATUS_LABELS[status]}
                      </span>
                      <span className="text-xs text-gray-500">
                        {statusCounts[status] ?? 0}
                      </span>
                    </label>
                  )
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="test-filters-rubric"
                className="block text-sm font-medium text-gray-700"
              >
                Рубрика
              </label>
              <select
                id="test-filters-rubric"
                value={filterDraft.rubric}
                onChange={(event) =>
                  onUpdateDraft({
                    ...filterDraft,
                    rubric: event.target.value,
                  })
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="all">Все рубрики</option>
                {rubricOptions.map((rubric) => (
                  <option key={rubric} value={rubric}>
                    {rubric}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <span className="block text-sm font-medium text-gray-700">
                Количество вопросов
              </span>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={0}
                  value={filterDraft.questionMin}
                  onChange={(event) =>
                    onUpdateDraft({
                      ...filterDraft,
                      questionMin: event.target.value,
                    })
                  }
                  placeholder="От"
                  className="w-1/2 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                <input
                  type="number"
                  min={0}
                  value={filterDraft.questionMax}
                  onChange={(event) =>
                    onUpdateDraft({
                      ...filterDraft,
                      questionMax: event.target.value,
                    })
                  }
                  placeholder="До"
                  className="w-1/2 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm">
              <input
                type="checkbox"
                checked={filterDraft.hasNextLevel}
                onChange={(event) =>
                  onUpdateDraft({
                    ...filterDraft,
                    hasNextLevel: event.target.checked,
                  })
                }
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-700">
                Только со следующим уровнем
              </span>
            </label>

            <div className="space-y-2">
              <label
                htmlFor="test-filters-sort"
                className="block text-sm font-medium text-gray-700"
              >
                Сортировка
              </label>
              <select
                id="test-filters-sort"
                value={filterDraft.sort}
                onChange={(event) =>
                  onUpdateDraft({
                    ...filterDraft,
                    sort: event.target.value as SortOption,
                  })
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="updated-desc">
                  По обновлению (новые сверху)
                </option>
                <option value="created-desc">
                  По созданию (новые сверху)
                </option>
                <option value="title-asc">
                  По алфавиту (А-Я)
                </option>
              </select>
            </div>
          </div>
        </div>
        <footer className="flex items-center justify-between gap-3 border-t bg-gray-50 px-6 py-4">
          <button
            onClick={onReset}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Сбросить
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Отмена
            </button>
            <button
              onClick={onApply}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Применить
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

export function FilterButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      <IconFunnel className="h-4 w-4" />
      Фильтры
    </button>
  );
}
