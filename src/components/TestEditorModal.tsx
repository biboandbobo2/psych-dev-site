import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { getAllTests, getTestById, deleteTest } from '../lib/tests';
import type { Test, TestStatus, TestRubric } from '../types/tests';
import { AGE_RANGE_LABELS } from '../types/notes';
import { TestEditorForm } from './TestEditorForm';

interface TestEditorModalProps {
  onClose: () => void;
}

type DisplayStatus = 'published' | 'draft' | 'taken_down';

interface Filters {
  query: string;
  statuses: DisplayStatus[];
  rubric: string | 'all';
  questionMin?: number;
  questionMax?: number;
  hasNextLevel: boolean;
  sort: SortOption;
}

interface FilterDraft {
  query: string;
  statuses: DisplayStatus[];
  rubric: string | 'all';
  questionMin: string;
  questionMax: string;
  hasNextLevel: boolean;
  sort: SortOption;
}

type SortOption = 'updated-desc' | 'created-desc' | 'title-asc';

interface TestListItem {
  id: string;
  title: string;
  emoji?: string;
  rubricLabel: string;
  questionCount: number;
  status: DisplayStatus;
  prerequisiteTestId?: string;
  updatedAt: Date;
  createdAt: Date;
}

interface PendingDelete {
  id: string;
  title: string;
}

interface FeedbackState {
  type: 'success' | 'error';
  message: string;
}

const DEFAULT_FILTERS: Filters = {
  query: '',
  statuses: [],
  rubric: 'all',
  questionMin: undefined,
  questionMax: undefined,
  hasNextLevel: false,
  sort: 'updated-desc',
};

const STATUS_LABELS: Record<DisplayStatus, string> = {
  published: 'Опубликованные',
  draft: 'Черновики',
  taken_down: 'Снятые',
};

const STATUS_STYLES: Record<DisplayStatus, string> = {
  published: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100',
  draft: 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100',
  taken_down: 'bg-amber-50 border-amber-200 hover:bg-amber-100',
};

const QUERY_KEYS = {
  query: 'test_q',
  statuses: 'test_status',
  rubric: 'test_rubric',
  min: 'test_min',
  max: 'test_max',
  hasNext: 'test_next',
  sort: 'test_sort',
};

function toDisplayStatus(status: TestStatus | 'taken_down'): DisplayStatus {
  if (status === 'unpublished' || status === 'taken_down') {
    return 'taken_down';
  }
  if (status === 'draft' || status === 'published') {
    return status;
  }
  return 'draft';
}

function getRubricLabel(rubric: TestRubric): string {
  if (rubric === 'full-course') {
    return 'Весь курс';
  }
  return AGE_RANGE_LABELS[rubric as keyof typeof AGE_RANGE_LABELS] ?? rubric;
}

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

function parseFiltersFromSearch(params: URLSearchParams): Filters {
  const query = params.get(QUERY_KEYS.query) ?? '';
  const statusesParam = params.get(QUERY_KEYS.statuses) ?? '';
  const statuses = statusesParam
    .split(',')
    .map((value) => value.trim())
    .filter((value): value is DisplayStatus =>
      value === 'draft' || value === 'published' || value === 'taken_down'
    );
  const rubric = params.get(QUERY_KEYS.rubric) ?? 'all';
  const min = params.get(QUERY_KEYS.min);
  const max = params.get(QUERY_KEYS.max);
  const hasNext = params.get(QUERY_KEYS.hasNext) === '1';
  const sortParam = params.get(QUERY_KEYS.sort) as SortOption | null;

  return {
    query,
    statuses,
    rubric: rubric || 'all',
    questionMin: min ? Number(min) : undefined,
    questionMax: max ? Number(max) : undefined,
    hasNextLevel: hasNext,
    sort: sortParam ?? 'updated-desc',
  };
}

function filtersToDraft(filters: Filters): FilterDraft {
  return {
    query: filters.query,
    statuses: filters.statuses,
    rubric: filters.rubric,
    questionMin: filters.questionMin?.toString() ?? '',
    questionMax: filters.questionMax?.toString() ?? '',
    hasNextLevel: filters.hasNextLevel,
    sort: filters.sort,
  };
}

function normalizeDraft(draft: FilterDraft): Filters {
  const questionMin =
    draft.questionMin.trim() === '' ? undefined : Number(draft.questionMin);
  const questionMax =
    draft.questionMax.trim() === '' ? undefined : Number(draft.questionMax);

  return {
    query: draft.query.trim(),
    statuses: draft.statuses,
    rubric: draft.rubric,
    questionMin: Number.isFinite(questionMin) ? questionMin : undefined,
    questionMax: Number.isFinite(questionMax) ? questionMax : undefined,
    hasNextLevel: draft.hasNextLevel,
    sort: draft.sort,
  };
}

function updateSearchParamsWithFilters(
  current: URLSearchParams,
  filters: Filters
): URLSearchParams {
  const next = new URLSearchParams(current.toString());

  Object.values(QUERY_KEYS).forEach((key) => {
    next.delete(key);
  });

  if (filters.query) {
    next.set(QUERY_KEYS.query, filters.query);
  }
  if (filters.statuses.length > 0) {
    next.set(QUERY_KEYS.statuses, filters.statuses.join(','));
  }
  if (filters.rubric !== 'all') {
    next.set(QUERY_KEYS.rubric, filters.rubric);
  }
  if (typeof filters.questionMin === 'number') {
    next.set(QUERY_KEYS.min, filters.questionMin.toString());
  }
  if (typeof filters.questionMax === 'number') {
    next.set(QUERY_KEYS.max, filters.questionMax.toString());
  }
  if (filters.hasNextLevel) {
    next.set(QUERY_KEYS.hasNext, '1');
  }
  if (filters.sort !== DEFAULT_FILTERS.sort) {
    next.set(QUERY_KEYS.sort, filters.sort);
  }

  return next;
}

export function TestEditorModal({ onClose }: TestEditorModalProps) {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<Filters>(() =>
    parseFiltersFromSearch(new URLSearchParams(window.location.search))
  );
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterDraft, setFilterDraft] = useState<FilterDraft>(
    filtersToDraft(filters)
  );
  const [nextLevelCache, setNextLevelCache] = useState<Record<string, string>>(
    {}
  );
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteConfirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (filterOpen) {
      setFilterDraft(filtersToDraft(filters));
    }
  }, [filterOpen, filters]);

  useEffect(() => {
    const parsed = parseFiltersFromSearch(searchParams);
    setFilters(parsed);
  }, [searchParams]);

  useEffect(() => {
    loadTests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const allTests = await getAllTests();
      setTests(allTests);
      const cache: Record<string, string> = {};
      allTests.forEach((test) => {
        cache[test.id] = test.title;
      });
      setNextLevelCache(cache);

      const missingPrerequisites = Array.from(
        new Set(
          allTests
            .map((test) => test.prerequisiteTestId)
            .filter(
              (id): id is string =>
                Boolean(id) && !cache[id as string]
            )
        )
      );

      if (missingPrerequisites.length > 0) {
        const fetched = await Promise.all(
          missingPrerequisites.map(async (id) => {
            try {
              const result = await getTestById(id);
              return result ? { id, title: result.title } : { id, title: '' };
            } catch (fetchError) {
              console.error(
                'Ошибка загрузки связанного теста:',
                fetchError
              );
              return { id, title: '' };
            }
          })
        );
        setNextLevelCache((prev) => {
          const next = { ...prev };
          fetched.forEach(({ id, title }) => {
            if (title) {
              next[id] = title;
            }
          });
          return next;
        });
      }
    } catch (err: unknown) {
      console.error('Ошибка загрузки тестов:', err);
      setError('Не удалось загрузить список тестов');
    } finally {
      setLoading(false);
    }
  }, []);

  const testItems: TestListItem[] = useMemo(
    () =>
      tests.map((test) => ({
        id: test.id,
        title: test.title,
        emoji: test.appearance?.introIcon,
        rubricLabel: getRubricLabel(test.rubric),
        questionCount: test.questionCount,
        status: toDisplayStatus(test.status),
        prerequisiteTestId: test.prerequisiteTestId,
        updatedAt: test.updatedAt,
        createdAt: test.createdAt,
      })),
    [tests]
  );

  const statusCounts = useMemo(() => {
    return testItems.reduce(
      (acc, item) => {
        acc[item.status] = (acc[item.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<DisplayStatus, number>
    );
  }, [testItems]);

  const rubricOptions = useMemo(() => {
    const set = new Set<string>();
    testItems.forEach((item) => set.add(item.rubricLabel));
    return Array.from(set).sort();
  }, [testItems]);

  const filteredTests = useMemo(() => {
    const queryLower = filters.query.trim().toLowerCase();
    const statusFilter = new Set(filters.statuses);
    return testItems
      .filter((item) => {
        if (
          queryLower &&
          !item.title.toLowerCase().includes(queryLower) &&
          !item.id.toLowerCase().includes(queryLower)
        ) {
          return false;
        }

        if (statusFilter.size > 0 && !statusFilter.has(item.status)) {
          return false;
        }

        if (
          filters.rubric !== 'all' &&
          item.rubricLabel !== filters.rubric
        ) {
          return false;
        }

        if (
          typeof filters.questionMin === 'number' &&
          item.questionCount < filters.questionMin
        ) {
          return false;
        }

        if (
          typeof filters.questionMax === 'number' &&
          item.questionCount > filters.questionMax
        ) {
          return false;
        }

        if (filters.hasNextLevel && !item.prerequisiteTestId) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        switch (filters.sort) {
          case 'created-desc':
            return b.createdAt.getTime() - a.createdAt.getTime();
          case 'title-asc':
            return a.title.localeCompare(b.title);
          case 'updated-desc':
          default:
            return b.updatedAt.getTime() - a.updatedAt.getTime();
        }
      });
  }, [filters, testItems]);

  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  useEffect(() => {
    if (!pendingDelete) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPendingDelete(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [pendingDelete]);

  useEffect(() => {
    if (pendingDelete && deleteConfirmRef.current) {
      deleteConfirmRef.current.focus();
    }
  }, [pendingDelete]);

  const handleOpenFilters = () => {
    setFilterOpen(true);
  };

  const handleApplyFilters = () => {
    const normalized = normalizeDraft(filterDraft);
    setFilters(normalized);
    const nextParams = updateSearchParamsWithFilters(searchParams, normalized);
    setSearchParams(nextParams, { replace: true });
    setFilterOpen(false);
  };

  const handleResetFilters = () => {
    setFilterDraft(filtersToDraft(DEFAULT_FILTERS));
    setFilters(DEFAULT_FILTERS);
    const nextParams = updateSearchParamsWithFilters(
      searchParams,
      DEFAULT_FILTERS
    );
    setSearchParams(nextParams, { replace: true });
    setFilterOpen(false);
  };

  const handleCreateNew = () => {
    setSelectedTestId('new');
  };

  const handleSelectTest = (testId: string) => {
    setSelectedTestId(testId);
  };

  const handleBackToList = () => {
    setSelectedTestId(null);
    loadTests();
  };

  const handleDelete = async () => {
    if (!pendingDelete || isDeleting) return;
    try {
      setIsDeleting(true);
      await deleteTest(pendingDelete.id);
      setTests((prev) => prev.filter((test) => test.id !== pendingDelete.id));
      setFeedback({
        type: 'success',
        message: `Тест «${pendingDelete.title}» удалён`,
      });
      setPendingDelete(null);
    } catch (err: unknown) {
      console.error('Ошибка удаления теста:', err);
      setFeedback({
        type: 'error',
        message: 'Не удалось удалить тест. Попробуйте ещё раз.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (selectedTestId) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
        <div className="max-h-[90vh] w-full max-w-4xl rounded-lg bg-white shadow-2xl flex flex-col overflow-hidden">
          <header className="flex items-center justify-between border-b bg-white px-6 py-4">
            <h2 className="text-xl font-bold">
              {selectedTestId === 'new'
                ? 'Создать новый тест'
                : 'Редактировать тест'}
            </h2>
            <button
              onClick={handleBackToList}
              className="text-2xl text-gray-400 transition hover:text-gray-600"
              aria-label="Назад к списку"
            >
              ×
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-6">
            <TestEditorForm
              testId={selectedTestId === 'new' ? null : selectedTestId}
              onClose={handleBackToList}
              onSaved={handleBackToList}
              existingTests={tests}
            />
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="relative max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-lg bg-white shadow-2xl">
        <header className="sticky top-0 flex items-center justify-between border-b bg-white px-6 py-4">
          <h2 className="text-xl font-bold">Управление тестами</h2>
          <button
            onClick={onClose}
            className="text-2xl text-gray-400 transition hover:text-gray-600"
            aria-label="Закрыть"
          >
            ×
          </button>
        </header>

        <div className="overflow-y-auto p-6">
          <div className="space-y-6">
            <button
              onClick={handleCreateNew}
              className="w-full rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 px-6 py-4 text-left transition hover:border-blue-400 hover:bg-blue-100"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">➕</span>
                <div>
                  <h3 className="text-lg font-bold text-blue-700">
                    Создать новый тест
                  </h3>
                  <p className="text-sm text-blue-600">
                    Создайте тест для курса или возрастного периода
                  </p>
                </div>
              </div>
            </button>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-medium text-gray-700 sr-only">
                Список тестов
              </h3>
              <button
                onClick={handleOpenFilters}
                className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <IconFunnel className="h-4 w-4" />
                Фильтры
              </button>
            </div>

            {feedback && (
              <div
                className={`rounded-md border px-4 py-3 text-sm ${
                  feedback.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                {feedback.message}
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-40 animate-pulse rounded-xl border border-gray-200 bg-gray-100"
                  />
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
                <p className="font-medium">{error}</p>
                <button
                  onClick={loadTests}
                  className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  Повторить
                </button>
              </div>
            ) : filteredTests.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-gray-50 p-10 text-center text-gray-500">
                <span className="text-4xl mb-3">🔍</span>
                <p className="text-sm font-medium">
                  Ничего не найдено. Измените фильтры.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                {filteredTests.map((item) => {
                  const nextTitle =
                    item.prerequisiteTestId &&
                    nextLevelCache[item.prerequisiteTestId]
                      ? nextLevelCache[item.prerequisiteTestId]
                      : item.prerequisiteTestId
                      ? '—'
                      : '—';

                  return (
                    <article
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectTest(item.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleSelectTest(item.id);
                        }
                      }}
                      className={`group relative flex cursor-pointer flex-col rounded-2xl border p-5 text-zinc-900 shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${STATUS_STYLES[item.status]}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="h-10 w-10 flex-shrink-0 select-none text-2xl leading-none">
                            {item.emoji ?? ''}
                          </div>
                          <div className="min-w-0 space-y-2">
                            <h4
                              className="font-semibold leading-tight line-clamp-2"
                              title={item.title}
                            >
                              {item.title}
                            </h4>
                            <div className="text-sm text-zinc-700">
                              <div>Рубрика: {item.rubricLabel}</div>
                              <div>Вопросов: {item.questionCount}</div>
                            </div>
                            <div className="text-sm text-zinc-700">
                              Следующий уровень после:{' '}
                              <span
                                className="inline-block max-w-[220px] truncate align-bottom"
                                title={nextTitle !== '—' ? nextTitle : undefined}
                              >
                                {nextTitle}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setPendingDelete({
                              id: item.id,
                              title: item.title,
                            });
                          }}
                          className="rounded-md p-1 text-gray-700 transition hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                          aria-label={`Удалить тест «${item.title}»`}
                        >
                          <span aria-hidden className="text-lg leading-none">
                            🗑️
                          </span>
                        </button>
                      </div>
                      <div className="mt-4 text-xs text-zinc-600">
                        ID: {item.id}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <footer className="sticky bottom-0 border-t bg-gray-50 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-md bg-gray-600 px-4 py-2 text-white transition hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
          >
            Закрыть
          </button>
        </footer>
      </div>

      {filterOpen && (
        <div className="fixed inset-0 z-[10000] flex items-end justify-end bg-black/40 px-4 py-6 md:items-stretch md:p-6">
          <div
            className={`w-full max-w-lg overflow-hidden rounded-t-3xl bg-white shadow-2xl md:h-full md:max-w-sm md:rounded-3xl`}
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
                      setFilterDraft((prev) => ({
                        ...prev,
                        query: event.target.value,
                      }))
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
                                setFilterDraft((prev) => {
                                  const nextStatuses = prev.statuses.includes(
                                    status
                                  )
                                    ? prev.statuses.filter(
                                        (value) => value !== status
                                      )
                                    : [...prev.statuses, status];
                                  return {
                                    ...prev,
                                    statuses: nextStatuses,
                                  };
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
                      setFilterDraft((prev) => ({
                        ...prev,
                        rubric: event.target.value,
                      }))
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
                        setFilterDraft((prev) => ({
                          ...prev,
                          questionMin: event.target.value,
                        }))
                      }
                      placeholder="От"
                      className="w-1/2 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                    <input
                      type="number"
                      min={0}
                      value={filterDraft.questionMax}
                      onChange={(event) =>
                        setFilterDraft((prev) => ({
                          ...prev,
                          questionMax: event.target.value,
                        }))
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
                      setFilterDraft((prev) => ({
                        ...prev,
                        hasNextLevel: event.target.checked,
                      }))
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
                      setFilterDraft((prev) => ({
                        ...prev,
                        sort: event.target.value as SortOption,
                      }))
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
                onClick={handleResetFilters}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Сбросить
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterOpen(false)}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Отмена
                </button>
                <button
                  onClick={handleApplyFilters}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Применить
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}

      {pendingDelete && (
        <div className="fixed inset-0 z-[10010] flex items-center justify-center bg-black/40 px-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h4 className="text-lg font-semibold text-gray-900">
              Удалить тест «{pendingDelete.title}»?
            </h4>
            <p className="mt-2 text-sm text-gray-600">
              Действие необратимо. Тест и его вопросы будут удалены.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setPendingDelete(null)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Отмена
              </button>
              <button
                ref={deleteConfirmRef}
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-70 disabled:hover:bg-red-600"
              >
                {isDeleting ? 'Удаление…' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
