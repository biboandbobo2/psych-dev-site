import type {
  SearchResult,
  ContentSearchResult,
  TestSearchResult,
  CourseType,
  ContentMatchField,
} from '../types';

interface ContentSearchResultsProps {
  results: SearchResult[];
  query: string;
  onResultClick: (path: string) => void;
}

const COURSE_LABELS: Record<CourseType, { label: string; color: string; icon: string }> = {
  development: {
    label: 'Психология развития',
    color: 'bg-blue-100 text-blue-800',
    icon: '👶',
  },
  clinical: {
    label: 'Клиническая психология',
    color: 'bg-purple-100 text-purple-800',
    icon: '🧠',
  },
  general: {
    label: 'Общая психология',
    color: 'bg-green-100 text-green-800',
    icon: '📚',
  },
};

const CONTENT_MATCH_LABELS: Record<ContentMatchField, string> = {
  title: 'заголовок',
  subtitle: 'подзаголовок',
  concepts: 'понятия',
  authors: 'авторы',
  literature: 'литература',
  videos: 'видео',
  leisure: 'досуг',
};

function getContentPath(result: ContentSearchResult): string {
  switch (result.course) {
    case 'development':
      return `/${result.period}`;
    case 'clinical':
      return `/clinical/${result.period}`;
    case 'general':
      return `/general/${result.period}`;
  }
}

function getTestPath(result: TestSearchResult): string {
  return `/tests/dynamic/${result.testId}`;
}

export function ContentSearchResults({
  results,
  query,
  onResultClick,
}: ContentSearchResultsProps) {
  // Разделяем результаты на контент и тесты
  const contentResults = results.filter((r): r is ContentSearchResult => r.type === 'content');
  const testResults = results.filter((r): r is TestSearchResult => r.type === 'test');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted">
          Найдено: <span className="font-medium text-fg">{results.length}</span>
        </span>
      </div>

      <div className="max-h-[calc(100vh-280px)] overflow-y-auto pr-1 space-y-4">
        {/* Результаты по контенту */}
        {contentResults.length > 0 && (
          <ul className="space-y-2">
            {contentResults.map((result) => (
              <ContentResultItem
                key={result.id}
                result={result}
                query={query}
                onResultClick={onResultClick}
              />
            ))}
          </ul>
        )}

        {/* Результаты по тестам */}
        {testResults.length > 0 && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted mb-2 uppercase tracking-wide">Тесты</p>
            <div className="flex flex-wrap gap-2">
              {testResults.map((result) => (
                <TestResultItem
                  key={result.id}
                  result={result}
                  onResultClick={onResultClick}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface ContentResultItemProps {
  result: ContentSearchResult;
  query: string;
  onResultClick: (path: string) => void;
}

function ContentResultItem({ result, query, onResultClick }: ContentResultItemProps) {
  const courseInfo = COURSE_LABELS[result.course];
  const path = getContentPath(result);

  return (
    <li>
      <button
        onClick={() => onResultClick(path)}
        className="w-full text-left rounded-lg border border-border bg-card p-4 hover:border-accent/40 hover:shadow-sm transition-all group"
      >
        <div className="flex items-start gap-3">
          <span className="text-xl" aria-hidden>
            {courseInfo.icon}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${courseInfo.color}`}
              >
                {courseInfo.label}
              </span>
            </div>
            <h3 className="font-medium text-fg group-hover:text-accent transition-colors line-clamp-1">
              {highlightMatch(result.title, query)}
            </h3>
            {result.subtitle && (
              <p className="text-sm text-muted mt-0.5 line-clamp-1">
                {highlightMatch(result.subtitle, query)}
              </p>
            )}
            <p className="text-xs text-muted mt-2">
              Найдено в:{' '}
              {result.matchedIn.map((field) => CONTENT_MATCH_LABELS[field]).join(', ')}
            </p>
          </div>
          <ChevronIcon />
        </div>
      </button>
    </li>
  );
}

interface TestResultItemProps {
  result: TestSearchResult;
  onResultClick: (path: string) => void;
}

function TestResultItem({ result, onResultClick }: TestResultItemProps) {
  const path = getTestPath(result);
  const icon = result.icon || '📝';

  return (
    <button
      onClick={() => onResultClick(path)}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card hover:border-accent/40 hover:shadow-sm transition-all text-sm"
      title={result.title}
    >
      <span className="text-lg" aria-hidden>
        {icon}
      </span>
      <span className="text-fg font-medium truncate max-w-[180px]">
        {result.title}
      </span>
    </button>
  );
}

function ChevronIcon() {
  return (
    <svg
      className="w-5 h-5 text-muted group-hover:text-accent transition-colors flex-shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5l7 7-7 7"
      />
    </svg>
  );
}

/**
 * Подсвечивает совпадения в тексте
 */
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;

  const words = query.trim().toLowerCase().split(/\s+/);
  const regex = new RegExp(`(${words.map(escapeRegExp).join('|')})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, index) => {
    const isMatch = words.some((word) => part.toLowerCase() === word);
    if (isMatch) {
      return (
        <mark key={index} className="bg-yellow-200 text-yellow-900 rounded px-0.5">
          {part}
        </mark>
      );
    }
    return part;
  });
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
