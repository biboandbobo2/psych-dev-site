import type { DisplayStatus } from '../hooks/useTestsFilters';
import { Emoji, EmojiText } from '../../Emoji';

export interface TestListItem {
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

interface TestsListTableProps {
  tests: TestListItem[];
  nextLevelCache: Record<string, string>;
  loading: boolean;
  error: string | null;
  onSelectTest: (testId: string) => void;
  onDeleteTest: (test: { id: string; title: string }) => void;
  onRetry: () => void;
}

const STATUS_STYLES: Record<DisplayStatus, string> = {
  published: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100',
  draft: 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100',
  taken_down: 'bg-amber-50 border-amber-200 hover:bg-amber-100',
};

/**
 * Table component displaying list of tests
 */
export function TestsListTable({
  tests,
  nextLevelCache,
  loading,
  error,
  onSelectTest,
  onDeleteTest,
  onRetry,
}: TestsListTableProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-40 animate-pulse rounded-xl border border-gray-200 bg-gray-100"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
        <p className="font-medium">{error}</p>
        <button
          onClick={onRetry}
          className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          Повторить
        </button>
      </div>
    );
  }

  if (tests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-gray-50 p-10 text-center text-gray-500">
        <Emoji token="🔍" size={32} />
        <p className="text-sm font-medium">
          Ничего не найдено. Измените фильтры.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
      {tests.map((item) => {
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
            onClick={() => onSelectTest(item.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelectTest(item.id);
              }
            }}
            className={`group relative flex cursor-pointer flex-col rounded-2xl border p-5 text-zinc-900 shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${STATUS_STYLES[item.status]}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="h-10 w-10 flex-shrink-0 select-none text-2xl leading-none">
                  {item.emoji ? <EmojiText text={item.emoji} /> : ''}
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
                  onDeleteTest({
                    id: item.id,
                    title: item.title,
                  });
                }}
                className="rounded-md p-1 text-gray-700 transition hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label={`Удалить тест «${item.title}»`}
              >
                <Emoji token="🗑️" size={16} />
              </button>
            </div>
            <div className="mt-4 text-xs text-zinc-600">
              ID: {item.id}
            </div>
          </article>
        );
      })}
    </div>
  );
}
